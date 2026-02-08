# DriveTuning Agent Guide

This repo is a Next.js 14 + Prisma app for **DriveTuning**: a **Build Passport** for Germany/EU tuning projects where *history = trust = value*.

## Product North Star (do not drift)

DriveTuning is **not** a social network. It is a **system of record** for a build:
- Every modification/service/legal step is backed by **evidence** (docs, photos, timeline).
- The output is a single **Build Passport** page (`/build/[slug]`) that can be **private**, **link-shared**, or **public**.
- **Privacy-by-default**: the owner controls what is visible and to whom; GDPR-friendly choices matter as much as features.

If a change makes the product feel like a feed-first platform, push back and propose an alternative.

## Domain Model (current codebase)

The current implementation maps the Build Passport roughly to these Prisma models:
- `Car` = the build/project (what the passport represents today; UI is currently `app/cars/[id]`).
- `LogEntry` = timeline events (mod/service/track/etc).
- `Modification` = parts installed/removed and their TÜV/ABE state; usually attached to a `LogEntry`.
- `Document` = evidence (ABE, Eintragung, receipts, etc), linked to `Car` and/or `Modification`.
- `PartListing` = marketplace listings; can be linked to a `Modification`.
- `ShareLink` = token-based access sharing for `Car` or `PartListing`.
- `UserPrivacySettings` = user-level defaults (e.g. default car visibility, auto-blur preferences).

When building new features, keep the **evidence chain** intact:
- A user action should create/modify a `LogEntry` and attach `Document`/media whenever available.
- Marketplace listings should reference provenance (`Modification`, related docs, mileage).

## Privacy Model (target behavior)

Target visibility levels for *each element* of a passport:
- `NONE`: visible to nobody (even via link)
- `SELF`: only the owner
- `LINK`: anyone with a valid share link token
- `PUBLIC`: discoverable / publicly visible

Important: the existing UI uses `Car.visibility` with `PUBLIC | UNLISTED | PRIVATE`.
- Treat `UNLISTED` as the current approximation of `LINK`.
- Treat `PRIVATE` as the current approximation of `SELF`.
- Do not silently change semantics in a way that would expose private data.

If you introduce element-level visibility (log entries, documents, listings), add safe defaults:
- Default to `SELF` (or tighter) unless explicitly shared.

## Build Passport Route Plan

Target canonical route: `/build/[slug]`
- Today, the app uses `/cars/[id]`.
- If you add `/build/[slug]`, implement it as an alias to the same underlying data and apply the same auth/privacy checks.

Slug rules:
- Must be stable and unique.
- Must not leak personal data by default (no real names unless explicitly allowed).

## Prisma / Database Workflow (very important)

There are **two Prisma schemas**:
- `prisma/schema.prisma` (SQLite; local/dev convenience)
- `prisma/schema.postgres.prisma` (Postgres/Neon; production)

Rules:
- Keep both schemas logically in sync unless you have a strong reason not to.
- The repo uses `PRISMA_SCHEMA` to select the schema.

Commands:
```powershell
# Generate Prisma client for Postgres schema
$env:PRISMA_SCHEMA="prisma/schema.postgres.prisma"; npm run prisma:generate

# Push schema to a Postgres DB (Neon) when appropriate
$env:PRISMA_SCHEMA="prisma/schema.postgres.prisma"; npx prisma db push --schema prisma/schema.postgres.prisma
```

Notes:
- The repo currently relies on `prisma db push` for Postgres initialization (see `DEPLOYMENT_CHECKLIST.md`).
- Prefer backwards-compatible schema evolutions: add nullable fields and defaults; avoid breaking changes unless the feature requires it and you update all call sites.

## API and Auth Expectations

- API routes live in `app/api/**/route.ts` (Next.js App Router).
- Access control: never allow cross-user reads/writes unless the resource is explicitly `PUBLIC` or accessed via a valid `ShareLink`.
- For link access, validate: token exists, not revoked, not expired, scope matches (car vs listing), and requested visibility allows the operation.

If you add a "consent/view log" feature:
- Log views in a dedicated table keyed by `ShareLink` and target object.
- Do not store raw IPs; store a salted hash if needed.

## Engineering Style in This Repo

- Prefer server-side data fetching (Server Components) for read paths.
- Keep UI fast: add loading states for network calls and avoid waterfalls.
- Keep types tight: avoid unbounded string enums for critical states (TÜV status, log entry type, listing status) unless the UI is still exploratory.

## Definition of Done for Changes

- `npm run lint` passes.
- `npm run build` passes.
- Prisma client regenerates for the schema you changed.
- No privacy regressions (verify with at least one private and one unlisted build).

