import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import {
  deleteEntry,
  getCurrentLocation,
  recentColorsForSku,
  recentEntries,
  saveEntries,
  setCurrentLocation,
} from './repo'

const draft = { sku: ' ab1 ', color: 'Blau', size: 'M', qty: 2, location: 'Lager' }

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe('saveEntries', () => {
  it('stores a normalised entry and creates the article on first count', async () => {
    await saveEntries([draft], { category: 'Hose', brand: ' Acme ', priceCents: 1999 })

    const entries = await db.entries.toArray()
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ sku: 'AB1', color: 'blau', size: 'M', qty: 2, location: 'Lager' })

    const article = await db.articles.get('AB1')
    expect(article).toMatchObject({ sku: 'AB1', category: 'Hose', brand: 'Acme', priceCents: 1999 })
  })

  it('creates an article with no fields when the new-article form was skipped', async () => {
    await saveEntries([draft])
    const article = await db.articles.get('AB1')
    expect(article).toBeDefined()
    expect(article?.category).toBeUndefined()
    expect(article?.brand).toBeUndefined()
  })

  it('never overwrites an existing article', async () => {
    await saveEntries([draft], { brand: 'First', priceCents: 1000 })
    await saveEntries([{ ...draft, size: 'L' }], { brand: 'Second', priceCents: 2000 })
    const article = await db.articles.get('AB1')
    expect(article).toMatchObject({ brand: 'First', priceCents: 1000 })
    expect(await db.articles.count()).toBe(1)
    expect(await db.entries.count()).toBe(2)
  })

  it('saves all grid entries in one call', async () => {
    await saveEntries([
      { ...draft, size: 'S', qty: 1 },
      { ...draft, size: 'M', qty: 3 },
    ])
    expect(await db.entries.count()).toBe(2)
  })

  it.each([
    ['empty article number', { sku: '  ' }],
    ['empty colour', { color: '' }],
    ['empty size', { size: ' ' }],
    ['zero quantity', { qty: 0 }],
    ['fractional quantity', { qty: 1.5 }],
    ['empty location', { location: '' }],
  ])('rejects %s and stores nothing', async (_name, override) => {
    await expect(saveEntries([{ ...draft, ...override }])).rejects.toThrow()
    expect(await db.entries.count()).toBe(0)
    expect(await db.articles.count()).toBe(0)
  })

  it('stores nothing when one draft of several is invalid', async () => {
    await expect(saveEntries([draft, { ...draft, qty: -1 }])).rejects.toThrow()
    expect(await db.entries.count()).toBe(0)
  })

  it('rejects an empty list', async () => {
    await expect(saveEntries([])).rejects.toThrow()
  })
})

describe('deleteEntry', () => {
  it('deletes only that entry and keeps the article', async () => {
    const [first] = await saveEntries([draft])
    await saveEntries([{ ...draft, size: 'L' }])

    await deleteEntry(first.id)

    const left = await db.entries.toArray()
    expect(left).toHaveLength(1)
    expect(left[0].size).toBe('L')
    expect(await db.articles.get('AB1')).toBeDefined()
  })

  it('fails loudly for an unknown id', async () => {
    await expect(deleteEntry('missing')).rejects.toThrow()
  })
})

describe('queries', () => {
  it('lists recent entries newest first', async () => {
    await saveEntries([{ ...draft, size: 'S' }])
    await new Promise((r) => setTimeout(r, 2))
    await saveEntries([{ ...draft, size: 'L' }])
    const recent = await recentEntries(10)
    expect(recent.map((e) => e.size)).toEqual(['L', 'S'])
  })

  it('lists the colours of an article, most recent first, without duplicates', async () => {
    await saveEntries([{ ...draft, color: 'rot' }])
    await new Promise((r) => setTimeout(r, 2))
    await saveEntries([{ ...draft, color: 'blau' }])
    await new Promise((r) => setTimeout(r, 2))
    await saveEntries([{ ...draft, color: 'rot' }])
    expect(await recentColorsForSku('AB1')).toEqual(['rot', 'blau'])
  })

  it('keeps the current location in the settings', async () => {
    expect(await getCurrentLocation()).toBe('Verkaufsraum')
    await setCurrentLocation('Lager')
    expect(await getCurrentLocation()).toBe('Lager')
  })
})
