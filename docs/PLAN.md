# Zählbar — plan

A web app (PWA) for iPhone to take inventory of clothing in a small shop that has no electronic stock records.

## Status

**Last updated: 2026-11-25.** Next step — not chosen yet. Must work before counting starts (~08.12):
backup with device handoff (stage 3) and the sales log (stage 6). Everything else can be finished while
counting. The order is still open.

- New features agreed on 2026-11-25 — see "Decisions of 2026-11-25" below.

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

## Decisions of 2026-11-25

Confirmed by the repo owner on 2026-11-25:
- **Photos** are for the counter's own visual identification and confirmation of an article. Stored at
  ~1000 px on the longer side (up to ~1600 px if tag text has to stay readable — open); lists show a small
  version, tapping opens it full screen.
- **Barcodes** stay in "Later" until the tags have been checked.
- **Work on a PC** is the same app opened in a desktop browser, with full functionality (no separate
  read-only viewer). Data moves between devices by **handoff**: there is one master copy at a time, and a
  backup carries it over by fully replacing the data on the other device. Before a restore, the app checks
  for local changes newer than the backup and warns with the number of records that would be lost.
  Merging two copies is not planned.
- **Sales during the inventory.** The shop stays open; sales go into a paper journal (date only; article
  number, type, size, colour, price, manufacturer). They are entered in the app in the evening. A sale is
  subtracted only from a variant that has already been counted: colour and size are picked from the
  counted variants of that article, so totals cannot go below zero. Sales not yet counted are not entered.
  Sales are shown separately in the app and in the export.
- **Export**: Excel is the base. The stock sheet has one row per article (colours and sizes summed).
  Additionally a variant laid out like the inventory sheet received from the shop (columns: Artikel,
  Artikelnummer, Anzahl, EK, VK, Saison, Summe). Whether that is an extra sheet in the same file or a
  print version is open.
- **New optional article fields**: purchase price (EK, from delivery notes; left empty if unknown — the
  accountants handle it) and season. An empty EK stays empty, never 0: the row's Summe is empty too, and
  the total states how many articles have no EK.
- **Supplier ("Lieferant")**, the heading of the inventory sheet, is not recorded for now: it is unknown
  who that is (probably a distributor rather than the brand).
- **Screens**: Counting, Overview, Articles, Sales in the bottom tab bar; Backup/Export, Settings and
  Diagnostics under "More". Each screen has its own address (e.g. `#/overview`); on a PC the screens use
  the wider layout (tables instead of cards).

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
- The report format is partly known: on 2026-11-25 the shop's paper inventory sheet was received (one sheet
  per supplier; columns Artikel, Artikelnummer, Anzahl, EK, VK, Saison, Summe). We produce Excel and CSV,
  which are easy to adapt.
- The shop stays open during the inventory; sales are written into a paper journal (no cash register with
  electronic records, no electronic stock records). The counter is also the seller.
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
| `priceCents` | integer? | base selling price (VK) in cents |
| `ekCents` | integer? | purchase price (EK) in cents, from delivery notes; empty if unknown, never 0 as a stand-in |
| `season` | string? | season; format to be seen on the tags |
| `variantPrices` | `{color, size, priceCents}[]` | exceptions: a different price for a specific variant (rare; tucked away in editing) |
| `createdAt`, `updatedAt` | timestamp | |

Price for export: the variant price if set, otherwise the article's `priceCents`.

### `Photo` — product photo
| Field | Type | Note |
|---|---|---|
| `id` | uuid | |
| `sku` | string | |
| `color` | string? | if the photo shows a specific colour |
| `blob` | Blob (JPEG) | compressed to ~1000 px on the longer side, ~100 KB (up to ~1600 px if tag text must stay readable — open) |
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

Total = sum of `qty` grouped by (`sku`, `color`, `size`), minus sales of that variant. A breakdown by
location is available separately.

### Sales
One record per sold piece group from the paper journal: `sku`, `color`, `size`, `qty`, sale date, optional
price. Only counted variants can be picked. Whether sales get their own table or a `kind` field on
`CountEntry` is decided in the stage plan.

### `Settings`
- UI language (uk / de / en)
- **current location** (chosen once and stays in effect until changed; shown in the header)
- list of locations (for example: Sales floor, Stockroom, Shop window)
- list of product types; for each type a default size set (Shoes → 36–46)
- size sets: XS–XXL, 34–48, jeans W/L, shoes 36–46, One Size + custom
- inventory name/date, name of the person counting (for export)
- time of the last backup

## Screens

Bottom tab bar: Counting, Overview, Articles, Sales; Backup/Export, Settings and Diagnostics under "More".
Each screen has its own address (`#/…`). The same app runs on a PC with a wider layout.

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
3. **Articles**: catalogue; editing of type, brand, price (VK), EK, season; filter "no price / no EK / incomplete".
   Filling in EK from delivery notes is expected to happen here, e.g. on a PC.
4. **Sales**: entering the day's sales from the paper journal — article, then colour and size picked from
   the counted variants, quantity, date. List of entered sales with editing and deletion.
5. **Export and backup**
   - Excel (.xlsx): sheet "Bestand" with one row per article (colours and sizes summed; exact columns fixed at
     the export stage, following the inventory sheet: Artikel, Artikelnummer, Anzahl, EK, VK, Saison, Summe)
     + sheet "Zählungen" (all entries with location and time) + a sheet with the sales.
   - Summe = Anzahl × EK (the repo owner's assumption — to confirm). Empty EK → empty Summe; the total
     states how many articles have no EK.
   - Additionally a variant laid out like the inventory sheet (extra sheet or print version — open).
   - CSV for German Excel: `;`, decimal comma, UTF-8 with BOM.
   - Backup via the "Share" menu (Web Share API with a file; fallback — download), options "with photos" / "without photos". Restore from a file.
   - **Handoff between devices**: a restore fully replaces the data on this device. Before it, the app
     checks for local changes newer than the backup and warns with the number of records that would be lost.
   - Photos are not embedded in the xlsx for now (file size); maybe later.
6. **Settings**: language, locations, types, size sets, inventory details.

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
2. **Overview and editing**: lists, search, totals, article editing (incl. EK, season), variant prices, photos,
   tab navigation with screen addresses, wider PC layout.
3. **Backup and restore**, incl. the handoff warning before a restore.
4. **Export** of xlsx and CSV (per-article stock sheet, inventory-sheet variant).
5. **Polish**: uk/de/en translations, settings, trial inventory on ~20 products, fixes based on feedback.
6. **Sales log** (added 2026-11-25): entering sales from the paper journal, subtracting them from totals.
   Must work before counting starts (~08.12); its place in the order is open.

## Timeline

| When | What |
|---|---|
| by ~25.11 | Stages 0–1: scaffold, deployment, counting works on iPhone |
| by ~02.12 | Stages 2–4: overview, backups, export |
| ~03–07.12 | Stage 5: trial inventory on ~20 products, fixes |
| ~08–20.12 | **Inventory** |
| 21–24.12 | Buffer: finish counting, reconcile, hand over the report |

Minimum needed to start counting: stages 1 + 3 + 6 (counting + backup + sales log). Export, overview and
article editing can be finished in parallel with counting, since the data is already stored.

## Later (not now)

- Barcode scanning, if the tags carry codes. First check 15–20 different tags: is there a code, what kind
  (EAN-13 or the shop's own), does it match the article number. A Bluetooth scanner acting as a keyboard is
  a cheaper alternative to camera scanning.
- Merging two copies of the data (parallel work on two devices) — only if handoff stops being enough.
- Importing articles from delivery notes.
- Multiple inventories (archive), comparison.
- Ongoing stock-keeping: receipts/sales.

## Open questions

- The report format the owner/accounting wants — partly answered by the inventory sheet (see Context).
- Who the "Lieferant" on the inventory sheet is (probably a distributor); not recorded until known.
- Season: is it on the tags, and in what format?
- Summe: Anzahl × EK (assumed) or × VK?
- Inventory-sheet variant of the export: an extra sheet in the same Excel file or a print version?
- Photo size: ~1000 px or up to ~1600 px (readable tag text)?
- The order of the remaining stages.
