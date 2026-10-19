# Saanjh (सांझ)

> **Meet people who truly align with you.**  
> Thoughtful questions. Deeper compatibility. A calmer way to meet the right people.

[![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Vite 8](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

---

## 🌅 Overview

**Saanjh** (*meaning twilight or evening dusk in Hindi*) is an intentional, value-first matchmaking and connection platform designed to replace superficial, appearance-driven swiping with authentic compatibility and thoughtful human connections.

Built with an emphasis on calm aesthetics, warm editorial typography, and meaningful self-reflection, Saanjh connects individuals based on who they truly are—their core values, life outlook, shared interests, and communication styles.

---

## ✨ Key Features

### 1. 🧭 Dimensional Compatibility Engine
Rather than relying on generic algorithms, Saanjh computes deep compatibility across four foundational dimensions:
- **Values (95%)**: Shared morals, ethics, and mutual priorities.
- **Personality (88%)**: Disposition, introversion/extroversion, emotional rhythm.
- **Interests (90%)**: Intellectual passions, creative outlets, and hobbies.
- **Lifestyle (85%)**: Daily routines, weekend habits, and future ambitions.

### 2. 📝 Meaningful Questions (Self-Discovery)
- Replaces bio questionnaires with thoughtfully crafted, interactive prompts.
- Guided step-by-step progress tracking (*e.g., Question 18 of 24, 75% complete*).
- Reflective scenarios (*"How do you prefer to spend a free weekend?"*) that unpack real lifestyle preferences.

### 3. 🎯 Curated Daily Matches
- Handpicked recommendations tailored to genuine compatibility scores.
- Interactive profile cards showcasing compatibility rings, location, profession, personal interests, and a concise personal bio.
- Bookmark and save profiles for thoughtful future conversations.

### 4. ☕ Guided Icebreakers & Conversations
- Built-in thoughtful conversation starters designed to skip awkward small talk.
- Deep, engaging prompts (*e.g., "What does a perfect weekend look like for you?", "What's something you're currently excited about in life?"*).

### 5. 📖 Detailed Profiles & Photo Galleries
- Multi-photo galleries with thumbnail navigation.
- Comprehensive background details: profession, alma mater, verified location.
- Shared interest tag highlights (*Travel, Books, Good Food, Nature, Photography*).

### 6. 🛤️ 5-Step Journey to Meaningful Connection
1. **Create Profile**: Share your story and perspectives.
2. **Answer Questions**: Express what truly matters to you.
3. **Set Preferences**: Define your lifestyle and boundary priorities.
4. **Get Daily Matches**: Receive intentional, curated recommendations.
5. **Start Conversations**: Engage through guided, natural icebreakers.

---

## 🎨 Design System & Aesthetic

Saanjh features a calm, editorial aesthetic inspired by morning sunlight, natural paper textures, and warm sunsets:

| Token | Color | Hex Code | Purpose |
| :--- | :--- | :--- | :--- |
| **Cream** | Warm Linen | `#FDF8F3` / `#FFFAF5` | Primary canvas & backdrop |
| **Paper** | Pristine White | `#FFFDF9` | Card surfaces & containers |
| **Peach** | Warm Sunlit Disc | `#FBE3D6` | Subtle accents & highlights |
| **Coral** | Terracotta Sunset | `#E27650` | Primary buttons & key actions |
| **Teal** | Deep Forest Slate | `#1F5450` | Secondary buttons & compatibility rings |
| **Ink** | Deep Charcoal Ink | `#0F2A2E` / `#2B3A3D` | Editorial typography & headings |

### Typography
- **Headings & Editorial**: `Newsreader` (Google Fonts, serif)
- **Body & Controls**: `Source Sans 3` (Google Fonts, sans-serif)
- **Handwritten Accents**: `Caveat` (Google Fonts, cursive)

---

## 🛠️ Tech Stack

- **Frontend Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite 8](https://vitejs.dev/)
- **Language**: [TypeScript 5.7](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) via `@tailwindcss/vite`
- **Iconography**: Custom inline SVG icon system
- **Formatting**: [oxfmt](https://github.com/oxc-project/oxc)

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your machine:
- **Node.js** (v20.0.0 or higher recommended)
- **pnpm** (or `npm` / `yarn`)

### Installation

1. **Clone or navigate to the repository:**
   ```bash
   cd Saanjh
   ```

2. **Install project dependencies:**
   ```bash
   pnpm install
   # or
   npm install
   ```

3. **Start the local development server:**
   ```bash
   pnpm dev
   # or
   npm run dev
   ```

4. **Open in your browser:**
   Navigate to [http://localhost:8443](http://localhost:8443) (or the port specified in your terminal).

---

## 📜 Available Scripts

| Script | Command | Description |
| :--- | :--- | :--- |
| **`dev`** | `pnpm dev` | Starts the Vite development server with HMR on port 8443 |
| **`build`** | `pnpm build` | Compiles TypeScript and builds optimized production bundles into `dist/` |
| **`preview`** | `pnpm preview` | Locally serves the production build for testing |
| **`format`** | `pnpm format` | Formats code with oxfmt |

---

## 📂 Project Structure

```text
Saanjh/
├── public/
│   ├── favicon.svg             # Custom Saanjh 3-petal brand mark
│   └── images/                 # Reference photography & curated portrait assets
│       ├── aarohi-profile-reference.png
│       ├── aarohi-reference.png
│       ├── hero-reference.png
│       ├── notebook-reference.png
│       └── ...
├── src/
│   ├── App.tsx                 # Main application component & core UI sections
│   ├── index.css               # Global theme tokens, typography, & Tailwind v4
│   ├── main.tsx                # React DOM root entrypoint
│   └── vite-env.d.ts           # Vite TypeScript client definitions
├── index.html                  # HTML entry shell
├── package.json                # Project dependencies & scripts
├── tsconfig.json               # TypeScript compiler configuration
├── vite.config.ts              # Vite configuration (React & Tailwind v4)
└── README.md                   # Project documentation
```

---

## 🌟 Philosophy

> *"It’s not just about matching. It’s about finding people who share your values and building a kinder, more connected world."*

Saanjh is crafted with care to bring warmth, intentionality, and respect back to modern interpersonal connections.
