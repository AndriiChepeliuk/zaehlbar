import { useEffect, useRef, useState } from 'preact/hooks'
import type { CountEntry } from '../db'
import {
  ALL_KNOWN_SIZES,
  CATEGORIES,
  COMMON_COLORS,
  DEFAULT_LOCATIONS,
  SIZE_SETS,
  sizeSetById,
  sizeSetForCategory,
} from '../defaults'
import {
  colorSuggestions,
  formatPrice,
  gridToDrafts,
  isValidQty,
  normalizeColor,
  normalizeSize,
  normalizeSku,
  parsePrice,
  suggestSkus,
  totalsByVariant,
  type EntryDraft,
} from '../domain'
import { logError } from '../errorLog'
import { useLiveQuery } from '../hooks'
import {
  allBrands,
  allSkus,
  deleteEntry,
  entriesForSku,
  getArticle,
  getCurrentLocation,
  recentColorsForSku,
  recentEntries,
  saveEntries,
  setCurrentLocation,
  type ArticleFields,
} from '../repo'
import { t } from '../strings'

type Mode = 'single' | 'grid'
type Message = { kind: 'ok' | 'error'; text: string }

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

function entryLabel(e: Pick<CountEntry, 'qty' | 'sku' | 'color' | 'size'>): string {
  return `${e.qty} × ${e.sku} · ${e.color} · ${e.size}`
}

export function Counting() {
  const location = useLiveQuery(getCurrentLocation, [])
  const [pickLocation, setPickLocation] = useState(false)

  // Article
  const skuRef = useRef<HTMLInputElement>(null)
  const [skuInput, setSkuInput] = useState('')
  const [skuFocused, setSkuFocused] = useState(false)
  const sku = normalizeSku(skuInput)
  const skus = useLiveQuery(allSkus, []) ?? []
  const article = useLiveQuery(() => getArticle(sku), [sku]) // undefined: loading, null: not in catalogue
  const articleLoading = sku !== '' && article === undefined
  const isNew = sku !== '' && article === null
  const suggestions = suggestSkus(skuInput, skus)
  const showSuggestions = skuFocused && suggestions.length > 0 && !(suggestions.length === 1 && suggestions[0] === sku)

  // New-article form (used only when the article is not in the catalogue yet)
  const [category, setCategory] = useState<string | undefined>(undefined)
  const [brand, setBrand] = useState('')
  const [priceInput, setPriceInput] = useState('')
  const brands = useLiveQuery(allBrands, []) ?? []
  const price = parsePrice(priceInput)

  // Variant
  const [mode, setMode] = useState<Mode>('single')
  const [sizeSetOverride, setSizeSetOverride] = useState<string | null>(null)
  const effectiveCategory = article ? article.category : isNew ? category : undefined
  const sizeSet = sizeSetOverride ? sizeSetById(sizeSetOverride) : sizeSetForCategory(effectiveCategory)
  const [colorInput, setColorInput] = useState('')
  const color = normalizeColor(colorInput)
  const articleColors = useLiveQuery(() => recentColorsForSku(sku), [sku]) ?? []
  const colors = colorSuggestions(articleColors, COMMON_COLORS)
  // A size comes either from a chip or from the free field; the free field wins when filled.
  const [sizeChip, setSizeChip] = useState('')
  const [sizeCustom, setSizeCustom] = useState('')
  const size = sizeCustom.trim() ? normalizeSize(sizeCustom, ALL_KNOWN_SIZES) : sizeChip
  const [qtyInput, setQtyInput] = useState('1')
  const qty = Number(qtyInput)
  const [grid, setGrid] = useState<Record<string, number>>({})
  const gridTotal = Object.values(grid).reduce((a, b) => a + b, 0)

  // Already counted
  const skuEntries = useLiveQuery(() => entriesForSku(sku), [sku]) ?? []
  const articleTotal = skuEntries.reduce((a, e) => a + e.qty, 0)
  const countedBySize = new Map(
    totalsByVariant(skuEntries)
      .filter((v) => v.color === color)
      .map((v) => [v.size, v.qty]),
  )

  const recent = useLiveQuery(() => recentEntries(10), []) ?? []
  const [message, setMessage] = useState<Message | null>(null)
  const [busy, setBusy] = useState(false)
  const [undoing, setUndoing] = useState<ReadonlySet<string>>(new Set())

  // Sizes chosen for one size set mean nothing in another one: one rule for every way the set
  // changes (article loaded, type chosen, set picked by hand).
  useEffect(() => {
    setSizeChip('')
    setGrid({})
  }, [sizeSet.id])

  function changeSku(value: string) {
    if (normalizeSku(value) !== sku) {
      // Everything below belongs to the previous article; keeping it would attach it to this one.
      setCategory(undefined)
      setBrand('')
      setPriceInput('')
      setColorInput('')
      setSizeChip('')
      setSizeCustom('')
      setSizeSetOverride(null)
      setGrid({})
    }
    setSkuInput(value)
  }

  function chooseSuggestion(value: string) {
    changeSku(value)
    skuRef.current?.blur()
  }

  async function chooseLocation(l: string) {
    try {
      await setCurrentLocation(l)
      setPickLocation(false)
    } catch (err) {
      logError(`setCurrentLocation: ${errorText(err)}`)
      setMessage({ kind: 'error', text: errorText(err) })
    }
  }

  const missing: string[] = []
  if (!sku) missing.push(t.article)
  if (!color) missing.push(t.color)
  if (mode === 'single') {
    if (!size) missing.push(t.size)
    if (!isValidQty(qty)) missing.push(t.qty)
  } else if (gridTotal === 0) {
    missing.push(t.qty)
  }
  if (isNew && !price.ok) missing.push(t.price)
  const canSave = missing.length === 0 && !articleLoading && location !== undefined && !busy

  async function save() {
    if (!canSave || location === undefined) return
    let drafts: EntryDraft[]
    try {
      drafts =
        mode === 'single'
          ? [{ sku, color, size, qty, location }]
          : gridToDrafts({ sku, color, location }, sizeSet.sizes, grid)
    } catch (err) {
      setMessage({ kind: 'error', text: `${t.saveFailed}: ${errorText(err)}` })
      return
    }
    const fields: ArticleFields | undefined = isNew
      ? { category, brand, priceCents: price.ok ? price.cents : undefined }
      : undefined

    setBusy(true)
    try {
      const saved = await saveEntries(drafts, fields)
      setMessage({ kind: 'ok', text: t.saved(saved.map(entryLabel).join('; ')) })
      // Article, colour and location stay selected for the next size.
      setSizeChip('')
      setSizeCustom('')
      setQtyInput('1')
      setGrid({})
      // The new-article fields are cleared by changeSku when the next article is typed; clearing
      // them here would switch the size set back and forth until the saved article loads.
    } catch (err) {
      logError(`saveEntries: ${errorText(err)}`)
      setMessage({ kind: 'error', text: `${t.saveFailed}: ${errorText(err)}` })
    } finally {
      setBusy(false)
    }
  }

  async function undo(e: CountEntry) {
    if (undoing.has(e.id)) return
    setUndoing((s) => new Set(s).add(e.id))
    try {
      await deleteEntry(e.id)
      setMessage({ kind: 'ok', text: t.undone(entryLabel(e)) })
    } catch (err) {
      logError(`deleteEntry: ${errorText(err)}`)
      setMessage({ kind: 'error', text: `${t.undoFailed}: ${errorText(err)}` })
    } finally {
      setUndoing((s) => {
        const next = new Set(s)
        next.delete(e.id)
        return next
      })
    }
  }

  function setGridQty(s: string, n: number) {
    setGrid((g) => ({ ...g, [s]: Math.max(0, n) }))
  }

  return (
    <>
      <header class="header">
        <h1>Zählbar</h1>
        <button class="location" onClick={() => setPickLocation((v) => !v)} aria-expanded={pickLocation}>
          📍 {location ?? '…'} ▾
        </button>
      </header>

      {pickLocation && (
        <section class="card">
          <h2>{t.location}</h2>
          <div class="chips">
            {DEFAULT_LOCATIONS.map((l) => (
              <button key={l} class={l === location ? 'chip selected' : 'chip'} onClick={() => chooseLocation(l)}>
                {l}
              </button>
            ))}
          </div>
        </section>
      )}

      <section class="card">
        <label class="field">
          <span class="label">{t.article}</span>
          <input
            ref={skuRef}
            class="input big-input"
            value={skuInput}
            placeholder={t.articlePlaceholder}
            autocomplete="off"
            autocapitalize="characters"
            autocorrect="off"
            spellcheck={false}
            enterkeyhint="done"
            onInput={(e) => changeSku(e.currentTarget.value)}
            onFocus={() => setSkuFocused(true)}
            // Hide the list a moment later, so a tap on a suggestion still lands on it.
            onBlur={() =>
              setTimeout(() => {
                if (document.activeElement !== skuRef.current) setSkuFocused(false)
              }, 200)
            }
          />
        </label>
        {showSuggestions && (
          <ul class="suggestions">
            {suggestions.map((s) => (
              <li key={s}>
                <button onMouseDown={(e) => e.preventDefault()} onClick={() => chooseSuggestion(s)}>
                  {s}
                </button>
              </li>
            ))}
          </ul>
        )}
        {!sku && <p class="muted small">{t.liveTextHint}</p>}

        {article && (
          <p class="small">
            {[article.category, article.brand, article.priceCents !== undefined ? formatPrice(article.priceCents) : undefined]
              .filter(Boolean)
              .join(' · ')}
            {articleTotal > 0 && <span class="muted"> — {t.articleTotal(articleTotal)}</span>}
          </p>
        )}

        {isNew && (
          <div class="new-article">
            <p class="muted small">{t.newArticle}</p>
            <span class="label">{t.category}</span>
            <div class="chips">
              {CATEGORIES.map((c) => (
                <button
                  key={c.name}
                  class={c.name === category ? 'chip selected' : 'chip'}
                  onClick={() => {
                    setCategory(c.name === category ? undefined : c.name)
                    setSizeSetOverride(null)
                  }}
                >
                  {c.name}
                </button>
              ))}
            </div>
            <div class="row2">
              <label class="field">
                <span class="label">{t.brand}</span>
                <input class="input" list="brands" value={brand} autocomplete="off" onInput={(e) => setBrand(e.currentTarget.value)} />
                <datalist id="brands">
                  {brands.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </label>
              <label class="field">
                <span class="label">{t.price}</span>
                <input
                  class={price.ok ? 'input' : 'input invalid'}
                  inputMode="decimal"
                  value={priceInput}
                  autocomplete="off"
                  onInput={(e) => setPriceInput(e.currentTarget.value)}
                />
              </label>
            </div>
            {!price.ok && <p class="error small">{t.priceInvalid}</p>}
          </div>
        )}
      </section>

      <div class="segmented">
        <button class={mode === 'single' ? 'selected' : ''} onClick={() => setMode('single')}>
          {t.modeSingle}
        </button>
        <button class={mode === 'grid' ? 'selected' : ''} onClick={() => setMode('grid')}>
          {t.modeGrid}
        </button>
      </div>

      <section class="card">
        <span class="label">{t.color}</span>
        <div class="chips">
          {colors.map((c) => (
            <button key={c} class={c === color ? 'chip selected' : 'chip'} onClick={() => setColorInput(c === color ? '' : c)}>
              {c}
            </button>
          ))}
        </div>
        <input
          class="input"
          value={colorInput}
          placeholder={t.colorPlaceholder}
          autocomplete="off"
          onInput={(e) => setColorInput(e.currentTarget.value)}
        />
      </section>

      <section class="card">
        <div class="label-row">
          <span class="label">{t.size}</span>
          <select class="select" value={sizeSet.id} aria-label={t.sizeSet} onChange={(e) => setSizeSetOverride(e.currentTarget.value)}>
            {SIZE_SETS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {mode === 'single' ? (
          <>
            <div class="chips">
              {sizeSet.sizes.map((s) => (
                <button
                  key={s}
                  class={s === size ? 'chip selected' : 'chip'}
                  onClick={() => {
                    setSizeChip(s === size ? '' : s)
                    setSizeCustom('')
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
            <input
              class="input"
              value={sizeCustom}
              placeholder={t.sizePlaceholder}
              autocomplete="off"
              onInput={(e) => setSizeCustom(e.currentTarget.value)}
            />

            <span class="label">{t.qty}</span>
            <div class="stepper">
              <button onClick={() => setQtyInput(String(Math.max(1, (isValidQty(qty) ? qty : 1) - 1)))}>−</button>
              <input
                class="input qty"
                type="number"
                inputMode="numeric"
                min={1}
                value={qtyInput}
                onInput={(e) => setQtyInput(e.currentTarget.value)}
              />
              <button onClick={() => setQtyInput(String((isValidQty(qty) ? qty : 0) + 1))}>+</button>
            </div>
          </>
        ) : (
          <ul class="grid">
            {sizeSet.sizes.map((s) => {
              const n = grid[s] ?? 0
              const counted = countedBySize.get(s)
              return (
                <li key={s}>
                  <span class="grid-size">{s}</span>
                  <span class="muted small grid-counted">{counted ? `${counted} ${t.pcs}` : ''}</span>
                  <button onClick={() => setGridQty(s, n - 1)} disabled={n === 0}>−</button>
                  <span class={n > 0 ? 'grid-qty active' : 'grid-qty'}>{n}</span>
                  <button onClick={() => setGridQty(s, n + 1)}>+</button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <button class="primary wide" disabled={!canSave} onClick={save}>
        {mode === 'single' ? t.save : t.saveAll(gridTotal)}
      </button>
      {missing.length > 0 && sku !== '' && <p class="muted small center">{t.missing(missing)}</p>}
      {message && <p class={message.kind === 'ok' ? 'flash ok' : 'flash error'}>{message.text}</p>}

      <section class="card">
        <h2>{t.recent}</h2>
        {recent.length === 0 ? (
          <p class="muted small">{t.noEntries}</p>
        ) : (
          <ul class="entries">
            {recent.map((e) => (
              <li key={e.id}>
                <div>
                  <div>{entryLabel(e)}</div>
                  <div class="muted small">
                    {e.location} · {new Date(e.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <button onClick={() => undo(e)} disabled={undoing.has(e.id)}>
                  {t.undo}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
