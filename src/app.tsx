import { useEffect, useState } from 'preact/hooks'
import { getErrors, subscribeErrors } from './errorLog'
import { Counting } from './screens/Counting'
import { Diagnostics } from './screens/Diagnostics'
import { isStandalone, requestPersistence, usePersisted } from './storage'
import { t } from './strings'

type Tab = 'count' | 'diagnostics'

export function App() {
  const [tab, setTab] = useState<Tab>('count')
  const persisted = usePersisted()
  useEffect(() => {
    void requestPersistence()
  }, [])
  const [, rerender] = useState(0)
  useEffect(() => subscribeErrors(() => rerender((n) => n + 1)), [])
  const errorCount = getErrors().length

  return (
    <>
      <main class="page">
        {!isStandalone() && <p class="hint">{t.installHint}</p>}
        {persisted === false && <p class="hint">{t.persistDenied}</p>}
        {errorCount > 0 && tab !== 'diagnostics' && (
          <p class="hint">
            <button class="link" onClick={() => setTab('diagnostics')}>{t.errorsBanner(errorCount)}</button>
          </p>
        )}
        {/* Both stay mounted so switching tabs keeps the counting state. */}
        <div hidden={tab !== 'count'}>
          <Counting />
        </div>
        <div hidden={tab !== 'diagnostics'}>
          <Diagnostics />
        </div>
      </main>
      <nav class="tabbar">
        <button class={tab === 'count' ? 'selected' : ''} onClick={() => setTab('count')}>
          {t.tabCount}
        </button>
        <button class={tab === 'diagnostics' ? 'selected' : ''} onClick={() => setTab('diagnostics')}>
          {t.tabDiagnostics}
        </button>
      </nav>
    </>
  )
}
