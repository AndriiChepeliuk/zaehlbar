import { useEffect, useState } from 'preact/hooks'
import { db, getSetting, setSetting } from './db'
import { clearErrors, getErrors, subscribeErrors } from './errorLog'

// Stage 0: diagnostics screen to verify install, storage and persistence on the iPhone.

function isStandalone(): boolean {
  return navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches
}

function formatBytes(n?: number): string {
  if (n === undefined) return '—'
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`
}

interface StorageInfo {
  persisted?: boolean
  usage?: number
  quota?: number
}

export function App() {
  const [counter, setCounter] = useState<number | null>(null)
  const [firstOpened, setFirstOpened] = useState<number | null>(null)
  const [storage, setStorage] = useState<StorageInfo>({})
  const [, rerender] = useState(0)

  useEffect(() => subscribeErrors(() => rerender((n) => n + 1)), [])

  useEffect(() => {
    void (async () => {
      setCounter(await getSetting('diag.counter', 0))
      let first = await getSetting<number | null>('diag.firstOpened', null)
      if (first === null) {
        first = Date.now()
        await setSetting('diag.firstOpened', first)
      }
      setFirstOpened(first)
      await refreshStorage()
    })()
  }, [])

  async function refreshStorage() {
    const info: StorageInfo = {}
    if (navigator.storage?.persisted) info.persisted = await navigator.storage.persisted()
    if (navigator.storage?.estimate) {
      const est = await navigator.storage.estimate()
      info.usage = est.usage
      info.quota = est.quota
    }
    setStorage(info)
  }

  async function requestPersist() {
    if (navigator.storage?.persist) await navigator.storage.persist()
    await refreshStorage()
  }

  async function increment() {
    const next = (counter ?? 0) + 1
    await setSetting('diag.counter', next)
    setCounter(next)
  }

  async function resetDiag() {
    await db.settings.bulkDelete(['diag.counter', 'diag.firstOpened'])
    setCounter(0)
    const now = Date.now()
    await setSetting('diag.firstOpened', now)
    setFirstOpened(now)
  }

  const errors = getErrors()

  return (
    <main class="page">
      <header class="header">
        <h1>Zählbar</h1>
        <span class="muted">Etappe 0 · Diagnose</span>
      </header>

      {!isStandalone() && (
        <p class="hint">
          Zum Home-Bildschirm hinzufügen: in Safari <strong>Teilen</strong> →{' '}
          <strong>Zum Home-Bildschirm</strong>. Nur so bleiben die Daten zuverlässig erhalten.
        </p>
      )}

      <section class="card">
        <h2>Speichertest</h2>
        <p class="big">{counter ?? '…'}</p>
        <div class="row">
          <button class="primary" onClick={increment}>+1</button>
          <button onClick={resetDiag}>Zurücksetzen</button>
        </div>
        <p class="muted small">
          Zahl erhöhen, App schließen und wieder öffnen — die Zahl muss bleiben.
          {firstOpened && <> Erster Start: {new Date(firstOpened).toLocaleString()}</>}
        </p>
      </section>

      <section class="card">
        <h2>Status</h2>
        <dl class="kv">
          <dt>Vom Home-Bildschirm</dt>
          <dd>{isStandalone() ? '✅ ja' : '⚠️ nein'}</dd>
          <dt>Dauerhafter Speicher</dt>
          <dd>{storage.persisted === undefined ? '—' : storage.persisted ? '✅ ja' : '⚠️ nein'}</dd>
          <dt>Belegt / verfügbar</dt>
          <dd>{formatBytes(storage.usage)} / {formatBytes(storage.quota)}</dd>
          <dt>Online</dt>
          <dd>{navigator.onLine ? 'ja' : 'nein (offline)'}</dd>
          <dt>Version</dt>
          <dd>{new Date(__BUILD_TIME__).toLocaleString()}</dd>
        </dl>
        {storage.persisted === false && (
          <button onClick={requestPersist}>Dauerhaften Speicher anfordern</button>
        )}
      </section>

      <section class="card">
        <h2>Fehler ({errors.length})</h2>
        {errors.length === 0 ? (
          <p class="muted small">Keine Fehler.</p>
        ) : (
          <>
            <ul class="errors">
              {errors.map((e) => (
                <li key={e.time + e.message}>
                  <span class="muted small">{new Date(e.time).toLocaleTimeString()}</span>
                  <pre>{e.message}</pre>
                </li>
              ))}
            </ul>
            <button onClick={clearErrors}>Leeren</button>
          </>
        )}
      </section>

      <p class="muted small center">
        <span class="muted small" style={{ userSelect: 'all' }}>{navigator.userAgent}</span>
      </p>
    </main>
  )
}
