# Saanjh Backend API

Robust, secure backend application for **Saanjh** — a values-first matchmaking platform. Built with **Node.js, Express.js, MongoDB Atlas (Mongoose), JWT authentication, and Google OAuth 2.0**.

---

## 📁 Directory Structure

```text
backend/
├── src/
│   ├── config/
│   │   └── db.js                 # MongoDB connection & connection state handling
│   ├── models/
│   │   └── User.js               # Mongoose User schema with validation & security
│   ├── controllers/
│   │   ├── authController.js     # Signup, Login, Google OAuth, Logout, Me
│   │   └── userController.js     # Profile management & photo updates
│   ├── routes/
│   │   ├── authRoutes.js         # /api/auth routes with rate limiting
│   │   └── userRoutes.js         # /api/users routes (protected)
│   ├── middleware/
│   │   ├── authMiddleware.js     # JWT verification (Cookie & Bearer) & RBAC
│   │   └── errorMiddleware.js    # Centralized Zod, Mongoose & 500 error handler
│   ├── services/
│   │   └── googleAuthService.js  # Official Google ID token verification
│   ├── app.js                    # Express app configuration, CORS, Helmet, rate-limiting
│   └── server.js                 # HTTP server initialization & graceful shutdown
├── tests/
│   └── auth.test.js              # Integration test suite
├── .env                          # Local environment variables (DO NOT COMMIT)
├── .env.example                  # Template of required environment variables
├── .gitignore                    # Backend gitignore
├── package.json                  # Dependencies and scripts
└── README.md                     # Backend documentation
```

---

## 🛠️ Required Tech Stack

- **Runtime**: Node.js (v18+)
- **Framework**: Express.js 4.x
- **Database**: MongoDB Atlas via Mongoose
- **Authentication**: JSON Web Tokens (short-lived access + refresh tokens in secure HTTP-only cookies and Authorization headers)
- **Google OAuth**: Official `google-auth-library` ID token verification
- **Password Hashing**: `bcryptjs` (cost factor 12)
- **Validation**: `zod` for request schemas
- **Security**: `helmet`, `cors`, `express-rate-limit`, `cookie-parser`
- **Testing**: Native Node.js test runner (`node --test`), `supertest`, and `mongodb-memory-server`

---

## 🚀 Getting Started

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `backend/.env`:

```dotenv
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/saanjh?retryWrites=true&w=majority
FRONTEND_URL=http://localhost:8443
JWT_ACCESS_SECRET=your_jwt_access_secret_min_32_characters_random
JWT_REFRESH_SECRET=your_jwt_refresh_secret_min_32_characters_random
GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
```

### 3. Run Development Server

```bash
npm run dev
```

The server starts on `http://localhost:5000` with hot-reloading via `nodemon`.

### 4. Run Automated Tests

The test suite runs an in-memory MongoDB instance and does not require a live Atlas connection:

```bash
npm test
```

### 5. Production Start

```bash
npm start
```

---

## 🍃 MongoDB Atlas Setup Instructions

1. **Create an Account**: Go to [cloud.mongodb.com](https://cloud.mongodb.com/) and sign up or sign in.
2. **Create a Free Cluster**:
   - Choose **M0 (Free)** under shared clusters.
   - Select your preferred cloud provider and closest region (e.g., `aws / ap-south-1` for India).
   - Cluster name: `saanjh-cluster`.
3. **Configure Database User**:
   - Go to **Security > Database Access**.
   - Click **Add New Database User**.
   - Authentication Method: **Password**.
   - Set username (e.g. `saanjh_admin`) and a secure password.
   - Database User Privileges: **Read and write to any database**.
4. **Configure Network Access**:
   - Go to **Security > Network Access**.
   - Click **Add IP Address**.
   - For local development, click **Allow Access from Anywhere** (`0.0.0.0/0`) or add your current IP address.
5. **Get Connection String**:
   - Go to **Deployment > Database**.
   - Click **Connect** on your cluster.
   - Choose **Drivers** (Node.js).
   - Copy the URI and replace `<username>` and `<password>` with your database user credentials.
   - Set `MONGODB_URI` in `backend/.env`.

---

## 🔐 Google OAuth 2.0 Setup Instructions

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project named **Saanjh**.
3. **Configure OAuth Consent Screen**:
   - Go to **APIs & Services > OAuth consent screen**.
   - User Type: **External**.
   - App Name: `Saanjh`.
   - User support email & Developer contact email: your email.
   - Scopes: `.../auth/userinfo.email`, `.../auth/userinfo.profile`, `openid`.
4. **Create OAuth Client ID**:
   - Go to **APIs & Services > Credentials**.
   - Click **Create Credentials > OAuth client ID**.
   - Application type: **Web application**.
   - Name: `Saanjh Web Client`.
   - **Authorized JavaScript origins**:
     - `http://localhost:8443`
     - `http://localhost:5173`
     - `http://localhost:3000`
     - `http://localhost:5000`
     - (And your production domain e.g. `https://your-domain.com`)
   - Click **Create**.
5. Copy the generated **Client ID**:
   - In `backend/.env`: `GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com`
   - In frontend `.env`: `VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com`

---

## 📡 API Endpoints Reference

### Health Check

#### `GET /api/health`
Returns system status and database connectivity.
- **Response** (200 OK):
  ```json
  {
    "status": "ok",
    "service": "saanjh-backend",
    "uptimeSeconds": 42,
    "timestamp": "2026-10-20T18:00:00.000Z",
    "database": {
      "connected": true,
      "state": "connected"
    }
  }
  ```

---

### Authentication (`/api/auth`)

#### `POST /api/auth/signup`
Creates a new account with email & password.
- **Rate Limit**: 50 req / 15 min
- **Request Body**:
  ```json
  {
    "fullName": "Aarohi Sharma",
    "email": "aarohi@example.com",
    "password": "Password123!",
    "confirmPassword": "Password123!",
    "dateOfBirth": "2000-05-15",
    "genderIdentity": "woman",
    "mobileNumber": "+919876543210",
    "termsAccepted": true
  }
  ```
- **Response** (201 Created):
  Sets `accessToken` & `refreshToken` HTTP-only cookies.
  ```json
  {
    "success": true,
    "message": "Welcome to Saanjh! Your account has been created successfully.",
    "user": {
      "id": "671569429...",
      "fullName": "Aarohi Sharma",
      "displayName": "Aarohi Sharma",
      "email": "aarohi@example.com",
      "role": "user",
      "accountStatus": "active"
    },
    "accessToken": "eyJhbGciOi..."
  }
  ```

#### `POST /api/auth/login`
Authenticates existing user with email and password.
- **Rate Limit**: 50 req / 15 min
- **Request Body**:
  ```json
  {
    "email": "aarohi@example.com",
    "password": "Password123!"
  }
  ```
- **Response** (200 OK):
  Sets `accessToken` & `refreshToken` HTTP-only cookies.

#### `POST /api/auth/google`
Authenticates or registers user using Google ID token from Google Identity Services.
- **Rate Limit**: 50 req / 15 min
- **Request Body**:
  ```json
  {
    "credential": "eyJhbGciOiJSUzI1NiIs..."
  }
  ```
- **Response** (200/201 OK):
  Sets `accessToken` & `refreshToken` HTTP-only cookies.

#### `POST /api/auth/logout`
Clears session cookies.
- **Response** (200 OK):
  ```json
  {
    "success": true,
    "message": "Logged out successfully."
  }
  ```

#### `GET /api/auth/me`
Returns current authenticated user details.
- **Headers**: Cookie `accessToken` OR `Authorization: Bearer <token>`
- **Response** (200 OK):
  ```json
  {
    "success": true,
    "user": { ... }
  }
  ```

---

### User Profile (`/api/users`)

All routes require authentication.

#### `GET /api/users/me`
Returns current user's profile.

#### `PATCH /api/users/me`
Updates editable fields on user profile:
- **Allowed Fields**: `fullName`, `displayName`, `mobileNumber`, `dateOfBirth`, `genderIdentity`, `bio`, `city`, `education`, `occupation`, `languages`, `relationshipStatus`, `interests`, `profilePhoto`.
- **Response** (200 OK):
  ```json
  {
    "success": true,
    "message": "Your profile has been updated successfully.",
    "user": { ... }
  }
  ```

#### `POST /api/users/me/photo`
Updates user profile photo URL.
- **Request Body**: `{ "photoUrl": "https://..." }`
- **Response** (200 OK).
