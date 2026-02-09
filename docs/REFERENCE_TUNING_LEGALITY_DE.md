# Tuning Legality Reference (DE)

This repo includes a curated reference dictionary for German tuning legality signals (ABE/ABG/Teilegutachten/ECE/§21).

Goal: help users record the correct evidence on `Modification` (and attach documents), not to "auto-legalize" a car.

## Data File

- Reference JSON: `data/reference/tuning-legality-de.json`
- Legal framework links (non-binding): `data/reference/german-legal-framework.json`
- Regional overview (states metadata, best-effort): `data/reference/germany-regional-legality.json`
- Manufacturers directory (best-effort, non-legal): `data/reference/tuning-manufacturers.json`
- Optional DB seed (demo, UNVERIFIED by default): `data/reference/legality-reference-seed.json`
- API for search/suggestions: `GET /api/dictionary/tuning-legality`
  - Params: `q`, `categoryId`, `subcategoryId`, `approvalNumber`, `limit`
- Validator: `npm run ref:tuning-legality:validate`

Optional automation helpers (no scraping of restricted sites):
- KBA CSV import (disabled by default): `npm run ref:kba-abe:import`
  - Requires `KBA_ABE_CSV_URL` to be set to a verified public CSV URL.
- KBA raw -> DB upsert (local only): `npm run ref:kba-abe:upsert`
  - Reads `data/reference/kba-abe-raw.json` and upserts into `LegalityReference` (`sourceId=kba`, `isSynthetic=false`).
  - Default limit: 2000 rows. Override with `KBA_DB_UPSERT_LIMIT`.
- Import DB seed (UNVERIFIED demo): `npm run ref:legality-seed:import`
  - Imports into `LegalityReference` with `isSynthetic=true`.
- Import candidate "verified approvals" packs (treated as UNVERIFIED until audit): `npm run ref:verified-approvals:import`
  - Reads `data/reference/verified-*-approvals.json` and upserts into `LegalityReference` (`sourceId=candidate`, `isSynthetic=true`).

## Source Policy (important)

We are conservative on licensing and ToS.

- Prefer: manufacturer-published pages and PDFs that explicitly provide approvals/certificates.
- Prefer: official law texts (for definitions and section references).
- Avoid: scraping TÜV/DEKRA databases or commercial aggregators without explicit permission.
- Do not rehost copyrighted PDFs by default. Store URLs + metadata; users upload their own evidence into DriveTuning.

## What Counts As "Reference Data"

This reference is designed to support:

- "What document type is this?" (ABE vs ABG vs Teilegutachten vs ECE vs §21)
- "What must the user do next?" (carry doc, inspection, registration)
- "What parameters are critical?" (ET, wheel load, ground clearance, noise, etc.)

It is not designed to be a complete national parts registry.

## JSON Structure (high level)

- `sources[]`: list of source identifiers (`id`) that items can reference via `sourceId`.
- `approvalTypeDefinitions`: key-value map that defines each approval type.
- `approvalNumberPatterns[]`: regex patterns that help recognize approval numbers in text.
- `criticalRules[]`: cross-cutting rules (combination effects, §19 context, etc.).
- `categories[] -> subcategories[] -> items[]`: concrete part entries.

Each `items[]` entry should include:

- `brand`, `model`
- `approvalType` and optional `approvalNumber`
- `sourceId` plus `sourceUrl` (primary evidence link)
- optional `vehicleCompatibility`, `restrictions[]`, and `notesDe`/`notesEn`

## How To Add New Items

1. Find a primary source page or PDF where the manufacturer (or an official body) publishes the certificate.
2. Add a `source` entry if needed (or reuse `manufacturer` / an existing manufacturer `sourceId`).
3. Add an item under the correct `category/subcategory`:
   - Keep `approvalNumber` empty unless it is explicitly visible in the source.
   - Put all actionable constraints into `restrictions[]`.
4. Run:
   - `npm run ref:tuning-legality:validate`
   - `npm run build` (quick sanity)

## Notes For Product Integration

When integrating into `Modification`:

- Store user-provided `ApprovalDocument` as the ground truth evidence (PDF/photo/receipt).
- Use this reference dictionary only to:
  - suggest which approval type likely applies
  - warn about common missing parameters
  - show checklists ("carry ABG printout", "vehicle list must match", "§21 likely needed for combinations")

Legal section references:

- `Violation.legalReferences[]` are added on the server as best-effort pointers to official law texts.
- They are intentionally generic (topic/context), because section titles and applicability can vary by vehicle and inspection context.
