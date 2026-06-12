# Bin Collection Website

A Node.js and Express web application for managing addresses and bin collection dates, with MongoDB for persistence and EJS for server-rendered views.

## Features

- View and manage addresses
- View bin collection information
- Store address and collection data in MongoDB
- Server-rendered pages using EJS templates
- GOV.UK Frontend styling support
- Sass stylesheet compilation
- Email notification configuration for bin reminders
- Docker Compose support for local development
- MongoDB replica set setup for development

## Tech Stack

- **Node.js**
- **Express**
- **MongoDB**
- **Mongoose**
- **EJS**
- **ejs-mate**
- **GOV.UK Frontend**
- **Sass**
- **Docker Compose**
- **Nodemailer**
- **node-cron**


## Getting Started

### Prerequisites

You will need:

- Node.js 20 or later
- npm
- Docker and Docker Compose, if running with containers
- MongoDB, if running without Docker

## Environment Variables

Create a `.env` file in the project root using `env.example` as a starting point:


### Environment Variable Reference

| Variable | Description |
| --- | --- |
| `NODE_ENV` | Application environment, for example `development` or `production` |
| `PORT` | Port used by the Express application |
| `HOST_PORT` | Host port mapped to the app when using Docker |
| `MONGO_HOST_PORT` | Host port mapped to MongoDB in development |
| `MONGO_URL` | MongoDB connection string |
| `GMAIL_USER` | Gmail account used for sending email notifications |
| `GMAIL_APP_PASSWORD` | Gmail app password used by Nodemailer |
| `BIN_REMINDER_CRON` | Cron expression for scheduled bin reminder notifications |

## Available Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Starts the app using `nodemon` with debug logging enabled |
| `npm run sass` | Watches Sass files and compiles CSS |
| `npm run mongo:init` | Initialises the MongoDB replica set inside Docker |
| `npm test` | Placeholder test command |




