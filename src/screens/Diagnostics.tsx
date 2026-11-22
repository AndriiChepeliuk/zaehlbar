import { useEffect, useState } from 'preact/hooks'
import { db, getSetting, setSetting } from '../db'
import { clearErrors, getErrors, subscribeErrors } from '../errorLog'
import { isStandalone, requestPersistence, usePersisted } from '../storage'
import { t } from '../strings'

// Diagnostics from stage 0: install, storage and persistence checks on the iPhone.

function formatBytes(n?: number): string {
  if (n === undefined) return '—'
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`
}

interface StorageInfo {
  usage?: number
  quota?: number
}

export function Diagnostics() {
  const [counter, setCounter] = useState<number | null>(null)
  const [firstOpened, setFirstOpened] = useState<number | null>(null)
  const [storage, setStorage] = useState<StorageInfo>({})
  const persisted = usePersisted()
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
    if (navigator.storage?.estimate) {
      const est = await navigator.storage.estimate()
      info.usage = est.usage
      info.quota = est.quota
    }
    setStorage(info)
  }

  async function requestPersist() {
    await requestPersistence()
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
    <>
      <header class="header">
        <h1>{t.diagTitle}</h1>
      </header>

      <section class="card">
        <h2>{t.storageTest}</h2>
        <p class="big">{counter ?? '…'}</p>
        <div class="row">
          <button class="primary" onClick={increment}>+1</button>
          <button onClick={resetDiag}>{t.reset}</button>
        </div>
        <p class="muted small">
          {t.storageTestHint}
          {firstOpened && <> {t.firstOpened} {new Date(firstOpened).toLocaleString()}</>}
        </p>
      </section>

      <section class="card">
        <h2>{t.status}</h2>
        <dl class="kv">
          <dt>{t.standalone}</dt>
          <dd>{isStandalone() ? `✅ ${t.yes}` : `⚠️ ${t.no}`}</dd>
          <dt>{t.persisted}</dt>
          <dd>{persisted === undefined ? '—' : persisted ? `✅ ${t.yes}` : `⚠️ ${t.no}`}</dd>
          <dt>{t.usage}</dt>
          <dd>{formatBytes(storage.usage)} / {formatBytes(storage.quota)}</dd>
          <dt>{t.online}</dt>
          <dd>{navigator.onLine ? t.yes : t.offline}</dd>
          <dt>{t.version}</dt>
          <dd>{new Date(__BUILD_TIME__).toLocaleString()}</dd>
        </dl>
        {persisted === false && <button onClick={requestPersist}>{t.requestPersist}</button>}
      </section>

      <section class="card">
        <h2>{t.errors(errors.length)}</h2>
        {errors.length === 0 ? (
          <p class="muted small">{t.noErrors}</p>
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
            <button onClick={clearErrors}>{t.clear}</button>
          </>
        )}
      </section>

      <p class="muted small center">
        <span class="muted small" style={{ userSelect: 'all' }}>{navigator.userAgent}</span>
      </p>
    </>
  )
}
