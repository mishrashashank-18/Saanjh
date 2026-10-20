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

#### Option A: Run Frontend & Backend Independently

```bash
# Terminal 1: Backend API (runs on http://localhost:5000)
cd backend
npm install
npm run dev

# Terminal 2: Frontend (runs on http://localhost:8443)
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
