// Pure counting logic: no DOM, no database. Covered by domain.test.ts.

export interface EntryDraft {
  sku: string
  color: string
  size: string
  qty: number
  location: string
  note?: string
}

export interface VariantTotal {
  sku: string
  color: string
  size: string
  qty: number
}

export function collapseSpaces(s: string): string {
  return s.trim().replace(/\s+/g, ' ')
}

export function normalizeSku(s: string): string {
  return collapseSpaces(s).toUpperCase()
}

export function normalizeColor(s: string): string {
  return collapseSpaces(s).toLocaleLowerCase('de-DE')
}

/** A size that matches a known size case-insensitively takes the known spelling ("m" → "M"). */
export function normalizeSize(s: string, known: readonly string[]): string {
  const c = collapseSpaces(s)
  const lower = c.toLowerCase()
  return known.find((k) => k.toLowerCase() === lower) ?? c
}

export type PriceParse = { ok: true; cents: number | undefined } | { ok: false }

/** "12", "12,5", "12.50", "12,50 €" → cents. Empty → no price. Anything else is an error. */
export function parsePrice(input: string): PriceParse {
  const s = input.replace(/€/g, '').replace(/\s+/g, '')
  if (s === '') return { ok: true, cents: undefined }
  const m = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(s)
  if (!m) return { ok: false }
  const euros = Number(m[1])
  const fraction = (m[2] ?? '').padEnd(2, '0')
  const cents = euros * 100 + Number(fraction)
  if (!Number.isSafeInteger(cents)) return { ok: false }
  return { ok: true, cents }
}

export function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

/** Sum of qty grouped by (sku, color, size), sorted by sku, then color, then size. */
export function totalsByVariant(entries: readonly Pick<EntryDraft, 'sku' | 'color' | 'size' | 'qty'>[]): VariantTotal[] {
  const map = new Map<string, VariantTotal>()
  for (const e of entries) {
    const key = JSON.stringify([e.sku, e.color, e.size])
    const t = map.get(key)
    if (t) t.qty += e.qty
    else map.set(key, { sku: e.sku, color: e.color, size: e.size, qty: e.qty })
  }
  return [...map.values()].sort(
    (a, b) => a.sku.localeCompare(b.sku) || a.color.localeCompare(b.color) || a.size.localeCompare(b.size, undefined, { numeric: true }),
  )
}

export function isValidQty(qty: number): boolean {
  return Number.isInteger(qty) && qty > 0
}

/**
 * Size grid → one draft per size with qty > 0, in the order of `sizes`.
 * A negative or fractional qty is an error, not something to skip silently.
 */
export function gridToDrafts(
  base: { sku: string; color: string; location: string },
  sizes: readonly string[],
  qtyBySize: Readonly<Record<string, number>>,
): EntryDraft[] {
  const drafts: EntryDraft[] = []
  for (const size of sizes) {
    const qty = qtyBySize[size] ?? 0
    if (qty === 0) continue
    if (!isValidQty(qty)) throw new Error(`Invalid quantity for size ${size}: ${qty}`)
    drafts.push({ ...base, size, qty })
  }
  for (const size of Object.keys(qtyBySize)) {
    if (!sizes.includes(size) && qtyBySize[size] !== 0) throw new Error(`Size ${size} is not in the size set`)
  }
  return drafts
}

/** Colours already used for this article first (most recent first), then common colours; no duplicates. */
export function colorSuggestions(articleColors: readonly string[], common: readonly string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const c of [...articleColors, ...common]) {
    const n = normalizeColor(c)
    if (n === '' || seen.has(n)) continue
    seen.add(n)
    out.push(n)
  }
  return out
}

/** Article numbers matching the query: prefix matches first, then matches anywhere. */
export function suggestSkus(query: string, skus: readonly string[], limit = 8): string[] {
  const q = normalizeSku(query)
  if (q === '') return []
  const prefix: string[] = []
  const inside: string[] = []
  for (const sku of skus) {
    if (sku.startsWith(q)) prefix.push(sku)
    else if (sku.includes(q)) inside.push(sku)
  }
  prefix.sort()
  inside.sort()
  return [...prefix, ...inside].slice(0, limit)
}
