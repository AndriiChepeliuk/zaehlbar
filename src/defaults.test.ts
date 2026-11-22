import { describe, expect, it } from 'vitest'
import { CATEGORIES, SIZE_SETS, sizeSetForCategory } from './defaults'

describe('size set per product type', () => {
  it.each(['Hose', 'Kleid', 'Rock', 'T-Shirt', 'Jacke'])('%s defaults to XS–XXL', (category) => {
    expect(sizeSetForCategory(category).id).toBe('letters')
  })

  it('the letter sizes go up to XXXL', () => {
    expect(sizeSetForCategory('T-Shirt').sizes).toEqual(['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'])
  })

  it('shoes default to the shoe sizes', () => {
    expect(sizeSetForCategory('Schuhe').sizes).toEqual(['36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'])
  })

  it('an unknown or missing type falls back to XS–XXL', () => {
    expect(sizeSetForCategory(undefined).id).toBe('letters')
    expect(sizeSetForCategory('Unbekannt').id).toBe('letters')
  })

  it('numeric clothing sizes stay available to pick by hand', () => {
    expect(SIZE_SETS.find((s) => s.id === 'eu')?.sizes).toEqual(['34', '36', '38', '40', '42', '44', '46', '48'])
  })

  it('every type points to an existing size set', () => {
    for (const c of CATEGORIES) expect(() => sizeSetForCategory(c.name)).not.toThrow()
  })
})
