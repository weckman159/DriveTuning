# DriveTuning Roadmap (DE/EU) - 2026

Date: 2026-02-09

Goal: DriveTuning is a system of record for a build ("Build Passport"). Germany/EU focus: legality + evidence + privacy-by-default.

Monetization: implementable, but keep disabled for ~12 months (no public checkout paths; guard both UI and API).

## 0) Snapshot: What Is Already In The Repo

Core product:
- Garage, cars, timeline, documents, tasks: `app/garage`, `app/cars/[id]`, `app/api/cars/**`.
- Build Passport view: `app/build/[slug]/page.tsx`.
- Share links (token) + view log: `app/api/cars/[id]/share-links/route.ts`, Prisma `ShareLink` + `ShareLinkView`.
- Privacy enforcement on Build Passport:
  - Car visibility: `PUBLIC | UNLISTED | PRIVATE` (owner / token / public rules).
  - Element visibility: `NONE | SELF | LINK | PUBLIC` for documents + log entries.

GDPR-friendly analytics for token views:
- Consent cookie API: `app/api/consent/analytics/route.ts` sets `dt_analytics_consent`.
- Opt-out: `/build/[slug]?no_track=1` supported in `app/build/[slug]/page.tsx`.
- Viewer hashing: `lib/viewer-hash.ts` (salted; disabled if `VIEWER_HASH_SALT` is missing).
- Retention: `SHARE_LINK_VIEW_RETENTION_DAYS` cleanup is applied on view writes in `app/build/[slug]/page.tsx` (still add a cron job later).

Legality system (baseline + integration points):
- DB models: `prisma/schema.postgres.prisma` + `prisma/schema.prisma` contain `LegalityReference`, `LegalityContribution`, legality fields on `Modification` and `PartListing`.
- Validator: `lib/legality/validator.ts` (maps TÜV status to legality; merges violations; writes snapshot flags).
- API:
  - Check: `GET app/api/legality/check/route.ts`
  - Contribute: `POST app/api/legality/contribute/route.ts`
  - Regional rules: `GET app/api/legality/regional-rules/route.ts`
  - KBA ABE status (admin): `app/api/admin/kba-abe/status/route.ts`
- Marketplace legality:
  - Filters and badge usage: `app/market/page.tsx`, `app/market/[id]/page.tsx`
  - Server filter: `app/api/market/listings/route.ts`
- Mobile (web) quick check:
  - Page: `app/mobile/legality-check/page.tsx`
  - UI: `components/MobileLegalityCheck.tsx`

Reference data scaffolding:
- DE legality reference scaffold: `data/reference/tuning-legality-de.json` + dictionary route `app/api/dictionary/tuning-legality/route.ts`
- DE manufacturers scaffold: `data/reference/tuning-manufacturers.json` + dictionary route `app/api/dictionary/tuning-manufacturers/route.ts`
- Legal framework reference: `data/reference/german-legal-framework.json` + helper `lib/legality/legal-references.ts`
- Regional legality scaffold: `data/reference/germany-regional-legality.json`
- CI workflow for reference data validation: `.github/workflows/reference-data.yml`

## 1) Known Gaps (High Confidence)

Security / legal risk:
- Auth is still password-based (NextAuth Credentials): `lib/auth.ts`.
- Rate limiting exists, but is not consistently applied on all sensitive endpoints (especially login / NextAuth callbacks).
- Privacy audit should be expanded beyond `/build/[slug]`:
  - documents endpoints,
  - events visibility,
  - marketplace visibility and link sharing.

Data quality / legality:
- Reference data files include "verified-*.json" placeholders; they must be treated as demo until backed by primary sources.
- Automated data ingestion should be ToS-safe:
  - OK: KBA public CSV download/import
  - NOT OK without explicit permission/license: scraping closed TÜV/DEKRA databases

Product / UX:
- Car make/model reference UX (fuzzy search / normalization) is not yet the default add-car flow.
- Mobile "at car meets" experience exists for legality check, but build page + evidence upload flows need mobile-first polish.

Engineering:
- No test runner is set up for unit/integration tests (only docs checklist exists): `docs/TESTING.md`.
- Monitoring exists as docs + Vercel Speed Insights; Sentry is not integrated: `docs/MONITORING.md`.

Monetization safeguards:
- Commerce must be guarded on API side, not only hidden in UI. Ensure all commerce endpoints are hard-disabled when flags are off.

## 2) Unified Backlog (Single Task List)

Legend:
- P0: must-do (security/privacy/data loss)
- P1: next (core product value)
- P2: nice-to-have (scale/comfort)
- (DE/EU): region-specific
- (Tech) vs (Product)
- (Flagged): implement behind flags, not enabled

### P0 - Security, Privacy, DE/EU Compliance
1. P0 (Tech, DE/EU) Replace password auth
   - Options: NextAuth EmailProvider (magic links) or IdP (Clerk/Auth0).
   - Deliverable: no password storage in `User.password`.
   - Files: `lib/auth.ts`, `app/auth/**`, `app/api/auth/**`, `middleware.ts`.

2. P0 (Tech) Rate limiting hardening
   - Apply rate limiting to high-risk endpoints:
     - `/api/auth/[...nextauth]` sign-in attempt controls (if possible) or wrap login in custom endpoint.
     - `/api/market/**` create message/offer/listing/order (verify coverage).
     - `/api/legality/contribute` and any admin routes.
   - Acceptance: repeat requests hit `429` with `Retry-After`.
   - Files: `lib/rate-limit.ts`, `prisma/*ApiRateLimit*`, affected routes.

3. P0 (Tech, DE/EU) Privacy audit: "no cross-user reads without token/public"
   - Verify every read/write path checks owner or share link token and respects visibility.
   - Minimum scope:
     - `/api/cars/[id]/**`, `/api/modifications/**`, `/api/events/**`, `/api/market/**`.
   - Deliverable: a checklist doc + at least 5 regression tests (or manual scripts).

4. P0 (Tech, DE/EU) ShareLinkView retention job (cron)
   - Current cleanup is "on view write" only. Add daily cleanup via cron endpoint.
   - Env: `SHARE_LINK_VIEW_RETENTION_DAYS`, `CRON_SECRET`.
   - Files: new `app/api/admin/cleanup/share-link-views/route.ts` or similar + Vercel Cron config.

5. P0 (Tech) Marketplace commerce hard-disable (Flagged)
   - Guarantee: if `MARKET_COMMERCE_ENABLED != true`, all commerce endpoints return `404` or `403` (not only UI hiding).
   - Files: `lib/feature-flags.ts`, `app/api/market/**`, `app/api/webhooks/**`.

### P1 - Legality As A "Trust Engine" (DE/EU)
6. P1 (Product, DE/EU) Reference data policy: "no approval numbers without primary source"
   - Define a lightweight policy in docs:
     - store `sourceUrl` + (optional) `documentUrl`
     - do not claim "verified" unless linked to a primary PDF/HTML page
   - Files: `docs/REFERENCE_TUNING_LEGALITY_DE.md` (extend).

7. P1 (Tech, DE/EU) KBA ABE pipeline (ToS-safe)
   - Monthly download/import: `ref:kba-abe:import` + `ref:kba-abe:upsert`.
   - Add operator docs + admin status UI entry.
   - Files: `scripts/import-kba-abe.cjs`, `scripts/upsert-kba-abe-raw-to-db.cjs`, `app/api/admin/kba-abe/status/route.ts`.

8. P1 (Product) Modification UX: legality-first evidence capture
   - On add/edit modification:
     - legality check suggestions
     - "attach ABE/Teilegutachten/Eintragung" CTA
     - show next steps based on legality + TÜV state
   - Files: `components/NewEntryForm.tsx`, `app/cars/[id]/page.tsx`, `/api/modifications/[id]/approvals`.

9. P1 (Product, DE/EU) Regional rules: make them useful and honest
   - Keep `germany-regional-legality.json` as "guidance" with sources and enforcement level labels.
   - Ensure validator treats regional rules as warnings unless a primary legal basis is cited.

10. P1 (Product) Build Passport export includes legality summary + attached docs
   - Already partially present in PDF export; add consistency between PDF + CSV export.
   - Files: `app/api/cars/[id]/export/pdf/route.ts`, `app/api/cars/[id]/export/legality/route.ts`.

### P1 - Mobile Experience (First 6 Months)
11. P1 (Product) Mobile-first Build Passport polish
   - Tap targets, document viewing, timeline readability, skeletons.
   - Files: `app/build/[slug]/page.tsx`, shared UI components.

12. P1 (Tech) PWA baseline (offline read)
   - Installable PWA for view paths (garage + build passport read).
   - Do not start offline write queue until P0/P1 stability is done.

### P2 - Scale, Observability, Testing
13. P2 (Tech) Tests
   - Add test runner (Vitest or Jest) and start with:
     - `lib/legality/validator.ts`
     - `lib/rate-limit.ts`
     - share-link visibility rules
   - Update `docs/TESTING.md` to match reality (no hard-coded prod URLs).

14. P2 (Tech) Error tracking (Sentry)
   - Capture API route failures and client errors.
   - Update `docs/MONITORING.md`.

15. P2 (Tech) Local dev parity with Postgres
   - Add `docker-compose.yml` with Postgres for local use, and make it easy to switch `PRISMA_SCHEMA`.

### Deferred / "Prepare but Do Not Enable" (Monetization)
16. P2 (Flagged) Stripe Connect onboarding + verification gates
   - Keep endpoints implemented, but no UI entry points and hard-disabled unless flags enabled.

17. P2 (Flagged) Escrow flows and billing tiers
   - Design + schemas behind feature flags only.

## 3) Roadmap (12 Months) - Realistic Sequencing

### Months 1-3: Stabilization + Compliance + Legality Baseline
- Deliver P0 items (auth, rate limiting, privacy audit, share view retention cron, commerce hard-disable).
- Make legality reference policy + KBA pipeline operational.
- Ensure modification UX captures evidence.

Success criteria:
- No privacy regressions in token sharing.
- Legality check usable with sources for the first set of parts.
- All sensitive endpoints rate-limited.

### Months 4-6: Mobile + Legality Growth
- Mobile Build Passport polish.
- PWA read-only baseline.
- Improve regional rules display and "what next" guidance.

Success criteria:
- Build Passport is easy to read on phones.
- PWA can be installed and viewed offline (read-only).

### Months 7-9: Quality + Ecosystem (still free)
- Tests + monitoring.
- Optional: crowdsourcing contributions moderation improvements.
- Optional: installers directory design spike (do not expand scope into "social").

### Months 10-12: Prepare Monetization (Flagged, still disabled)
- Harden commerce gating, add dashboards, make Stripe flows ready behind flags.
- Only enable after product-market fit and legal review.

