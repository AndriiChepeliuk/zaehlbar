// Default lists. Values are German on purpose: they are stored as data and go into the
// report for the owner as-is. They become editable in the settings (stage 5).

export interface SizeSet {
  id: string
  label: string
  sizes: readonly string[]
}

function range(from: number, to: number, step = 1): string[] {
  const out: string[] = []
  for (let n = from; n <= to; n += step) out.push(String(n))
  return out
}

const JEANS_WIDTHS = [28, 29, 30, 31, 32, 33, 34, 36, 38]
const JEANS_LENGTHS = [30, 32, 34]

export const SIZE_SETS: readonly SizeSet[] = [
  { id: 'letters', label: 'XS–XXL', sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
  { id: 'eu', label: '34–48', sizes: range(34, 48, 2) },
  { id: 'jeans', label: 'W/L', sizes: JEANS_WIDTHS.flatMap((w) => JEANS_LENGTHS.map((l) => `${w}/${l}`)) },
  { id: 'shoes', label: '36–46', sizes: range(36, 46) },
  { id: 'onesize', label: 'One Size', sizes: ['One Size'] },
]

export const DEFAULT_SIZE_SET_ID = 'letters'

export const DEFAULT_LOCATIONS: readonly string[] = ['Verkaufsraum', 'Lager', 'Schaufenster']

export interface Category {
  name: string
  sizeSetId: string
}

export const CATEGORIES: readonly Category[] = [
  { name: 'Schuhe', sizeSetId: 'shoes' },
  { name: 'Hose', sizeSetId: 'eu' },
  { name: 'Jeans', sizeSetId: 'jeans' },
  { name: 'T-Shirt', sizeSetId: 'letters' },
  { name: 'Hemd', sizeSetId: 'letters' },
  { name: 'Bluse', sizeSetId: 'letters' },
  { name: 'Pullover', sizeSetId: 'letters' },
  { name: 'Jacke', sizeSetId: 'letters' },
  { name: 'Kleid', sizeSetId: 'eu' },
  { name: 'Rock', sizeSetId: 'eu' },
  { name: 'Mütze', sizeSetId: 'onesize' },
  { name: 'Accessoires', sizeSetId: 'onesize' },
]

export const COMMON_COLORS: readonly string[] = [
  'schwarz', 'weiß', 'grau', 'blau', 'dunkelblau', 'rot',
  'grün', 'beige', 'braun', 'rosa', 'gelb', 'bunt',
]

export function sizeSetById(id: string): SizeSet {
  const set = SIZE_SETS.find((s) => s.id === id)
  if (!set) throw new Error(`Unknown size set: ${id}`)
  return set
}

/** Size set for a product type; the default set when the type is unknown or not chosen. */
export function sizeSetForCategory(category: string | undefined): SizeSet {
  const cat = CATEGORIES.find((c) => c.name === category)
  return sizeSetById(cat?.sizeSetId ?? DEFAULT_SIZE_SET_ID)
}

export const ALL_KNOWN_SIZES: readonly string[] = SIZE_SETS.flatMap((s) => s.sizes)
