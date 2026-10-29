# SmartFarm Sierra Leone

Digital agriculture platform for farmers, suppliers, buyers and lenders in Sierra Leone.
The full product spec is in [PRD.md](PRD.md); it is built one milestone at a time (PRD Section 12).

**Status:** Milestones 1–3 complete: foundation, authentication and profiles, business registration and verification.

## Stack

Next.js 15 (App Router) · TypeScript (strict) · Tailwind CSS 4 · PostgreSQL · Prisma 6 · Zod · Vitest · Playwright

## Getting started

Requires Node 20+ and PostgreSQL running locally.

```bash
cp .env.example .env              # set USER in the database URLs, OTP_SECRET and STORAGE_SIGNING_SECRET (openssl rand -hex 32)
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
| `npm run test:e2e` | Playwright browser tests (starts its own server on port 3100 against the test database) |
| `npm run check` | Lint + type-check + tests |
| `npm run db:migrate` | Create/apply migrations (dev database) |
| `npm run db:seed` | Load reference data (idempotent) |
| `npm run user:set-role -- <phone> <ROLE>` | Change a user's role, e.g. make the first admin |

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

## Signing in locally (Milestone 2)

- Sign in at `/login` with any Sierra Leone number, e.g. `079 000 001`.
- There is no real SMS yet. The mock provider prints the code in the server log and appends it to `.data/sms-outbox.jsonl`.
- New numbers become **farmers** and go through onboarding (district, chiefdom, crops, farm size).
- To make an admin: sign in once with the number, then `npm run user:set-role -- 079000001 ADMIN`.

How it works:

| Rule | Value | Where |
|---|---|---|
| Code | 6 digits, valid 5 minutes, 5 wrong tries then locked; only an HMAC is stored | `lib/auth/otp.ts` |
| Code requests | 3 per phone per 15 min, 20 per IP per hour | `lib/rate-limit.ts` |
| Code checks | 50 per IP per hour | `lib/rate-limit.ts` |
| Session | 30 days, extended while in use; only a SHA-256 hash of the token is stored | `lib/auth/session.ts` |
| Access | farmer → `/farmer`; supplier, buyer, lender → `/business`; admin, agronomist → `/admin` | `lib/auth/access.ts` |

Access is checked on the server in each area's layout and again in each page and server action.
`middleware.ts` only redirects visitors with no session cookie to `/login`.

## Business registration and verification (Milestone 3)

- On the home page, **I run a business** → sign in with a new number → register the organisation (supplier, buyer or lender).
- The account's role becomes the organisation type. A number that has finished farmer onboarding can't register a business.
- Upload documents (PDF, JPG or PNG, max 5 MB, checked by file content), then **Submit for verification**.
  - Everyone: business registration certificate.
  - Lenders, and suppliers that sell agrochemicals: also a licence.
- Status flow: `DRAFT → PENDING → APPROVED | REJECTED`. Rejected organisations can edit and resubmit.
- Admins review at `/admin/organisations`: see details, open documents, approve, or reject with a reason (10+ characters).
  Agronomists can open `/admin` but not the verification queue.
- Each submission and decision is written to `AuditLog`. The business gets an SMS on approval or rejection (mock SMS for now).
- `requireApprovedOrganisation()` in `lib/business/organisation.ts` is the gate every listing write must call (Milestone 4 onwards).

Documents are private:

- Stored outside `/public` through the `PrivateFileStorage` adapter (`lib/adapters/storage`); local disk under `.data/private` in development.
- Only served by `/api/documents/[id]`, which needs **both** a signed link that expires after 5 minutes **and** a signed-in admin.
  Signed-out visitors get 401; everyone else, and expired or tampered links, get 403.

## Known gaps

- Chiefdoms are a starter sample (3 per district), not the full official list of ~190. Complete them from the Statistics Sierra Leone list before launch.
- Only local-disk storage exists. Production needs an S3/R2 `PrivateFileStorage` implementation before launch.
- The mock SMS provider refuses to start in production. A real SMS provider is Milestone 8.
- Old rate-limit rows are not cleaned up automatically yet; `pruneRateLimitHits()` exists for a scheduled job.
- The Western Area has no chiefdoms; its rural districts and Freetown areas are stored in the chiefdom table instead.
