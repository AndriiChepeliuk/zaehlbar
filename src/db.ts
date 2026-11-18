import Dexie, { type EntityTable } from 'dexie'

export interface VariantPrice {
  color: string
  size: string
  priceCents: number
}

export interface Article {
  sku: string
  category?: string
  brand?: string
  name?: string
  priceCents?: number
  variantPrices?: VariantPrice[]
  createdAt: number
  updatedAt: number
}

export interface CountEntry {
  id: string
  sku: string
  color: string
  size: string
  qty: number
  location: string
  note?: string
  createdAt: number
  updatedAt: number
}

export interface Photo {
  id: string
  sku: string
  color?: string
  blob: Blob
  createdAt: number
}

export interface Setting {
  key: string
  value: unknown
}

export const db = new Dexie('zaehlbar') as Dexie & {
  articles: EntityTable<Article, 'sku'>
  entries: EntityTable<CountEntry, 'id'>
  photos: EntityTable<Photo, 'id'>
  settings: EntityTable<Setting, 'key'>
}

// Schema v1. Never edit an existing version — add db.version(2) with an upgrade instead.
db.version(1).stores({
  articles: '&sku, category, brand, updatedAt',
  entries: '&id, sku, [sku+color+size], location, createdAt',
  photos: '&id, sku, [sku+color]',
  settings: '&key',
})

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.settings.get(key)
  return row === undefined ? fallback : (row.value as T)
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value })
}
