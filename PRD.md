# SmartFarm Sierra Leone — Product Requirements Document (PRD)

**Version:** 0.1 (MVP draft)
**Owner:** Martha Kabba
**Status:** Draft — for build with Claude Code
**Last updated:** 29 October 2026

---

## 1. How to use this document with Claude Code

1. Put this file at the root of the repo as `PRD.md`.
2. Build **one milestone at a time** (Section 12). Start each session with a prompt like:
   > "Read PRD.md. Implement Milestone 2 only. Follow the conventions in Section 11. Write tests for every acceptance criterion in that milestone. Stop and ask me if anything in the PRD is ambiguous."
3. After each milestone: run the tests, review the diff, commit, then move to the next.
4. Items marked **[DECISION]** are assumptions. Confirm or change them before the milestone that depends on them.

---

## 2. Product summary

SmartFarm Sierra Leone is a digital agriculture platform that gives farmers, in one place:

- Farming advice (AI-assisted, locally reviewed)
- Weather forecasts for their location
- A directory of verified suppliers (seeds, fertiliser, tools, machinery)
- A marketplace to sell produce to buyers
- Access to financial products (loans, savings) through partner lenders
- A USSD channel for farmers with basic phones

Businesses (suppliers, buyers, banks/lenders) register through the web app, get verified, and manage their own listings.

**Vision:** A trusted platform that makes farming services accessible to every farmer in Sierra Leone, whether they use a smartphone or a basic phone.

---

## 3. Goals and non-goals

### Goals (MVP)
- Farmers can register with a phone number and get useful advice and weather within 2 minutes.
- Farmers can find verified suppliers near them and contact them.
- Farmers can list produce for sale; buyers can find and contact them.
- Businesses can register, submit verification documents, and be approved by an admin.
- Admins can verify businesses, moderate listings, and review AI advice quality.
- Core features work on low-end Android phones and slow (2G/3G) connections.

### Non-goals (MVP)
- In-app payments or escrow (farmers and businesses pay each other directly; added later).
- Native iOS/Android apps (we ship a Progressive Web App first).
- Loan approval or credit scoring (SmartFarm only refers farmers to lenders).
- Logistics or delivery management.
- Full USSD coverage of all features (USSD MVP is a limited menu, Milestone 7).

---

## 4. Users and roles

| Role | Description | Main needs |
|---|---|---|
| **Farmer** | Smallholder or commercial farmer | Advice, weather, inputs, buyers, finance |
| **Supplier** | Sells seeds, fertiliser, tools, machinery | Reach farmers, manage product listings |
| **Buyer** | Trader, processor, exporter, institution | Find produce, contact farmers |
| **Lender** | Bank, microfinance institution, mobile money lender | Publish loan products, receive farmer referrals |
| **Admin** | SmartFarm staff | Verify businesses, moderate content, view analytics |
| **Agronomist reviewer** | Extension officer or expert (can be an Admin sub-role) | Review and approve advice content |

A user account has one primary role. Business accounts (Supplier, Buyer, Lender) belong to an **Organisation** that has a verification status.

---

## 5. Core user stories

### Farmer
- F1. As a farmer, I register with my phone number and a one-time code (OTP), so I don't need an email.
- F2. I set my district, chiefdom, main crops, and farm size, so advice and weather are relevant to me.
- F3. I ask a farming question in plain English (Krio later) and get a clear, practical answer.
- F4. I browse curated crop guides (planting, pests, diseases, harvesting) for my crops.
- F5. I see a 7-day weather forecast for my district, with simple farming tips (e.g., "Rain expected Thursday — delay fertiliser application").
- F6. I search suppliers by product category and district, and see only verified suppliers by default.
- F7. I contact a supplier by phone call or WhatsApp from their listing.
- F8. I create a produce listing (crop, quantity, unit, price, location, photos optional).
- F9. I browse loan products and submit an "I'm interested" request to a lender, with my consent to share my profile.
- F10. I can use the app on a slow connection, and recently viewed guides work offline.

### Business (Supplier / Buyer / Lender)
- B1. I register my organisation with business details and upload verification documents.
- B2. I see my verification status (Pending / Approved / Rejected with reason).
- B3. Once approved, I create, edit, and deactivate listings (products, buy requests, or loan products).
- B4. (Buyer) I browse produce listings by crop and district and contact farmers.
- B5. (Lender) I see farmer referral requests sent to my organisation and mark them as contacted.

### Admin
- A1. I review pending organisations, view documents, and approve or reject with a reason.
- A2. I hide or remove any listing that breaks the rules.
- A3. I create and edit crop guides and mark them as reviewed.
- A4. I see flagged AI answers (farmer-reported or low-confidence) and correct them.
- A5. I see a basic dashboard: registered farmers by district, active listings, referrals, USSD sessions.

---

## 6. Functional requirements

### 6.1 Authentication and accounts
- Phone-number login with SMS OTP. Phone numbers stored in E.164 format (`+232...`).
- OTP: 6 digits, expires in 5 minutes, max 5 attempts, rate-limited per phone number and per IP.
- Business users may also add email + password (optional).
- Role-based access control enforced on the server for every route and API.
- Users can delete their account and data (data protection requirement).

### 6.2 Farmer profile
- Fields: name, phone, district (required), chiefdom (optional), crops (multi-select), farm size (acres/hectares), preferred language.
- Districts and chiefdoms are seeded reference data, not free text.

### 6.3 Farming advice
- **Crop guides:** structured content per crop (overview, planting calendar, soil, fertiliser, pests, diseases, harvest, storage). Editable by Admin/Agronomist. Each guide shows "Reviewed by [name], [date]".
- **Priority crops for MVP [DECISION]:** rice, cassava, maize, groundnut, cocoa, oil palm, vegetables (pepper, okra, tomato).
- **AI assistant:**
  - Uses the Claude API.
  - Answers are grounded in the approved crop guides first (retrieval from our own content), then general knowledge.
  - System prompt requires: simple language, practical steps, local context (Sierra Leone seasons, common inputs), and a recommendation to consult an extension officer for serious pest/disease outbreaks or chemical use.
  - Must not give dosages for restricted or hazardous pesticides; instead refers to label and extension officer.
  - Every answer has 👍/👎 and "Report a problem". Reports go to the Admin review queue.
  - Conversations stored for quality review (with consent in the terms).
  - Per-user daily question limit **[DECISION: 20/day]** to control cost.

### 6.4 Weather
- Source **[DECISION]:** Open-Meteo API (free, no API key) for MVP; can switch provider later via an adapter interface.
- Forecast by district centroid coordinates (seeded).
- Cache forecasts per district for 3 hours to reduce calls and work on slow connections.
- Simple rule-based farming tips from forecast (heavy rain, dry spell, high heat). Rules stored in config, not hard-coded in UI.

### 6.5 Supplier directory
- Product categories: seeds, fertiliser, agrochemicals, tools, machinery, equipment hire, other.
- Listing fields: name, category, description, price (optional, in SLE), unit, district(s) served, photos, contact phone, WhatsApp number.
- Search and filter by category, district, and keyword. Verified suppliers shown first; unverified listings are not public.
- "Sponsored" flag on listings (for future paid placements), clearly labelled.

### 6.6 Produce marketplace
- Farmer produce listing: crop, quantity, unit (kg, bag, bushel, tonne), price per unit (SLE, optional "negotiable"), district, available-from date, photos.
- Buyer "buy request": crop, quantity needed, district, deadline.
- Contact via phone/WhatsApp link. No in-app chat in MVP.
- Listings auto-expire after 30 days unless renewed.

### 6.7 Finance (lender referrals)
- Lenders publish loan products: name, purpose (inputs, equipment, working capital), amount range, term, eligibility summary.
- Farmer taps "I'm interested" → consent screen listing exactly which profile fields will be shared → referral created.
- Lender sees referrals and updates status (New / Contacted / Closed).
- SmartFarm does **not** make lending decisions or display interest rates it hasn't verified.

### 6.8 Business registration and verification
- Organisation fields: legal name, type (supplier/buyer/lender), registration number, address, district, contact person, phone, email.
- Document uploads: business registration certificate, plus licence where relevant (e.g., agrochemical dealer, lender licence). PDF/JPG/PNG, max 5 MB each.
- Status flow: `DRAFT → PENDING → APPROVED | REJECTED`. Rejected orgs can fix and resubmit.
- Only APPROVED organisations can publish listings.
- Uploaded documents are private (signed URLs, admin-only access).

### 6.9 Admin console
- Verification queue, listing moderation, crop guide editor, AI answer review queue, user management, basic analytics dashboard.
- All admin actions written to an audit log (who, what, when).

### 6.10 USSD (Milestone 7)
- Provider **[DECISION]:** to be selected; integration must sit behind a `UssdProvider` adapter. Shortcode requires agreement with a mobile network operator or aggregator — business task, not code.
- MVP menu (max 4 levels deep, each screen ≤ 160 characters):
  1. Weather (for registered district)
  2. Crop tips (short tips per crop)
  3. Find supplier (category → district → top 3 results sent by SMS)
  4. Sell produce (crop → quantity → price → creates listing)
  5. My account (register / change district)
- Sessions handled statelessly from the provider's request text, with a short-lived session store.
- Respond within the provider's timeout (target < 2 seconds).

### 6.11 Notifications
- SMS for OTP, USSD results, and key events (verification approved, new referral for lenders).
- SMS sending behind a `SmsProvider` adapter.

---

## 7. Non-functional requirements

- **Performance on low-end devices:** First load < 300 KB of JavaScript (gzipped) on core farmer pages. Images compressed and lazy-loaded.
- **Slow networks:** Works on 3G; key pages usable on 2G. Pages render server-side.
- **Offline:** PWA with service worker; cache crop guides and the last weather forecast.
- **Security:**
  - Input validation on every API (schema validation).
  - Rate limiting on auth, AI, and USSD endpoints.
  - Secrets only in environment variables, never committed.
  - Private file storage for verification documents.
  - OWASP Top 10 basics (CSRF protection, output escaping, parameterised queries via ORM).
- **Privacy:** Clear consent for data sharing with lenders. Minimal personal data. Account deletion supported. Comply with Sierra Leone data protection requirements **[DECISION: legal review before launch]**.
- **Accessibility:** Large tap targets, high contrast, simple wording, icons alongside text.
- **Localisation:** All UI strings in translation files from day one (English first; Krio next).
- **Currency:** Leones (SLE), stored as integer minor units.
- **Observability:** Structured logging and error tracking.

---

## 8. Recommended tech stack [DECISION]

| Layer | Choice | Why |
|---|---|---|
| App framework | Next.js (App Router) + TypeScript | One codebase for farmer app, business portal, admin, and API |
| UI | Tailwind CSS + shadcn/ui | Fast, consistent, accessible components |
| Database | PostgreSQL | Relational data, reliable, widely hosted |
| ORM | Prisma | Type-safe queries, migrations |
| Auth | Custom phone OTP (or Auth.js with credentials provider) | Phone-first users |
| Validation | Zod | Shared schemas for forms and APIs |
| AI | Anthropic Claude API | Farming assistant |
| Weather | Open-Meteo | Free, no key |
| File storage | S3-compatible storage (e.g., Cloudflare R2) | Private documents, photos |
| SMS / USSD | Provider adapters (provider TBD) | Swap providers without code changes |
| Testing | Vitest (unit), Playwright (end-to-end) | Standard, fast |
| Hosting | Vercel or Railway (app) + managed Postgres | Simple deploys |

**Why a PWA instead of native apps first:** one codebase, no app store approval, installs from the browser, smaller to download, and works offline. Native apps can come later if usage justifies it.

---

## 9. Data model (initial)

```
User            id, phone (unique), name, role, language, createdAt, deletedAt
FarmerProfile   userId, districtId, chiefdomId?, farmSize, farmSizeUnit, crops[]
Organisation    id, type (SUPPLIER|BUYER|LENDER), legalName, regNumber, districtId,
                contactName, phone, email, status (DRAFT|PENDING|APPROVED|REJECTED),
                rejectionReason?, verifiedAt?, verifiedBy?
OrgMember       orgId, userId, role (OWNER|STAFF)
OrgDocument     id, orgId, type, fileKey, uploadedAt
District        id, name, latitude, longitude
Chiefdom        id, districtId, name
Crop            id, name, slug
CropGuide       id, cropId, section, content, reviewedBy?, reviewedAt?, published
SupplierListing id, orgId, category, title, description, priceMinor?, unit?,
                districtIds[], photos[], isSponsored, status, createdAt
ProduceListing  id, farmerId, cropId, quantity, unit, priceMinor?, negotiable,
                districtId, availableFrom, photos[], status, expiresAt
BuyRequest      id, orgId, cropId, quantity, unit, districtId, deadline, status
LoanProduct     id, orgId, name, purpose, minAmountMinor, maxAmountMinor,
                termMonths, eligibility, status
Referral        id, farmerId, loanProductId, consentSnapshot (JSON), status, createdAt
AiConversation  id, userId, createdAt
AiMessage       id, conversationId, role, content, rating?, flagged, createdAt
WeatherCache    districtId, forecast (JSON), fetchedAt
UssdSession     sessionId, phone, state (JSON), expiresAt
AuditLog        id, actorId, action, entity, entityId, metadata (JSON), createdAt
OtpCode         phone, codeHash, expiresAt, attempts
```

Notes:
- Hash OTP codes; never store them in plain text.
- Soft-delete users; hard-delete personal data on account deletion request.
- Index listings on (category, districtId, status) and (cropId, districtId, status).

---

## 10. Monetisation hooks (build the structure, not the billing)

- `isSponsored` on listings (sponsored placements).
- `Organisation.plan` field (FREE | PRO) reserved for future subscriptions.
- Referral records support future lender referral fees (count and status per lender).
- Analytics on farmer counts by district support development-partner reporting.
- Farmer features remain free.

---

## 11. Conventions for Claude Code

- TypeScript strict mode. No `any` unless justified in a comment.
- Folder structure:
  ```
  /app            routes (farmer, business, admin, api)
  /components     UI components
  /lib            domain logic, adapters (weather, sms, ussd, ai)
  /lib/adapters   provider interfaces + implementations
  /prisma         schema, migrations, seed
  /locales        translation files
  /tests          unit and e2e tests
  ```
- Business logic lives in `/lib`, not in UI components or route handlers.
- External services always behind an interface in `/lib/adapters` with a mock implementation for tests and local dev.
- Every API route: Zod validation → auth/role check → service call → typed response.
- Every milestone ships with tests for its acceptance criteria.
- Seed script with realistic sample data (all 16 districts, sample suppliers, guides).
- `.env.example` kept up to date; no secrets in the repo.
- Small, focused commits per feature.

---

## 12. Milestones and acceptance criteria

### Milestone 1 — Project foundation
- Next.js + TypeScript + Tailwind + Prisma + Postgres set up.
- Base layout, translation system, PWA manifest, error tracking hook.
- Seed districts (with coordinates), chiefdoms, crops.
- **Done when:** app runs locally, `npm test` passes, seed loads, lint and type-check pass.

### Milestone 2 — Authentication and profiles
- Phone OTP login (mock SMS provider logs the code locally).
- Farmer onboarding (district, crops, farm size).
- Role-based route protection.
- **Done when:** a new farmer can sign up and reach the dashboard; OTP expiry, attempt limit, and rate limit are tested; a farmer cannot open admin or business routes.

### Milestone 3 — Business registration and admin verification
- Organisation registration, document upload (private storage), status flow.
- Admin verification queue with approve/reject + reason, audit log.
- **Done when:** a supplier can register and upload documents; admin approves; only approved orgs can create listings; documents are not publicly accessible.

### Milestone 4 — Supplier directory
- Supplier listings CRUD, search/filter by category, district, keyword.
- Contact via phone/WhatsApp links.
- **Done when:** farmers see only approved, active listings; filters work; listing pages load fast on throttled 3G in tests.

### Milestone 5 — Weather and crop guides
- Open-Meteo adapter with caching; district forecast page with farming tips.
- Crop guide pages and admin editor with review status.
- Offline caching of guides and last forecast.
- **Done when:** forecast shows for the farmer's district; cache prevents repeat calls within 3 hours; guides open offline after first visit.

### Milestone 6 — AI farming assistant
- Chat UI, Claude API adapter, retrieval from published crop guides.
- Ratings, reporting, admin review queue, daily limit.
- **Done when:** answers cite relevant guide sections when available; hazardous-chemical safety rule is tested; limits enforced; flagged answers appear in admin queue.

### Milestone 7 — Produce marketplace and lender referrals
- Produce listings, buy requests, auto-expiry.
- Loan products, consent screen, referrals, lender referral dashboard.
- **Done when:** farmer can list produce and buyer can find it; referral captures a consent snapshot; lenders see only their own referrals.

### Milestone 8 — USSD and SMS
- `UssdProvider` and `SmsProvider` adapters with mock implementations.
- USSD menu from Section 6.10, session store, SMS results.
- **Done when:** the full USSD menu works against a local simulator script; every screen ≤ 160 characters; responses < 2 seconds in tests.

### Milestone 9 — Admin analytics and launch readiness
- Dashboard metrics, moderation tools, account deletion flow.
- Security review, performance budget check, backup plan, privacy policy and terms pages.
- **Done when:** checklist in Section 14 is complete.

---

## 13. Success metrics (first 6 months after launch)

- Registered farmers (target to set with pilot district data)
- Weekly active farmers
- AI questions per active farmer, and % of answers rated 👍
- Verified suppliers and active listings per district
- Produce listings created and buyer contacts made
- Lender referrals created and % contacted
- USSD sessions per week

---

## 14. Launch checklist

- [ ] All milestone tests passing in CI
- [ ] Rate limits on auth, AI, USSD
- [ ] Private document storage verified
- [ ] Error tracking and logging live
- [ ] Database backups scheduled
- [ ] Privacy policy, terms, and data-sharing consent reviewed
- [ ] Crop guides for priority crops reviewed by an agronomist
- [ ] SMS/USSD provider contract signed and shortcode live (if launching USSD)
- [ ] Pilot with a small group of farmers in 1–2 districts before national launch

---

## 15. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Wrong or unsafe AI advice | Ground in reviewed guides, safety rules in prompt, feedback loop, agronomist review |
| Fake or poor-quality suppliers | Document verification, admin approval, report button, ability to suspend |
| Low smartphone use and literacy | USSD channel, simple language, icons; voice/IVR as a later phase |
| USSD cost and setup time | Treat as separate business track; build behind adapter so the app launches first |
| Slow adoption by farmers | Partner with farmer groups, cooperatives, NGOs, and extension officers for onboarding |
| AI and SMS running costs | Daily limits, caching, monitor cost per active user |
| Revenue too slow from commissions | Early income from grants and development partner contracts |

---

## 16. Open questions

1. Which mobile network operator or aggregator will provide USSD and SMS?
2. Which districts are in the pilot?
3. Who are the agronomist reviewers (MAF extension officers, SLARI, NGO partners)?
4. Which lenders are first partners, and what data do they need in a referral?
5. Is Krio text needed for launch, or only after the pilot?
6. Hosting budget per month for the MVP?

---

## 17. Future phases (out of MVP scope)

- In-app payments via mobile money
- Krio, Mende, Temne language support and voice/IVR advice
- Photo-based pest and disease detection
- Price information by market and district
- Group buying for cooperatives
- Native Android app
- Logistics and transport matching
