# Zählbar

Simple offline-first PWA for counting clothing inventory on an iPhone — article, colour, size, quantity, location. All data stays on the device; export to Excel/CSV.

See [docs/PLAN.md](docs/PLAN.md) for the plan (in Ukrainian).

## Development

```sh
npm install
npm run dev      # dev server, also reachable from phones on the same Wi-Fi
npm run build    # production build into dist/
npm run preview  # serve the production build
npm run icons    # regenerate PWA icons from public/favicon.svg
```

Pushing to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml`.
