
  # Lakeside Hotel API

  **Backend API for hotel bookings, administration, and the customer support chatbot**

  [![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
  [![Express](https://img.shields.io/badge/Express-5-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
  [![MySQL](https://img.shields.io/badge/MySQL-8-4479A1?style=flat-square&logo=mysql&logoColor=white)](https://www.mysql.com/)

  [Features](#features) · [Architecture](#architecture) · [Getting started](#getting-started) · [API overview](#api-overview) · [Scripts](#available-scripts)
</div>

---

## Overview

`hotel-back` is the Node.js and Express API for the Lakeside Hotel booking platform. It provides authentication, room and reservation management, customer and staff administration, email notifications, image uploads, and a Gemini-powered chatbot. MySQL is accessed through `mysql2` and a repository/service architecture.

The React frontend is in [`hotel-admin`](../hotel-admin).

## Features

- Email/password registration and login, Google sign-in, JWT authentication in cookies, profile management, and password reset.
- Room, room type, booking, customer, and user management, with role-protected administrative operations.
- Booking availability checks, reservation status management, and full-payment processing.
- Image uploads to Cloudinary and transactional email notifications through Nodemailer.
- Chatbot with intent classification, Gemini embeddings, semantic retrieval from MySQL, and live room data.
- Rate limiting for authentication, password reset, and chatbot requests.

## Tech stack

| Area | Technologies |
| --- | --- |
| Runtime and API | Node.js, Express 5 |
| Database | MySQL, `mysql2` |
| Authentication | JWT, `bcryptjs`, Google Auth Library, cookie-parser |
| Chatbot | Google Gemini API (`@google/genai`) |
| Uploads and email | Cloudinary, Multer, Nodemailer |
| Tests | Node.js built-in test runner |

## Architecture

```text
server.js
├── routes/          HTTP route definitions
├── controllers/     Request handling
├── services/        Business logic and integrations
├── repositories/    Database access
├── middleware/      Authentication, roles, uploads, rate limits
├── migrations/      Database migrations
├── scripts/         Knowledge-base ingestion
└── tests/           Automated tests
```

### Chatbot request flow

1. Classify the question intent.
2. Retrieve relevant knowledge-base chunks using Gemini embeddings and cosine similarity; query MySQL for dynamic room information when applicable.
3. Generate an answer with Gemini and return the response with its sources.

## Getting started

### Requirements

- Node.js 18 or later and npm
- MySQL 8.0 or a compatible MariaDB server
- A Google Gemini API key to use the chatbot

Google OAuth, Cloudinary, and email credentials are required only for the corresponding integrations.

### Install and configure

From the backend directory:

```bash
npm install
```

Copy `.env.example` to `.env` and set the values for your environment. At minimum, configure the database connection, `PORT_Server`, `FRONTEND_URL`, and a strong `JWT_SECRET`. Set the relevant provider credentials to enable Google sign-in, Cloudinary uploads, email, and Gemini features.

| Variable | Purpose |
| --- | --- |
| `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | MySQL connection |
| `DB_CONNECTION_LIMIT` | MySQL connection pool size |
| `PORT_Server` | HTTP server port (for example, `5000`) |
| `FRONTEND_URL` | Allowed frontend origin for credentialed CORS |
| `JWT_SECRET` | Secret used to sign authentication tokens |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google authentication |
| `GEMINI_API_KEY` | Google Gemini API access |
| `GEMINI_MODEL`, `GEMINI_EMBEDDING_MODEL` | Chat and embedding models |
| `CHATBOT_MAX_RETRIES`, `CHATBOT_TIMEOUT_MS` | Chatbot retry and timeout settings |
| `CLOUD_NAME`, `API_KEY`, `API_SECRET` | Cloudinary upload credentials |
| `EMAIL_USER`, `EMAIL_PASS` | Email sender credentials |

> [!IMPORTANT]
> The existing application database schema must be available in MySQL. The migration below creates only the chatbot knowledge table; it does not initialize the booking and user tables.

### Set up chatbot knowledge

Apply the chatbot migration from `hotel-back`:

```bash
mysql -u root -p hotel < migrations/001_chatbot_knowledge_chunks.sql
```

Then ingest the static hotel knowledge and generate embeddings:

```bash
npm run ingest
```

To force re-ingestion:

```bash
node scripts/ingest.js --force
```

### Run the API

```bash
# Development with automatic reload
npm run dev

# Production
npm start
```

The API listens on `http://localhost:<PORT_Server>` and is mounted under `/api`.

## API overview

All routes below are prefixed with `/api`. Routes marked **Protected** require authentication; administrative routes also require the configured administrator role.

| Area | Routes | Access |
| --- | --- | --- |
| Authentication | `POST /register`, `/login`, `/google-login`, `/logout`, `/forgot-password`, `/reset-password`; `GET /profile`; `PUT /profile` | Public or authenticated, depending on route |
| Rooms | `GET /rooms`, `GET /rooms/:id`; `POST`, `PUT`, `DELETE /rooms` | Read routes public; mutations admin |
| Room types | `/room-types` and `/room-types/:id`; `GET /room-types/search` | Read routes public; mutations admin |
| Bookings | `GET /bookings/available-rooms`, `/bookings/my-bookings`; `POST /bookings`; `GET /bookings`; `PUT /bookings/:id/status`; `POST /bookings/:id/pay-full`; `DELETE /bookings/:id` | Public availability; remaining routes protected, some admin-only |
| Customers and users | `/customers`, `/customers/:id`; `/users`, `/users/:id` | Admin |
| Chatbot | `GET /chatbot/knowledge`, `POST /chatbot`; `POST /chatbot/ingest`, `GET /chatbot/stats` | Knowledge and chat public (chat rate-limited); ingestion and stats admin |

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server with Nodemon |
| `npm start` | Start the API server |
| `npm test` | Run the chatbot test file |
| `npm run test:chatbot` | Run selected chatbot unit tests |
| `npm run ingest` | Ingest chatbot knowledge |

## Project structure

```text
hotel-back/
├── controllers/
├── data/                 # Static chatbot knowledge
├── middleware/
├── migrations/
├── repositories/
├── routes/
├── scripts/
├── services/
├── tests/
├── utils/
├── db.js
├── server.js
└── package.json
```
