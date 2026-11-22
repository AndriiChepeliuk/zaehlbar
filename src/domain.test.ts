import { describe, expect, it } from 'vitest'
import {
  colorSuggestions,
  gridToDrafts,
  normalizeColor,
  normalizeSize,
  normalizeSku,
  parsePrice,
  suggestSkus,
  totalsByVariant,
} from './domain'

describe('normalisation', () => {
  it('normalises article numbers: trim, single spaces, upper case', () => {
    expect(normalizeSku('  ab   12-c ')).toBe('AB 12-C')
  })

  it('normalises colours to lower case', () => {
    expect(normalizeColor('  Dunkel  BLAU ')).toBe('dunkel blau')
    expect(normalizeColor('WEISS')).toBe('weiss')
    expect(normalizeColor('Weiß')).toBe('weiß')
  })

  it('takes the known spelling of a size, keeps unknown sizes as typed', () => {
    const known = ['XS', 'M', 'One Size', '30/32']
    expect(normalizeSize(' m ', known)).toBe('M')
    expect(normalizeSize('one  size', known)).toBe('One Size')
    expect(normalizeSize('30/32', known)).toBe('30/32')
    expect(normalizeSize(' 4 Jahre ', known)).toBe('4 Jahre')
  })
})

describe('parsePrice', () => {
  it.each([
    ['12', 1200],
    ['12,5', 1250],
    ['12.50', 1250],
    ['0,99', 99],
    [' 1 299,00 € ', 129900],
  ])('parses %j as %i cents', (input, cents) => {
    expect(parsePrice(input)).toEqual({ ok: true, cents })
  })

  it('treats an empty field as no price', () => {
    expect(parsePrice('  ')).toEqual({ ok: true, cents: undefined })
  })

  it.each(['abc', '12,345', '-5', '1,2,3', ','])('rejects %j', (input) => {
    expect(parsePrice(input)).toEqual({ ok: false })
  })
})

describe('totalsByVariant', () => {
  it('sums quantities per (sku, color, size) across entries and locations', () => {
    const totals = totalsByVariant([
      { sku: 'A1', color: 'blau', size: 'M', qty: 2 },
      { sku: 'A1', color: 'blau', size: 'M', qty: 3 },
      { sku: 'A1', color: 'blau', size: 'L', qty: 1 },
      { sku: 'A1', color: 'rot', size: 'M', qty: 4 },
      { sku: 'B2', color: 'blau', size: 'M', qty: 7 },
    ])
    expect(totals).toEqual([
      { sku: 'A1', color: 'blau', size: 'L', qty: 1 },
      { sku: 'A1', color: 'blau', size: 'M', qty: 5 },
      { sku: 'A1', color: 'rot', size: 'M', qty: 4 },
      { sku: 'B2', color: 'blau', size: 'M', qty: 7 },
    ])
  })

  it('does not merge variants whose fields only join to the same string', () => {
    const totals = totalsByVariant([
      { sku: 'A', color: 'b c', size: 'M', qty: 1 },
      { sku: 'A b', color: 'c', size: 'M', qty: 1 },
    ])
    expect(totals).toHaveLength(2)
  })

  it('returns nothing for no entries', () => {
    expect(totalsByVariant([])).toEqual([])
  })
})

describe('gridToDrafts', () => {
  const base = { sku: 'A1', color: 'blau', location: 'Lager' }
  const sizes = ['S', 'M', 'L', 'XL']

  it('creates one draft per size with qty > 0, in size-set order', () => {
    const drafts = gridToDrafts(base, sizes, { XL: 1, S: 2, M: 0 })
    expect(drafts).toEqual([
      { ...base, size: 'S', qty: 2 },
      { ...base, size: 'XL', qty: 1 },
    ])
  })

  it('creates nothing when every quantity is 0', () => {
    expect(gridToDrafts(base, sizes, { S: 0, M: 0 })).toEqual([])
  })

  it('rejects negative or fractional quantities', () => {
    expect(() => gridToDrafts(base, sizes, { S: -1 })).toThrow()
    expect(() => gridToDrafts(base, sizes, { S: 1.5 })).toThrow()
  })

  it('rejects quantities for sizes outside the set', () => {
    expect(() => gridToDrafts(base, sizes, { '42': 1 })).toThrow()
  })
})

describe('colorSuggestions', () => {
  it('puts the article colours first, then common ones, without duplicates', () => {
    expect(colorSuggestions(['Rot', 'oliv'], ['schwarz', 'rot', 'blau'])).toEqual(['rot', 'oliv', 'schwarz', 'blau'])
  })
})

describe('suggestSkus', () => {
  const skus = ['AB100', 'XAB1', 'AB2', 'C3']

  it('lists prefix matches before matches inside', () => {
    expect(suggestSkus('ab', skus)).toEqual(['AB100', 'AB2', 'XAB1'])
  })

  it('returns nothing for an empty query', () => {
    expect(suggestSkus('  ', skus)).toEqual([])
  })

  it('respects the limit', () => {
    expect(suggestSkus('a', skus, 1)).toEqual(['AB100'])
  })
})
