# Bin Collection Website

A Node.js and Express web application that lets residents look up bin collection dates for their address and opt in to email reminders. Collection data is fetched from the Wiltshire Council API, parsed, and stored in MongoDB. Reminders are sent automatically on collection day via a scheduled cron job.

## Features

- User accounts with signup, login, and session-based authentication
- Password reset via email
- Look up bin collection dates by address/UPRN
- Store and manage addresses linked to a user account
- Email reminders sent on collection day (configurable cron schedule)
- GOV.UK Frontend styling
- Docker Compose setup with MongoDB replica set (separate dev and production configs)

## Tech Stack

| Layer        | Technology                                              |
| ------------ | ------------------------------------------------------- |
| Runtime      | Node.js 20, Express 5                                   |
| Database     | MongoDB 7 (replica set), Mongoose                       |
| Auth         | bcryptjs (passwords), express-session, connect-mongo    |
| Security     | Helmet, csrf-sync, express-rate-limit                   |
| Templating   | EJS, ejs-mate                                           |
| Styling      | GOV.UK Frontend, Sass                                   |
| Email        | Nodemailer (Gmail)                                      |
| Scheduling   | node-cron                                               |
| HTTP client  | Axios                                                   |
| Logging      | morgan, debug                                           |
| Dev tooling  | Nodemon, Docker Compose, ESLint, Prettier               |

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- Docker and Docker Compose (recommended), **or** a local MongoDB 7 instance with a replica set

### Running with Docker (recommended)

The project uses two Docker Compose files:

- `docker-compose.yml` — base config (used in both dev and production)
- `docker-compose.dev.yml` — dev overrides (mounts source, runs nodemon, exposes Mongo port)

#### Development

1. Copy `.env.example` to `.env` and fill in the values (see [Environment Variables](#environment-variables) below).

2. Build and start the app:

    ```bash
    npm run app:build
    ```

3. On first run, initialise the MongoDB replica set:

    ```bash
    npm run mongo:init
    ```

The app will be available at `http://localhost:<HOST_PORT>`.

#### Production

1. Copy `.env.example` to `.env` and fill in all values, including `MONGO_ROOT_USER` and `MONGO_ROOT_PASSWORD`.

2. Build and start using only the base compose file:

    ```bash
    docker compose up --build -d
    ```

3. On first run, initialise the replica set:

    ```bash
    npm run mongo:init
    ```

See `DEPLOY.md` for a full production deployment guide including nginx and SSL setup.

### Running without Docker

1. Ensure MongoDB is running locally with a replica set (`rs0`).

2. Install dependencies:

    ```bash
    npm install
    ```

3. Copy `.env.example` to `.env` and fill in the values.

4. Start the development server:

    ```bash
    npm run dev
    ```

5. In a separate terminal, watch and compile Sass:

    ```bash
    npm run sass
    ```

## Environment Variables

Create a `.env` file in the project root using `.env.example` as a starting point.

| Variable             | Description                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------ |
| `NODE_ENV`           | `development` or `production`                                                                    |
| `PORT`               | Port the Express app listens on                                                                  |
| `HOST_PORT`          | Host port mapped to the app container (Docker only)                                              |
| `SESSION_SECRET`     | Secret used to sign the session cookie (use a long random string)                                |
| `COOKIE_DOMAIN`      | Optional domain for the session cookie; leave blank for a host-only cookie                       |
| `MONGO_HOST_PORT`    | Host port mapped to MongoDB container (Docker dev only, do not expose in prod)                   |
| `MONGO_URL`          | MongoDB connection string (defaults to `mongodb://localhost:27017/bincollection?replicaSet=rs0`) |
| `MONGO_ROOT_USER`    | MongoDB admin username (production only)                                                         |
| `MONGO_ROOT_PASSWORD`| MongoDB admin password (production only)                                                         |
| `GMAIL_USER`         | Gmail address used to send reminder emails                                                       |
| `GMAIL_APP_PASSWORD` | Gmail [App Password](https://support.google.com/accounts/answer/185833) for Nodemailer           |
| `BIN_REMINDER_CRON`  | Cron expression for the daily reminder job (defaults to `0 8 * * *` — 8 AM every day)            |
| `BIN_COLLECTION_API` | Wiltshire Council bin collection API endpoint                                                    |
| `ADDRESS_LIST_API`   | Wiltshire Council address lookup API endpoint                                                    |

## Available Scripts

| Script               | Description                                                          |
| -------------------- | -------------------------------------------------------------------- |
| `npm start`          | Start the app with Node (production)                                 |
| `npm run dev`        | Start the app with nodemon and full debug logging (`DEBUG=*`)        |
| `npm run sass`       | Watch and compile Sass to CSS                                        |
| `npm run mongo:init` | Initialise the MongoDB replica set inside the Docker container       |
| `npm run app:build`  | Build and start the dev Docker Compose stack (base + dev overrides)  |
| `npm test`           | Run Jest tests                                                       |
| `npm run lint`       | Run ESLint                                                           |
| `npm run lint:fix`   | Run ESLint with auto-fix                                             |
| `npm run format`     | Format all files with Prettier                                       |

## Project Structure

```
├── app.js                  # App entry point
├── Dockerfile.prod         # Production Docker image
├── docker-compose.yml      # Base Docker Compose config (dev + prod)
├── docker-compose.dev.yml  # Dev overrides (nodemon, volume mounts, exposed Mongo port)
├── nginx/
│   └── bin-collection.conf # Nginx reverse proxy config
├── controllers/            # Route handler logic
├── middleware/
│   ├── auth.js             # Session-based auth (loadUser, requireAuth)
│   └── csrf.js             # CSRF token middleware (csrf-sync)
├── models/                 # Mongoose schemas (Address, BinCollectionDates, User)
├── routes/                 # Express routers
├── services/
│   ├── binCollectionDatesService.js   # Fetches and parses dates from the Wiltshire API
│   └── emailNotificationService.js    # Cron-driven email reminders
├── views/                  # EJS templates
├── public/                 # Static assets (CSS, JS, fonts)
└── tests/                  # Jest unit tests
```

## How It Works

1. **Authentication** — users sign up with their name, email, and password (bcrypt-hashed). Sessions are persisted in MongoDB via `connect-mongo`. All address and collection routes require an active session. Users can reset a forgotten password via a time-limited token sent to their email.
2. **Address lookup** — the app proxies a postcode search to the Wiltshire Council address API (so the endpoint URL never reaches the browser) and lets the user select their address by UPRN.
3. **Collection dates** — once a UPRN is saved, `binCollectionDatesService` fetches all remaining months in the current year from the council API, parses the embedded `modelData` JSON from the HTML response (including .NET `/Date(ms)/` timestamps), deduplicates, and upserts into MongoDB.
4. **Email reminders** — on app start, a cron job is scheduled. Each morning it queries for any collections due that day, finds all users linked to the relevant UPRNs, and sends a reminder email via Gmail.

## CI

GitHub Actions run on every push and pull request:

| Workflow | What it does                        |
| -------- | ----------------------------------- |
| Lint     | Runs ESLint against the codebase    |
| Tests    | Runs Jest unit tests                |
| Semgrep  | Static security analysis (SAST)     |
