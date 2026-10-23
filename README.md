# Gulistan Marriage Bureau • گلستان میرج بیورو

> A high-trust, culturally respectful matchmaking and relationship management platform tailored for Pakistani families, lead matchmakers, and bureau administrators.

---

## 🏛️ Architectural Heritage & Design Philosophy

Gulistan Marriage Bureau combines centuries of cultural etiquette with modern web ergonomics. The visual identity reflects classical architectural motifs:
* **Midnight Navy (`#182848`)**: Dominant luxury brand color for primary actions, active indicators, and prominent headings.
* **Architectural Blue (`#486878`) & Dusty Blue (`#789898`)**: Supporting blues for subtle borders, secondary accents, and interactive outlines.
* **Warm Sandstone (`#D8C8A8`) & Gold (`#B69A62`)**: Warm accents evoking traditional limestone arches and ornate woodwork.
* **Warm Ivory (`#F7F3EA`) & Porcelain (`#FFFEFA`)**: Comfortable, glare-free light surfaces.
* **Cinematic Scroll Animation**: Seamless 300-frame scroll-driven background reflecting architectural depth, optimized with HTML5 Canvas cover scaling and reduced-motion fallbacks.

---

## 🌟 Key Platform Features

### 1. Lead Matchmaker Operational Desk (Nadeem Desk)
* **Candidate Quick Actions**: One-click shortcuts for adding profiles, candidate search, follow-up alerts, and finance tracking.
* **Daily Follow-Up Queue**: Tracks meetings, calls, photo verification requests, and family feedback with quick completion tags.
* **Collaborative Bureau Ledger**: Tracks payables, receivables, and commissions across partner marriage bureaus (Multan, Rawalpindi, Faisalabad, Karachi).
* **Controlled WhatsApp Sharing**: Generates standardized, privacy-controlled Urdu bios for safe family-to-family sharing.

### 2. 7-Step Guided Profile Wizard
Designed for touch-friendly operation on mobile and desktop:
1. **Personal Information**: Full name, display alias, age, height, marital status, caste/biradari, aqeedah, city, and residence area.
2. **Education & Career**: Degree, field, occupation, job title, and optional monthly income.
3. **Family Details & Siblings**: Parent status and occupation, dynamic per-sibling records (relation, marital status, spouse/marriage details).
4. **Property & Land Calculator**: Ownership status, property type, and **automatic real-time Marla ↔ Kanal conversion** (20 Marlas = 1 Kanal).
5. **Photographs & Consent**: Explicit candidate authorization check, safe placeholder demonstration URLs, and privacy notes.
6. **Criteria Importance Classification**: Partner preferences classified at runtime (*Mandatory*, *Preferred*, *Acceptable Range*, *Unknown*).
7. **Final Review & Submit**: Comprehensive summary card before committing to the live bureau registry.

### 3. Customer & Candidate Portal
* Self-service profile preview with privacy masking.
* Match recommendations categorized by compatibility score.
* Direct photo sharing consent toggles.

### 4. Administrator Governance & Security
* Operational metrics (active candidates, successful matches, verification rate, audit logs).
* Role-Based Access Control (RBAC) matrix defining permissions across Matchmaker, Customer, and Admin roles.

### 5. Full Bilingual Localization (English & اردو)
* Complete English and Urdu translations across all features.
* Responsive RTL layout support with Nastaliq typography.

---

## 💻 Tech Stack

* **Frontend Framework**: [React 19](https://react.dev/)
* **Build Tool**: [Vite 8](https://vite.dev/)
* **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
* **Type Safety**: [TypeScript 5.8](https://www.typescriptlang.org/)
* **Icons**: [Lucide React](https://lucide.dev/)

---

## 🚀 Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) (version 18 or higher recommended)
* `npm` or `yarn`

### Installation & Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Rao-Waleed-Nadeem/Gulistan-Marriage-Bureau.git
   cd Gulistan-Marriage-Bureau/frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` (or the port displayed in your terminal) to explore the application.

4. **Run type-checks & linting:**
   ```bash
   npm run lint
   ```

5. **Build for production:**
   ```bash
   npm run build
   ```
   The production-ready assets will be generated in `frontend/dist/`.

---

## 📁 Repository Structure

```text
Gulistan-Marriage-Bureau/
├── .gitignore                          # Root ignore rules for dependencies, caches, and build outputs
├── README.md                           # Platform documentation & setup guide
├── index.html                          # Root prototype markup
├── serve.js                            # Lightweight static development server
└── frontend/                           # React + Vite application
    ├── .env.example                    # Sample environment variables
    ├── .gitignore                      # Frontend-specific ignore rules
    ├── index.html                      # Single page application HTML entry
    ├── package.json                    # Project dependencies & scripts
    ├── tsconfig.json                   # TypeScript configuration
    ├── vite.config.ts                  # Vite build configuration
    ├── public/
    │   ├── assets/                     # Application logos and graphics
    │   └── frames/                     # 300-frame background scroll sequence (frame_0001 to frame_0300)
    └── src/
        ├── App.tsx                     # Main application entry with authentication state
        ├── index.css                   # Tailwind v4 configuration, design tokens & dark glass cards
        ├── components/
        │   ├── layout/                 # Navbar, Footer
        │   ├── matching/               # ControlledSharingModal
        │   └── ui/                     # ArchFrame, ProfileCard, ScrollAnimationBackground
        ├── data/
        │   └── mockData.ts             # Candidate profiles, matchmakers, follow-ups, and transactions
        ├── features/
        │   ├── admin/                  # AdminPortal
        │   ├── customer/               # CustomerPortal
        │   ├── matchmaker/             # NadeemDashboard, ProfileWizard, MatchReview
        │   └── public/                 # LandingPage, PublicPages
        ├── i18n/
        │   └── translations.ts         # English and Urdu translation dictionaries
        ├── types/                      # TypeScript domain models and interfaces
        └── utils/                      # WhatsApp formatter, units calculator, finance helpers
```

---

## 🔒 Security & Privacy Notice

* No real customer data, credentials, or private API keys are stored in version control.
* Demonstration records in `mockData.ts` use fictional sample personas for testing and design review.
