// Storage operations for counting. Covered by repo.test.ts (fake-indexeddb).

import { db, getSetting, setSetting, type Article, type CountEntry } from './db'
import { DEFAULT_LOCATIONS } from './defaults'
import { collapseSpaces, isValidQty, normalizeColor, normalizeSku, type EntryDraft } from './domain'

export interface ArticleFields {
  category?: string
  brand?: string
  name?: string
  priceCents?: number
}

export function newId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  // randomUUID needs a secure context; plain-http LAN dev servers do not have one.
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

function cleanFields(f: ArticleFields | undefined): ArticleFields {
  const out: ArticleFields = {}
  if (!f) return out
  const category = f.category === undefined ? '' : collapseSpaces(f.category)
  const brand = f.brand === undefined ? '' : collapseSpaces(f.brand)
  const name = f.name === undefined ? '' : collapseSpaces(f.name)
  if (category) out.category = category
  if (brand) out.brand = brand
  if (name) out.name = name
  if (f.priceCents !== undefined) {
    if (!Number.isSafeInteger(f.priceCents) || f.priceCents < 0) throw new Error(`Invalid price: ${f.priceCents}`)
    out.priceCents = f.priceCents
  }
  return out
}

function toEntry(d: EntryDraft, now: number): CountEntry {
  const sku = normalizeSku(d.sku)
  const color = normalizeColor(d.color)
  const size = collapseSpaces(d.size)
  const location = collapseSpaces(d.location)
  if (!sku) throw new Error('Article number is empty')
  if (!color) throw new Error('Colour is empty')
  if (!size) throw new Error('Size is empty')
  if (!location) throw new Error('Location is empty')
  if (!isValidQty(d.qty)) throw new Error(`Invalid quantity: ${d.qty}`)
  const entry: CountEntry = { id: newId(), sku, color, size, qty: d.qty, location, createdAt: now, updatedAt: now }
  const note = d.note === undefined ? '' : collapseSpaces(d.note)
  if (note) entry.note = note
  return entry
}

/**
 * Saves count entries in one transaction. An article that is not in the catalogue yet is created
 * (with `newArticle` fields, if given). An existing article is never changed here.
 */
export async function saveEntries(drafts: readonly EntryDraft[], newArticle?: ArticleFields): Promise<CountEntry[]> {
  if (drafts.length === 0) throw new Error('No entries to save')
  const now = Date.now()
  const entries = drafts.map((d) => toEntry(d, now))
  const fields = cleanFields(newArticle)
  const skus = [...new Set(entries.map((e) => e.sku))]
  await db.transaction('rw', db.articles, db.entries, async () => {
    for (const sku of skus) {
      const existing = await db.articles.get(sku)
      if (!existing) await db.articles.add({ sku, ...fields, createdAt: now, updatedAt: now })
    }
    await db.entries.bulkAdd(entries)
  })
  return entries
}

export async function deleteEntry(id: string): Promise<void> {
  const n = await db.entries.where('id').equals(id).delete()
  if (n === 0) throw new Error(`Entry not found: ${id}`)
}

export async function getArticle(sku: string): Promise<Article | null> {
  if (!sku) return null
  return (await db.articles.get(sku)) ?? null
}

export async function allSkus(): Promise<string[]> {
  return (await db.articles.toCollection().primaryKeys()) as string[]
}

export async function allBrands(): Promise<string[]> {
  return (await db.articles.orderBy('brand').uniqueKeys()) as string[]
}

export async function recentEntries(limit: number): Promise<CountEntry[]> {
  return db.entries.orderBy('createdAt').reverse().limit(limit).toArray()
}

export async function entriesForSku(sku: string): Promise<CountEntry[]> {
  if (!sku) return []
  return db.entries.where('sku').equals(sku).toArray()
}

/** Distinct colours counted for this article, most recent first. */
export async function recentColorsForSku(sku: string): Promise<string[]> {
  const entries = await entriesForSku(sku)
  entries.sort((a, b) => b.createdAt - a.createdAt)
  return [...new Set(entries.map((e) => e.color))]
}

const LOCATION_KEY = 'location.current'

export async function getCurrentLocation(): Promise<string> {
  return getSetting(LOCATION_KEY, DEFAULT_LOCATIONS[0])
}

export async function setCurrentLocation(location: string): Promise<void> {
  const l = collapseSpaces(location)
  if (!l) throw new Error('Location is empty')
  await setSetting(LOCATION_KEY, l)
}
