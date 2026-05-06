# AGENTS.md

This document describes the GravPack project architecture for developers and AI agents.

## Project Overview

GravPack is a mobile-first emergency preparedness inventory tracker. It runs entirely in the browser using `localStorage` — no backend, no auth, no network required for core functionality.

## Directory Structure

```
src/
  lib/
    gravpack.ts        # All types, storage helpers, scoring engine, strategy engine, CSV utils
  routes/
    __root.tsx         # HTML shell, meta tags (PWA-ready), Google Fonts
    index.tsx          # Complete GravPack app — all screens, modals, tab navigation
  styles.css           # Tailwind import + full GravPack design system (CSS custom properties, component classes)
  router.tsx           # TanStack Router setup
public/                # Static assets
```

## Key Files

### `src/lib/gravpack.ts`
Single source of truth for:
- **Types**: `Item`, `Household`, `PriceRecord`, `ConsumeEntry`, `Scores`, `StrategyAction`
- **Storage**: `loadItems`, `saveItems`, `loadHousehold`, `saveHousehold` etc. (all `localStorage`)
- **Scoring**: `calcScores(household)` — weighted 0–100 score across Water (30%), Food (30%), Power (20%), Medical (20%)
- **Strategy**: `buildStrategy(household, items)` — ranked action items with cost/impact tags
- **CSV**: `exportCSV`, `parseCSV` — backup/restore

### `src/routes/index.tsx`
All UI in one file, organized as:
- Screen components: `ShelfScreen`, `ExpiringScreen`, `ReadinessScreen`, `HouseholdScreen`, `StrategyScreen`, `SettingsScreen`
- Modal components: `AddItemModal` (3-step), `ItemDetailModal`, `ConsumeModal`, `RestockModal`
- `GravPackApp` — root component, manages all state, wires screens and modals

### `src/styles.css`
GravPack design system built on CSS custom properties (`--bg`, `--accent`, `--t1` etc.). Uses Tailwind for layout utilities and custom classes for components (`.item-card`, `.strat-item`, `.tog`, `.sl` etc.).

## Design System

- **Background**: `#0d1117` (dark), `#161b22` (card), `#21262d` (border)
- **Accent**: `#FFCC00` (yellow — primary CTA, active states)
- **Status**: red expired, orange critical, yellow warning, green good, teal long-term
- **Fonts**: Bebas Neue (display/headings), DM Sans (body), DM Mono (data/labels)
- **Layout**: max-width 430px, mobile-first, bottom tab bar

## State Architecture

No external state library. All state lives in `GravPackApp` via `useState`:
- `items: Item[]` — inventory, persisted to `localStorage` on every change via `saveItems`
- `household: Household` — config, persisted similarly
- Modal state: `addModal`, `detailItem`, `consumeItem`, `restockItem`

Screens receive props only; they do not touch localStorage directly.

## Scoring Logic (in `calcScores`)

- **Water**: safe gallons (commercial + treated personal + WaterBOB) ÷ daily need → days → score, plus treatment and mobile bonuses
- **Food**: stored cal/day ÷ household daily need → days → score, with veg/infant penalties
- **Power**: 18pts per battery pack + 30pts for generator, capped at 100
- **Medical**: 50pts for first aid kit + 40pts for 30-day rx supply; negative if rx present but not covered
- **Coverage days**: `min(waterDays, foodDays)`

## Conventions

- TypeScript strict mode; `type` imports where possible
- `@/` path alias maps to `src/`
- No backend API routes used by the app (the scaffolded `api.chat.ts` is unused)
- CSS classes over inline styles where reuse exists; inline styles for one-off colors/overrides
- No external state management library — props drilling is intentional for this app's scope
