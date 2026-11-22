# Zählbar — plan

A web app (PWA) for iPhone to take inventory of clothing in a small shop that has no electronic stock records.

## Status

**Last updated: 2026-11-22.** Next step — not chosen yet: stage 3 (backup) before stage 2 was suggested,
because stages 1 + 3 are the minimum to start counting; the order is still open.

- ✅ **Stage 0 done (18–19.11).** Deployed: https://andriichepeliuk.github.io/zaehlbar/ (auto-deploy from `main`).
  Checked on iPhone (iOS 18.7, Safari 27.2): install to home screen ✅, data survives a restart ✅,
  works offline ✅, `navigator.storage.persist()` → granted ✅, quota ~38 GB, dark theme ✅.
- ✅ **Stage 1 done (22.11, PR #2).** Counting screen with size grid, diagnostics in their own tab,
  `persist()` requested on launch. `npm test`: 52 tests. Checked on the iPhone by the owner.
- Size sets after feedback (22.11): clothing is mostly XS–XXXL, so Hose / Kleid / Rock default to it;
  numeric clothing sizes (34–48) are rare and picked by hand; shoes 36–46.
- Testing before merge: push the branch, then Actions → "Deploy to GitHub Pages" → Run workflow → the branch.
  The `github-pages` environment allows `feat/*` branches only; other prefixes need their own rule.
  While a branch is deployed, the site shows it instead of `main`.
- Unresolved (not critical): the dev server (`npm run dev`, http://192.168.2.186:5173/zaehlbar/) does not open from the iPhone.
  Windows Firewall allows Node.js, and the server is reachable at the LAN IP from the PC. Probably client isolation in the router,
  or the iPhone is not on the same network. Workaround: the branch deploy above.

## Stage 1 plan (agreed 2026-11-22, done 2026-11-22)

Decisions confirmed on 2026-11-22:
- UI language for now: **Ukrainian** (uk/de/en translations stay in stage 5). UI strings live in one
  dictionary file so stage 5 only adds languages.
- Default lists (locations, product types, size sets) are taken from this plan. Their **values are German**,
  because they are stored as data and go into the report as-is.
- Clothing types default to XS–XXXL; numeric clothing sizes (34–48) stay selectable by hand.
- The size grid mode is part of stage 1.
- "Undo" on a recent entry **deletes** it (no soft delete).

Scope:
1. Pure logic in its own module, covered by Vitest: SKU / colour / size normalisation, price parsing,
   totals by (`sku`, `color`, `size`), size grid → entries (only qty > 0), colour suggestions.
2. Storage layer on Dexie (schema v1 is enough, no migration): saving entries creates the article on
   first count; existing articles are not overwritten; deleting an entry deletes only that entry.
   Tested with `fake-indexeddb`.
3. Counting screen: location in the header (tap to change), article field with suggestions, compact
   new-article form (type, brand, price; skippable), colour chips + custom, size buttons (set from the
   product type, switchable), quantity `−`/`+`/number, "Save" keeps article and colour selected,
   recent entries with "Undo", Live Text hint.
4. Size grid mode: article + colour → every size of the set with `−`/`+` → "Save all".
5. `navigator.storage.persist()` is requested automatically on launch; a warning is shown if it is denied.
6. Diagnostics move to their own tab.

Done when:
- `npm test` passes, covering the items in 1 and 2 (test run).
- `npm run build` passes (build run).
- Manual check by the owner of the repo, in desktop Chrome phone emulation before merge and on the
  iPhone via GitHub Pages after merge: an entry is saved and survives a restart; a new article appears in
  the catalogue (visible in its suggestions); after "Save" article, colour and location stay selected;
  "Undo" removes that entry; the grid creates one entry per size with qty > 0; storage is persisted
  without pressing a button (diagnostics tab).

## Context

- One person counts, using their own iPhone (Safari). The shop has Wi-Fi.
- Up to ~300 articles, up to ~30 pieces each. One article can come in several colours and sizes.
- The article number is written on the tag as text. Barcodes are not guaranteed (if any turn up, that's a bonus for later).
- The inventory must be **finished by 24.12.2026**. Schedule in the "Timeline" section.
- The report format for the owner is not yet known. We produce Excel and CSV, which are easy to adapt.
- **Do not mention the name of the shop or chain** anywhere in the code or the repository (the repository is public).

## Principles

1. **Fast input on the phone**: minimal typing, buttons, suggestions, "sticky" article and location.
2. **Data is never lost**: persistent storage, backups, reminders about them.
3. **No server**: all data stays on the phone; hosting is static files on GitHub Pages.
4. **Simple**: only what the inventory needs. Ongoing stock-keeping may come later.

## Data model

Identifiers in the code are in English. The UI is translated (uk / de / en); export headers are in German.

### `Article` — article catalogue
| Field | Type | Note |
|---|---|---|
| `sku` | string, key | article number, normalised: trim, no extra spaces, upper case |
| `category` | string | type: Shoes, Trousers, T-shirt, Hat… (editable list in the settings) |
| `brand` | string | manufacturer; previously entered values are suggested |
| `name` | string? | name/description, optional |
| `priceCents` | integer? | base price in cents |
| `variantPrices` | `{color, size, priceCents}[]` | exceptions: a different price for a specific variant (rare; tucked away in editing) |
| `createdAt`, `updatedAt` | timestamp | |

Price for export: the variant price if set, otherwise the article's `priceCents`.

### `Photo` — product photo
| Field | Type | Note |
|---|---|---|
| `id` | uuid | |
| `sku` | string | |
| `color` | string? | if the photo shows a specific colour |
| `blob` | Blob (JPEG) | compressed to ~1000 px on the longer side, ~100 KB |
| `createdAt` | timestamp | |

Capture via `<input type="file" accept="image/*" capture="environment">`, compressed via canvas before saving.

A new article is added to the catalogue automatically on its first count. Type, brand and price can be filled in right away or later (incomplete ones are flagged in the article list).

### `CountEntry` — count log
One entry is one counting action ("4 pcs of article X, blue, M, in the shop window").

| Field | Type | Note |
|---|---|---|
| `id` | uuid | |
| `sku` | string | reference to `Article` |
| `color` | string | free text; recent colours of this article and common ones are suggested |
| `size` | string | from a size set or custom |
| `qty` | integer > 0 | |
| `location` | string | current location from the settings |
| `note` | string? | |
| `createdAt`, `updatedAt` | timestamp | |

Total = sum of `qty` grouped by (`sku`, `color`, `size`). A breakdown by location is available separately.

### `Settings`
- UI language (uk / de / en)
- **current location** (chosen once and stays in effect until changed; shown in the header)
- list of locations (for example: Sales floor, Stockroom, Shop window)
- list of product types; for each type a default size set (Shoes → 36–46)
- size sets: XS–XXL, 34–48, jeans W/L, shoes 36–46, One Size + custom
- inventory name/date, name of the person counting (for export)
- time of the last backup

## Screens

1. **Counting** (main)
   - Header: current location (tap to change).
   - Article field with autocomplete. For a new article, a compact form: type, brand, price (can be skipped).
   - Colours as chip buttons (recent) + custom.
   - Sizes as buttons (the set depends on the product type).
   - Quantity: `−` / `+` / number input.
   - "Save" → the article stays selected, so the next size or colour can be counted right away.
   - At the bottom, recent entries with an "Undo" button.
   - **"Size grid" mode**: article + colour → all sizes of the set with `−`/`+` → "Save all" (creates one entry per size with quantity > 0).
   - Thumbnail of the article photo (if any) and an "Add photo" button.
   - Hint: the article number can be entered with the camera via iOS's built-in "Scan Text" (Live Text).
2. **Overview**: search; articles → variants (colour/size) → individual entries; editing and deletion. Totals: number of articles, pieces, total value.
3. **Articles**: catalogue; editing of type, brand, price; filter "no price / incomplete".
4. **Export and backup**
   - Excel (.xlsx): sheet "Bestand" (Artikel, Typ, Marke, Bezeichnung, Farbe, Größe, Menge, Preis, Summe) + sheet "Zählungen" (all entries with location and time).
   - CSV for German Excel: `;`, decimal comma, UTF-8 with BOM.
   - Backup via the "Share" menu (Web Share API with a file; fallback — download), options "with photos" / "without photos". Restore from a file.
   - Photos are not embedded in the xlsx for now (file size); maybe later.
5. **Settings**: language, locations, types, size sets, inventory details.

## Storage and reliability

- IndexedDB via Dexie.
- `navigator.storage.persist()` on first launch.
- The app must be **added to the home screen**, otherwise Safari may delete data of sites that haven't been used for a long time. The app shows a hint if it is not opened from the home screen.
- Backup reminder (for example, after every N entries or once a day).
- Database schema versioning (Dexie migrations) from day one.

## Technology

- Vite + TypeScript + Preact
- Dexie (IndexedDB)
- vite-plugin-pwa (offline, manifest, icons)
- xlsx generation: pick the library at the export stage (candidates: `exceljs`, `write-excel-file`)
- i18n: our own simple dictionary (3 languages, small amount of text)
- Deployment: GitHub Actions → GitHub Pages

## Debugging without a Mac

- Main development in Chrome/Edge (phone emulation mode).
- During development, the iPhone opens the dev server over the local Wi-Fi.
- Built-in error log visible on screen.
- Early deployment and testing on a real iPhone (stage 0).

## Stages

0. **Scaffold**: Vite + Preact + PWA, deployment to GitHub Pages, check of installation on iPhone and data persistence. *Goal: remove iOS-specific risks as early as possible.*
1. **Counting**: counting screen (normal mode + size grid), storage in IndexedDB, current location, article catalogue (filled automatically).
2. **Overview and editing**: lists, search, totals, article editing, variant prices, photos.
3. **Backup and restore.**
4. **Export** of xlsx and CSV.
5. **Polish**: uk/de/en translations, settings, trial inventory on ~20 products, fixes based on feedback.

## Timeline

| When | What |
|---|---|
| by ~25.11 | Stages 0–1: scaffold, deployment, counting works on iPhone |
| by ~02.12 | Stages 2–4: overview, backups, export |
| ~03–07.12 | Stage 5: trial inventory on ~20 products, fixes |
| ~08–20.12 | **Inventory** |
| 21–24.12 | Buffer: finish counting, reconcile, hand over the report |

Minimum needed to start counting: stages 1 + 3 (counting + backup). Export can be finished in parallel with counting, since the data is already stored.

## Later (not now)

- Barcode scanning with the camera, if the tags carry EAN.
- Importing articles from delivery notes.
- Multiple inventories (archive), comparison.
- Ongoing stock-keeping: receipts/sales.

## Open questions

- The report format the owner/accounting wants.
