import { liveQuery } from 'dexie'
import { useEffect, useState } from 'preact/hooks'
import { logError } from './errorLog'

/**
 * Subscribes to a Dexie query and re-runs it when the data changes.
 * Returns undefined while loading, and also right after `deps` change, so a value from the
 * previous deps (for example the previous article) is never shown as the current one.
 */
export function useLiveQuery<T>(query: () => Promise<T>, deps: readonly unknown[]): T | undefined {
  const key = JSON.stringify(deps)
  const [state, setState] = useState<{ key: string; value: T } | null>(null)

  useEffect(() => {
    const sub = liveQuery(query).subscribe({
      next: (value) => setState({ key, value }),
      error: (err: unknown) => logError(`Query failed: ${err instanceof Error ? `${err.message}\n${err.stack ?? ''}` : String(err)}`),
    })
    return () => sub.unsubscribe()
  }, [key])

  return state !== null && state.key === key ? state.value : undefined
}
