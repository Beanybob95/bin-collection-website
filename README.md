# Bin Collection Website

A Node.js and Express web application that lets residents look up bin collection dates for their address and opt in to email reminders. Collection data is fetched from the Wiltshire Council API, parsed, and stored in MongoDB. Reminders are sent automatically on collection day via a scheduled cron job.

## Features

- Look up bin collection dates by address/UPRN
- Store and manage addresses and their associated contacts
- Email reminders sent on collection day (configurable cron schedule)
- GOV.UK Frontend styling
- Docker Compose setup with MongoDB replica set for local development

## Tech Stack

| Layer | Technology |
| --- | --- |
| Runtime | Node.js 20, Express 5 |
| Database | MongoDB 7 (replica set), Mongoose |
| Templating | EJS, ejs-mate |
| Styling | GOV.UK Frontend, Sass |
| Email | Nodemailer (Gmail) |
| Scheduling | node-cron |
| HTTP client | Axios |
| Dev tooling | Nodemon, Docker Compose |

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- Docker and Docker Compose (recommended), **or** a local MongoDB 7 instance with a replica set

### Running with Docker (recommended)

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

| Variable | Description |
| --- | --- |
| `NODE_ENV` | `development` or `production` |
| `PORT` | Port the Express app listens on |
| `HOST_PORT` | Host port mapped to the app container (Docker only) |
| `MONGO_HOST_PORT` | Host port mapped to MongoDB container (Docker dev only, do not expose in prod) |
| `MONGO_URL` | MongoDB connection string (defaults to `mongodb://localhost:27017/bincollection?replicaSet=rs0`) |
| `GMAIL_USER` | Gmail address used to send reminder emails |
| `GMAIL_APP_PASSWORD` | Gmail [App Password](https://support.google.com/accounts/answer/185833) for Nodemailer |
| `BIN_REMINDER_CRON` | Cron expression for the daily reminder job (defaults to `0 8 * * *` — 8 AM every day) |
| `BIN_COLLECTION_API` | Wiltshire Council bin collection API endpoint |
| `ADDRESS_LIST_API` | Wiltshire Council address lookup API endpoint |

## Available Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the app with nodemon and full debug logging (`DEBUG=*`) |
| `npm run sass` | Watch and compile Sass to CSS |
| `npm run mongo:init` | Initialise the MongoDB replica set inside the Docker container |
| `npm run app:build` | Build and start the full Docker Compose stack |
| `npm test` | Run Jest tests |

## Project Structure

```
├── app.js                  # App entry point
├── controllers/            # Route handler logic
├── models/                 # Mongoose schemas (Address, BinCollectionDates, Contacts)
├── routes/                 # Express routers
├── services/
│   ├── binCollectionDatesService.js   # Fetches and parses dates from the Wiltshire API
│   └── emailNotificationService.js    # Cron-driven email reminders
├── views/                  # EJS templates
├── public/                 # Static assets (CSS, JS, fonts)
├── seeds/                  # Database seed scripts
└── tests/                  # Jest unit tests
```

## How It Works

1. **Address lookup** — the app proxies a postcode search to the Wiltshire Council address API and lets the user select their address by UPRN.
2. **Collection dates** — once a UPRN is saved, `binCollectionDatesService` fetches all remaining months in the current year from the council API, parses the embedded `modelData` JSON from the HTML response (including .NET `/Date(ms)/` timestamps), deduplicates, and upserts into MongoDB.
3. **Email reminders** — on app start, a cron job is scheduled. Each morning it queries for any collections due that day, finds all contacts linked to the relevant UPRNs, and sends a reminder email via Gmail.
