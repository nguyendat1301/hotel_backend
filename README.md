# Hotel Booking System Backend

The Node.js and Express backend API for the Hotel Booking System. It handles room management, booking transactions with conflict detection, user authentication (including Google OAuth), email notifications, and media uploads via Cloudinary.

## Features

- **Authentication & Security**: Email-based signup/login, Google OAuth 2.0 integration, JWT authentication stored in cookies, password hashing with `bcryptjs`, and rate limiting on authentication and password reset routes.
- **Room & Room Type Management**: CRUD operations for rooms and room types with image upload integration to Cloudinary.
- **Booking Engine**: Transaction-safe booking process that handles double-booking checks, total cost calculation, and transaction rollback.
- **Customer Management**: Register and manage customer profiles and metadata.
- **Notification Service**: Automated HTML email notifications using `nodemailer` for booking confirmations and password reset workflows.
- **Database Layer**: Relational data modeling using MySQL (`mysql2` connection pool) with structured Repository and Service pattern separation.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MySQL (using `mysql2` with promise wrappers)
- **Authentication**: JWT (`jsonwebtoken`), Google Auth Library (`google-auth-library`), Cookie Parser (`cookie-parser`)
- **Media Upload**: Multer, Cloudinary
- **Notifications**: Nodemailer
- **Utilities**: Bcrypt.js, Express Rate Limit, Dotenv, Nodemon (development)

---

## Prerequisites

Ensure you have the following installed on your local machine:
- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- [MySQL Database Server](https://www.mysql.com/)

---

## Getting Started

### 1. Clone the repository and install dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory (using the variables shown below) and populate it with your local credentials:

```ini
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=hotel

PORT_Server=5000
FRONTEND_URL=http://localhost:5173

JWT_SECRET=your_jwt_secret_key

# Cloudinary Setup
CLOUD_NAME=your_cloudinary_cloud_name
API_KEY=your_cloudinary_api_key
API_SECRET=your_cloudinary_api_secret

# Google OAuth Setup
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Email Settings (SMTP)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_app_password
```

> [!NOTE]
> The database schema must be initialized in your MySQL instance matching the structure specified in the repository files (`bookings`, `users`, `customers`, `room`, `room_types`, `payments`).

### 3. Start the Server

To start the development server with hot-reloading (via Nodemon):
```bash
npm run dev
```

To run in production mode:
```bash
npm start
```

The API server will run at `http://localhost:5000` (or the port defined by `PORT_Server`).

---

## API Endpoints

The API is exposed under `/api` routes:

| Route | Description | Auth Required |
|---|---|---|
| **Authentication** | | |
| `POST /api/register` | Register a new administrator / operator | No |
| `POST /api/login` | Log in to obtain JWT cookie | No |
| `POST /api/google-login` | Authenticate with Google ID Token | No |
| `POST /api/logout` | Clear the auth cookie | No |
| `POST /api/forgot-password` | Request password reset token | No |
| `POST /api/reset-password` | Submit new password with token | No |
| `GET /api/profile` | Get current user's profile | Yes |
| `PUT /api/profile` | Update profile information | Yes |
| **Rooms** | | |
| `GET /api/rooms` | Query rooms list | Yes |
| `POST /api/rooms` | Add a new room | Yes |
| `PUT /api/rooms/:id` | Edit room details | Yes |
| `DELETE /api/rooms/:id` | Remove a room | Yes |
| **Room Types** | | |
| `GET /api/room-types` | Fetch room categories | No |
| `POST /api/room-types` | Create a room type with image upload | Yes |
| **Bookings** | | |
| `GET /api/bookings` | View booking records | Yes |
| `POST /api/bookings` | Book a room (performs transaction & emails confirmation) | Yes |
| `PUT /api/bookings/:id/status` | Update booking status | Yes |
| `DELETE /api/bookings/:id` | Cancel/delete booking and related payments | Yes |
| **Customers** | | |
| `GET /api/customers` | Query customer listings | Yes |
| `POST /api/customers` | Register a customer profile | Yes |
