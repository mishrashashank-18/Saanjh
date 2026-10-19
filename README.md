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

```bash
pnpm dev
```

Open [http://localhost:8443](http://localhost:8443) in your browser.

### 3. Build for production

```bash
pnpm build
```

This compiles optimized static assets into the `dist/` directory, ready to drop onto Render, Vercel, Netlify, or Cloudflare Pages.

---

## Project Structure

```text
├── public/
│   ├── favicon.svg             # Saanjh 3-petal brand icon
│   └── images/                 # Portrait & reference photography
├── src/
│   ├── App.tsx                 # Main layout and sections
│   ├── index.css               # Design tokens, typography & Tailwind styles
│   └── main.tsx                # React root entrypoint
├── index.html                  # HTML shell
├── render.yaml                 # Render static site blueprint
└── vite.config.ts              # Clean Vite + Tailwind v4 config
```

---

## Contributing & Feedback

Have ideas, feedback, or want to contribute?
1. Fork the repo.
2. Create a feature branch (`git checkout -b feature/cool-idea`).
3. Commit your changes (`git commit -m "Add something great"`).
4. Push to your branch and open a Pull Request.

Built with care for anyone looking for deeper, kinder connections.
