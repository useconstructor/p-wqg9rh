# Inventario Taller

Implemented the Spanish inventory workspace with products, deduplicated categories, calculated totals, search and combined URL filters, sorting, eight item pagination, shareable product detail, immutable movement history, and accessible create/edit/movement forms. Inventory starts empty; there are no seeds or demo records.

## Focused correction (2026-10-11)

Preserved inventory APIs, schema, server validation, and Turso persistence. Mobile/tablet headers show Inventario Taller, with Movimientos below on history pages. Captions, IDs, table headers, and footer are at least 12px; meaningful controls at least 14px; inputs/selects 16px. Mobile cards and margins are compact, and tablet totals align. Invalid quantities show a clear invalid preview with current stock unchanged.

Production build and ESLint passed. The extended Chromium flow passed against isolated local SQLite with explicitly labelled QA records: create/edit, entry/exit, invalid preview, rejected overdraw with unchanged database values, search/category/low-stock/reload, history, idempotency, concurrency, discard, reduced motion, and failed saves. Responsive checks passed at 320, 390, and 820px: full titles, minimum text/input sizes, aligned tablet totals, first mobile product visible, and no inventory/history overflow. Desktop, tablet, mobile, history, and invalid-preview screenshots were reviewed. Caption/status/error palette contrast exceeds 4.5:1 on their backgrounds. The QA server and disposable database were removed after verification.

## Persistence

Set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in the server environment. Schema migrations run idempotently before database access. Credentials and the libSQL client stay in server modules. Product creation and positive initial stock movements are committed together. Entries and exits use write transactions, conditional updates, database CHECK constraints, and unique movement idempotency keys. Editing a product cannot change stock.

## Verified

- Production build with Next.js 16.4.0 and TypeScript checking enabled.
- ESLint, with no warnings or errors.
- Production dependency audit: zero vulnerabilities. Development tooling still has five transitive audit findings in the ESLint glob dependency chain; the suggested forced fix downgrades the Next.js ESLint configuration and was not applied.
- Chromium against a disposable local SQLite database through the same `@libsql/client` server code: create with initial stock, edit, entry, exit, detail and history reloads, exact saved values, normalized categories, zero stock without a fictitious movement, invalid quantities, excessive withdrawal, repeated idempotency key, and competing withdrawals.
- Rapid search and combined category/low stock filters survive reload.
- Simulated failed save retains form values. Missing database connection displays a read error and an operative retry.
- Desktop 1440 px, tablet 820 px, mobile 390 px: visual inspection and no horizontal overflow. Mobile product cards and immediate full detail view verified.
- Keyboard modal focus containment, Escape, focus restoration, unsaved change confirmation, and reduced motion checked.

## Scope of verification

Live Turso verification was unavailable because this workspace does not provide the Turso environment variables. Local QA data was isolated outside the project and removed after testing. Screen reader behavior was not manually tested. Pagination currently reduces rendered rows; the read endpoint fetches the complete inventory snapshot, so a very large catalog should move filtering and pagination to database queries.

## Repeat the browser flow

Start the production server with a unique disposable SQLite file, such as `TURSO_DATABASE_URL=file:/tmp/inventory-test.sqlite npm run start -- --port 3001`. Then run `QA_BASE_URL=http://localhost:3001 node tests/inventory-flow.mjs`. The test expects an empty database and creates QA records. Never run this against a live inventory. Delete the disposable file after stopping the server.
