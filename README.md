# Kortech Sierra Leone

Digital agriculture platform for farmers, suppliers, buyers and lenders in Sierra Leone.
The full product spec is in [PRD.md](PRD.md); it is built one milestone at a time (PRD Section 12).

**Status:** Milestones 1–6 complete: foundation, authentication and profiles, business verification, supplier directory, weather and crop guides, AI farming assistant.

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
npm run db:seed                   # districts, chiefdoms, crops, draft crop guides; sample suppliers in dev
npm run dev                       # http://localhost:3000
```

After a schema change (`npm run db:migrate`), restart `npm run dev`: in development the database client is kept in memory between reloads.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on port 3000 |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm test` | Vitest unit and integration tests (uses `TEST_DATABASE_URL`) |
| `npm run test:e2e` | Playwright browser tests: builds and starts a production server on port 3100 against the test database |
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

## Supplier directory (Milestone 4)

- `/suppliers` is public: search by keyword, category and district. A signed-in farmer starts on their own district.
- Only **active** listings from **approved** suppliers are ever shown. Sponsored listings come first and are always labelled.
- Each listing has Call (`tel:`) and WhatsApp (`wa.me`) buttons: plain links that work without JavaScript.
- Approved suppliers manage listings at `/business/listings`: create, edit, turn off/on, up to 3 photos (JPG/PNG, 2 MB).
  Only suppliers verified with an agrochemical dealer licence can list agrochemicals.
- Prices are stored in minor units (SLE 1 = 100), parsed and formatted in `lib/money.ts`.
- Admins moderate at `/admin/listings`: hide/restore and mark Sponsored, each written to `AuditLog`.
- Photos go to public media storage (`.data/media` locally), are served at `/media/...`, and are resized and served as WebP by `next/image`.
- Sample suppliers (`prisma/seed-samples.ts`) use made-up businesses on `+23279900xxx` numbers and are never seeded in production.

**3G check:** `tests/e2e/suppliers.spec.ts` loads the directory on a throttled connection (300 ms latency, 750 kbps)
with the CPU slowed 4×. It fails if the page takes over 5 s to become usable or ships over 300 KB of JavaScript.
Last run: usable in about 1.1 s, loaded in about 2.4 s, 136 KB of JavaScript.

## Weather and crop guides (Milestone 5)

**Weather** (`/weather?district=<slug>`, public; a signed-in farmer goes to their own district):

- 7-day forecast from Open-Meteo (free, no key) through the `WeatherProvider` adapter (`lib/adapters/weather`).
  Set `WEATHER_PROVIDER=mock` to work offline; tests always use the mock.
- Cached per district for 3 hours in `WeatherCache`. If Open-Meteo is down, the last forecast is shown marked as out of date.
- Farming tips come from rules in `config/weather-tips.ts`: heavy rain ≥ 20 mm/day, dry spell ≥ 5 days under 1 mm, heat ≥ 35 °C.
  The wording is in `locales/en.json` (`weather.tip_*`).

**Crop guides** (`/guides`, public; editor at `/admin/guides` for admins and agronomists):

- 8 sections per crop. Farmers only see **published** sections; each shows "Reviewed by [name], [date]".
- Saving a section clears its review and unpublishes it until someone publishes it again with **Mark reviewed and publish**.
  Every edit, review and unpublish is written to `AuditLog`.
- `prisma/data/guides.ts` holds **draft starter text** for all 9 priority crops (72 sections). It was not written by an
  agronomist. The seed only adds sections that don't exist yet, so it never overwrites edits.
  - Production: drafts are added **unpublished**. Farmers see nothing until an agronomist reviews each section.
  - Development: drafts are shown, with a warning on every section: "Sample text… not yet reviewed".

**Offline** (`public/sw.js`, production builds only):

- Guides and weather pages are saved to the phone when opened, and shown from the saved copy when there's no connection.
- Pages never opened before show a saved offline page. Private pages (`/farmer`, `/business`, `/admin`, `/login`) are never saved.
- A banner shows while the phone is offline. Bump `VERSION` in `sw.js` when its caching rules change.

## AI farming assistant (Milestone 6)

Farmers ask questions at `/farmer/assistant`. Reviewers see flagged answers at `/admin/ai` (admins and agronomists).

- **Model:** Claude through the `AiProvider` adapter (`lib/adapters/ai`). `AI_PROVIDER=mock` (default) needs no key;
  `AI_PROVIDER=anthropic` + `ANTHROPIC_API_KEY` calls `AI_MODEL` (default `claude-haiku-5-5`) with low effort and a cached system prompt.
- **Grounding:** `lib/ai/retrieval.ts` picks up to 3 matching sections from **reviewed, published** guides and sends them
  as numbered excerpts. The model cites them as [1], [2]; the page links each source to its guide section.
  `AI_INCLUDE_SAMPLE_GUIDES=true` also uses unreviewed sample text (development only).
- **Instructions:** `lib/ai/prompt.ts`: simple language, practical steps, Sierra Leone seasons, under 150 words,
  extension officer for serious outbreaks and chemical use, no doses for agrochemicals.
- **Safety rule** (`lib/ai/safety.ts`), enforced in code as well as in the prompt:
  - A question asking for a dose of a hazardous pesticide (paraquat/Gramoxone, carbofuran/Furadan, endosulfan, …)
    gets a fixed safe reply. The model is never called.
  - A model answer that names a hazardous pesticide **and** states a quantity is replaced with the safe reply and flagged.
  - The pesticide list should be reviewed by an agronomist.
- **Limits:** 20 questions per farmer per day (`AI_DAILY_LIMIT`), 5 per minute. Failed calls aren't counted.
- **Feedback:** 👍/👎 and "Report a problem" on every answer.
- **Review queue:** farmer reports, safety replacements, refusals, and answers with no reviewed guide behind them
  ("low confidence") go to the queue. A reviewer can add a correction, which the farmer sees under the answer;
  every review is written to `AuditLog`.
- **Storage:** conversations are saved for quality review, and the chat page says so.

## Design: one website that works like an app

The look follows the Kortech design canvas: deep farm green (`#146B3A`), sun-yellow accent (`#F2B33D`),
Bricolage Grotesque headings and Figtree text (self-hosted by `next/font`), and stroke icons (`components/icons.tsx`).
Colours are tokens in `app/globals.css` (`bg-brand`, `bg-sun-soft`, `text-muted`…).

- **Responsive website:** wide screens get the top menu and multi-column pages. Pages opt into a wide column with
  `className="wide"`, or full width with `className="bleed"` (see `app/layout.tsx`).
- **Phone app (PWA):** on phones, farmers get a bottom tab bar (Home, Guides, Ask, Suppliers, Weather). From the browser
  menu, "Add to home screen" installs it with the Kortech icon, full-screen display and shortcuts to Ask, Weather and Guides
  (`app/manifest.ts`). Guides and the last forecast still work offline.
- **Home page:** farmers sign in straight from the hero card; signed-in users go straight to their dashboard.

## Known gaps

- Chiefdoms are a starter sample (3 per district), not the full official list of ~190. Complete them from the Statistics Sierra Leone list before launch.
- Only local-disk storage exists. Production needs S3/R2 implementations for both private documents and public media before launch.
- The mock SMS provider refuses to start in production. A real SMS provider is Milestone 8.
- Old rate-limit rows are not cleaned up automatically yet; `pruneRateLimitHits()` exists for a scheduled job.
- The client IP for rate limiting is read from `x-forwarded-for`. That is safe behind Vercel (which sets it), but other hosts must be checked so clients can't spoof it.
- The crop guide drafts must be reviewed by an agronomist before launch (PRD 14).
- The Western Area has no chiefdoms; its rural districts and Freetown areas are stored in the chiefdom table instead.
