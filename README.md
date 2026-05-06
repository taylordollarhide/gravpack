# GravPack — Know What You Have

GravPack is a mobile-first emergency preparedness and household inventory management app. It helps you track survival supplies, score your household's readiness, and act on prioritized recommendations to close gaps.

All data is stored locally in the browser — no account, no cloud, no tracking.

## Key Technologies

| Layer | Technology |
|-------|------------|
| Framework | TanStack Start (React 19, file-based routing) |
| Build | Vite 7 |
| Styling | Tailwind CSS 4 + CSS custom properties |
| Language | TypeScript 5.7 (strict) |
| Persistence | Browser `localStorage` |
| Deployment | Netlify |

## Features

- **Shelf** — Inventory with search, category filters, expiry status, price tracking, and consumption logging
- **Expiring** — Items grouped by urgency (expired / critical / warning)
- **Readiness** — Household readiness score (0–100) across Water, Food, Power, and Medical with coverage-days calculation
- **Household** — Sliders and toggles to configure family size, water storage types, food supply, power, and medical readiness
- **Strategy** — Dynamic action plan ranked by score impact per dollar
- **Settings** — CSV export/import backup, data management, app info

## Running Locally

```bash
npm install
npm run dev      # dev server at http://localhost:3000
npm run build    # production build
```

Requires Node 18+. No environment variables needed — the app is fully client-side.
