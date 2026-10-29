# SmartFarm Sierra Leone

Digital agriculture platform for farmers, suppliers, buyers and lenders in Sierra Leone.
The full product spec is in [PRD.md](PRD.md); it is built one milestone at a time (PRD Section 12).

**Status:** Milestone 1 (project foundation) complete.

## Stack

Next.js 15 (App Router) · TypeScript (strict) · Tailwind CSS 4 · PostgreSQL · Prisma 6 · Zod · Vitest

## Getting started

Requires Node 20+ and PostgreSQL running locally.

```bash
cp .env.example .env              # then set USER in both database URLs
createdb smartfarm_dev
createdb smartfarm_test
npm install
npm run db:migrate                # apply migrations to the dev database
npm run db:seed                   # 16 districts, sample chiefdoms, priority crops
npm run dev                       # http://localhost:3000
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on port 3000 |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm test` | Vitest unit and integration tests (uses `TEST_DATABASE_URL`) |
| `npm run check` | Lint + type-check + tests |
| `npm run db:migrate` | Create/apply migrations (dev database) |
| `npm run db:seed` | Load reference data (idempotent) |

Tests apply pending migrations to the test database with `prisma migrate deploy` before each run.
The setup refuses to run against any database URL that doesn't contain "test".

## Project layout

```
app/              routes (farmer, business, admin, api)
components/       UI components
lib/              domain logic
lib/adapters/     external services behind interfaces (error tracking now; weather, sms, ussd, ai later)
lib/i18n/         translator; strings live in locales/
lib/observability structured logger and client error reporting
prisma/           schema, migrations, seed and seed data
locales/          translation files (en.json; Krio to follow)
tests/            unit and integration tests
```

## What Milestone 1 includes

- **Translation system:** every UI string comes from `locales/en.json` through `t("key")`; keys are type-checked.
- **PWA manifest:** `/manifest.webmanifest` with 192/512 and maskable icons. The service worker and offline caching come in Milestone 5.
- **Error tracking hook:** `captureException()` in `lib/adapters/error-tracking`. Server errors arrive through `instrumentation.ts`, client errors through the error boundaries and `/api/client-errors`. The default tracker logs structured JSON; a hosted tracker can be plugged in later.
- **Health check:** `GET /api/health` reports database reachability.
- **Reference data:** 16 districts with forecast coordinates (district headquarter towns), a starter set of chiefdoms, and the 9 priority crops.

## Known gaps

- Chiefdoms are a starter sample (3 per district), not the full official list of ~190. Complete them from the Statistics Sierra Leone list before launch.
- The Western Area has no chiefdoms; its rural districts and Freetown areas are stored in the chiefdom table instead.
