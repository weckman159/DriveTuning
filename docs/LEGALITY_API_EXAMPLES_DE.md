# Legality API Examples (DE)

This doc contains practical request examples for the legality helper endpoints.

Important: results are hints based on reference data + user-provided parameters/evidence. They do not replace inspection by TUEV/DEKRA/GTUE.

## 1) Basic query by brand + part name

`GET /api/legality/check?brand=BBS&partName=CH-R&category=WHEELS`

Use when you only know the part and want suggestions + "what next" steps.

## 2) Query by approval number (KBA / TUEV / DEKRA)

If you have a number on the document or the part, query by it:

`GET /api/legality/check?brand=BBS&partName=CH-R&category=WHEELS&approvalNumber=KBA%2043234`

Tip: digits-only works too (treated as KBA digits):

`GET /api/legality/check?brand=BBS&partName=CH-R&category=WHEELS&approvalNumber=43234`

## 3) Wheels scenario: ET out of range + track change

`GET /api/legality/check?brand=BBS&partName=CH-R%209Jx19&category=WHEELS&approvalNumber=KBA%2043234&et=25&trackWidthChange=25&clearanceLoaded=105`

Expected:
- `violations[]` includes `track_width` (warning)
- `legalityStatus` remains `FULLY_LEGAL` or `REGISTRATION_REQUIRED` depending on reference match, but critical violations force `ILLEGAL`

## 4) Suspension scenario: minimum ground clearance

`GET /api/legality/check?brand=KW%20Automotive&partName=Variant%203&category=SUSPENSION&clearanceLoaded=90`

Expected:
- `violations[]` includes `min_clearance` (critical)
- `legalityStatus` becomes `ILLEGAL`

## 5) Exhaust scenario: noise limit + regional risk rules

Example with a stricter region warning/critical rule (depends on `data/reference/germany-regional-rules.json`):

`GET /api/legality/check?brand=Milltek&partName=Cat-back&category=EXHAUST&noiseLevelDb=96&stateId=BW`

Expected:
- `warnings[]` includes `[BW] ...` regional rule messages
- critical regional rules force `legalityStatus=ILLEGAL`

## 6) Where results come from

Response fields:
- `bestMatch` / `suggestions`: from `data/reference/tuning-legality-de.json` (curated dictionary)
- `dbMatches`: from `LegalityReference` (KBA imports, candidate packs, community-approved refs)
- `communityProofs`: from `LegalityContribution` where `status=APPROVED`

