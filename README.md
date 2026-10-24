# Saanjh

Most matchmaking and dating apps today feel like an endless, exhausting game. You swipe through hundreds of curated pictures, make split-second judgments based on appearance alone, and usually end up with dry conversations that fizzle out after two messages.

**Saanjh** (*सांझ — the calm warmth of twilight*) is our attempt to slow things down.

Instead of endless swiping, Saanjh focuses on genuine human compatibility — matching people based on shared values, lifestyle habits, and what actually matters in everyday life before diving into a conversation.

---

## What makes it different

- **Meaningful questions, not generic bios**  
  Instead of asking for a witty one-liner, Saanjh asks real, situational questions: how you prefer to spend a free weekend, what currently excites you about life, and how you navigate relationships.

- **Values-first compatibility**  
  Compatibility scores are broken down into practical areas: core values, lifestyle rhythm, personality, and shared interests, giving you real context rather than a random percentage.

- **Curated daily picks instead of an endless feed**  
  A few thoughtful, handpicked matches every day. No casino-style swipe decks or dopamine traps.

- **Icebreakers that don't feel awkward**  
  Built-in guided prompts designed to skip past the painful *"hey / what's up / hbu"* small talk and spark genuine conversation naturally.

---

## Built with

We wanted the interface to feel as calm, warm, and tactile as a sunlit notebook:

- **React 19 & TypeScript**: Clean, modular component architecture.
- **Vite**: Sub-second dev reloads and instant production builds.
- **Tailwind CSS v4**: Lightweight utility styling with zero config bloat.
- **Warm Editorial Typography**: A classic serif (`Newsreader`) for headlines, paired with a readable sans (`Source Sans 3`) for copy and handwritten touches (`Caveat`).

---

## Getting Started

### 1. Clone & install

```bash
git clone https://github.com/<your-username>/saanjh.git
cd saanjh
pnpm install
```

*(You can also use `npm install` if you prefer npm).*

### 2. Run locally

#### Option A: One Command (Frontend + Backend Together)

```bash
# Starts Express backend on http://localhost:5000 and Vite frontend on http://localhost:8443
npm run dev:all
# or
npm start
```

#### Option B: Run Frontend & Backend Independently

```bash
# Terminal 1: Backend API (runs on http://localhost:5000)
cd backend
npm install
npm run dev

# Terminal 2: Frontend (runs on http://localhost:8443)
cd ..
npm run dev
```

---

## Environment Configuration

Create `.env` in the root and `backend/.env` in the `backend/` directory (you can copy `.env.example` and `backend/.env.example`):

### Frontend (`.env`)
```bash
VITE_API_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
```

### Backend (`backend/.env`)
```bash
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:8443

# MongoDB Connection String (Atlas URI or local, or leave empty in dev for auto in-memory DB)
MONGODB_URI=

# Brevo (Sendinblue) Transactional API (https://app.brevo.com/settings/keys/api)
BREVO_API_KEY=your_brevo_v3_api_key_here
BREVO_SENDER_EMAIL=verify@yourdomain.com # Must be a verified sender in your Brevo account

# JWT Secrets (min 32 characters)
JWT_ACCESS_SECRET=saanjh_dev_access_secret_key_32_characters_long_min
JWT_REFRESH_SECRET=saanjh_dev_refresh_secret_key_32_characters_long_min

# OTP Pepper (for HMAC-SHA256 hashing 6-digit verification codes)
OTP_PEPPER=saanjh_dev_otp_pepper_secret_key_min_32_chars

# Google Gemini API Key (for interest-based question generation)
GEMINI_API_KEY=your_gemini_api_key_here

# Optional Google OAuth Client ID
GOOGLE_CLIENT_ID=
```

---

## Seeding Interest Catalog & Default Questions

To populate MongoDB with the 13 categories, 251 unique interests, and default seeded questions:

```bash
npm run seed
# or
npm --prefix backend run seed
```

---

## Running Backend Test Suite

To run the automated test suite testing health, signup validation (18+), OTP generation, 5 wrong attempts limit, resend cooldown, profile auto-save, interests selection, questions generation, and dashboard:

```bash
npm --prefix backend test
```

---

## End-to-End Test Checklist

Follow this checklist to test the entire flow end-to-end:

1. **Signup Page (`/signup`)**:
   - Navigate to `http://localhost:8443/signup`.
   - Fill in full name, valid email, password, confirm password, date of birth (must be 18+), gender identity, and accept terms.
   - Click "Create My Saanjh Account →".
   - Confirm user is redirected to `/verify-email`.
2. **OTP Verification Page (`/verify-email`)**:
   - The page displays "We sent a 6-digit code to a***@domain.com".
   - 6 digit boxes with auto-advance and clipboard paste support.
   - **Test 5 Wrong Codes**: Enter `000000` 5 times. Confirm each attempt shows remaining tries, and on the 5th attempt the code is invalidated.
   - **Resend Countdown**: Confirm the "Resend code in Xs" countdown timer prevents spamming before 60 seconds.
   - **Correct Code**: Enter the 6-digit OTP. On completion, confirm automatic submission and redirect to `/onboarding/profile`.
3. **Stage 2: Profile Wizard (`/onboarding/profile`)**:
   - Step A: Select gender preferences (Women/Men/Non-binary/Everyone), age comfort range (dual slider), relationship goal.
   - Step B: Enter city, travel radius, and select comfortable languages.
   - Step C: Rate all 6 partner priorities from 1 to 10.
   - Step D: Select going out frequency, optional cultural importance, deal-breakers, and notes.
   - Click "Complete Profile & Pick Interests →".
4. **Stage 3: Interests (`/onboarding/interests`)**:
   - Screen 1: Pick at least 3 categories from the 13 large cards.
   - Screen 2: Select 5 to 15 interests across chosen categories (live counter reflects selection).
   - Screen 3: Pick and rank your Top 3 passions using the arrow buttons.
   - Click "Save & Continue to Questions →".
5. **Stage 4: Thoughtful Questions (`/onboarding/interest-questions`)**:
   - Single-tap radio chips for questions corresponding to your top categories.
   - Answer the shared question: "How much do you want a partner to share this interest?".
   - Progress indicator advances ("Category 1 of 3", "2 of 3", etc.).
   - On final category, click "Finish & Go to Dashboard →".
6. **Dashboard (`/dashboard`)**:
   - Warm welcome screen: "Welcome, &lt;name&gt;. Your matches are coming."
   - Highlights your preferences and featured top 3 passions.
   - Click "Settings & Preferences" to view and edit profile or re-select interests at any time.
7. **Resume Where Left Off**:
   - Log out, log back in, or refresh mid-onboarding.
   - Route guards automatically detect uncompleted `onboardingStep` and resume exactly where left off.
pnpm install
pnpm dev
```

#### Option B: From the Project Root

```bash
# Start backend from root
npm run backend:dev

# In another terminal, start frontend
pnpm dev
```

Open [http://localhost:8443](http://localhost:8443) in your browser.

### 3. Build for production

```bash
pnpm build
```

This compiles optimized static assets into the `dist/` directory, ready to deploy to Render, Vercel, Netlify, or Cloudflare Pages.

---

## Project Structure

```text
Saanjh/
├── backend/                       # Dedicated Node.js & Express Backend Application
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js              # MongoDB Atlas connection & resilient failover
│   │   ├── models/
│   │   │   └── User.js            # Mongoose schema, validation, bcrypt hashing
│   │   ├── controllers/
│   │   │   ├── authController.js  # Signup, Login, Google OAuth, Logout, Me
│   │   │   └── userController.js  # Profile retrieval, updates & photo management
│   │   ├── routes/
│   │   │   ├── authRoutes.js      # Rate-limited auth routes
│   │   │   └── userRoutes.js      # Authenticated user profile routes
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js  # JWT Cookie / Bearer verification & RBAC
│   │   │   └── errorMiddleware.js # Centralized Zod, MongoDB & 500 handler
│   │   ├── services/
│   │   │   └── googleAuthService.js # Official Google ID token verification
│   │   ├── app.js                 # Express app, Helmet, CORS & rate limiters
│   │   └── server.js              # Server entry point & graceful shutdown
│   ├── tests/
│   │   └── auth.test.js           # Automated integration test suite
│   ├── .env                       # Local backend secrets (git ignored)
│   ├── .env.example               # Template for backend secrets
│   ├── .gitignore                 # Backend-specific ignore rules
│   ├── package.json               # Backend dependencies & npm scripts
│   └── README.md                  # Comprehensive backend API documentation
│
├── public/                        # Static assets (brand icons & photography)
│   ├── favicon.svg
│   └── images/
├── src/                           # React 19 Frontend Application
│   ├── components/
│   │   └── AuthModal.tsx          # Login, Signup, Google Auth & Profile dialogs
│   ├── context/
│   │   └── AuthContext.tsx        # React Auth Context with session persistence
│   ├── services/
│   │   └── api.ts                 # Full API client connected to backend
│   ├── App.tsx                    # Main layout and sections
│   ├── index.css                  # Design tokens, typography & auth styling
│   └── main.tsx                   # React root entrypoint
├── index.html                     # HTML shell with Google Identity Services
├── package.json                   # Frontend dependencies & root helper scripts
├── render.yaml                    # Deployment blueprint
└── vite.config.ts                 # Vite + Tailwind v4 + /api reverse proxy
```

---

## Contributing & Feedback

Have ideas, feedback, or want to contribute?
1. Fork the repo.
2. Create a feature branch (`git checkout -b feature/cool-idea`).
3. Commit your changes (`git commit -m "Add something great"`).
4. Push to your branch and open a Pull Request.

Built with care for anyone looking for deeper, kinder connections.
