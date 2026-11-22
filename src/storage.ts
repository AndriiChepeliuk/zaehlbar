import { useEffect, useState } from 'preact/hooks'
import { logError } from './errorLog'

export function isStandalone(): boolean {
  return navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches
}

/**
 * Asks for persistent storage if it is not granted yet.
 * Returns undefined when the browser has no Storage API (nothing to report), otherwise the result.
 */
export async function ensurePersisted(): Promise<boolean | undefined> {
  if (!navigator.storage?.persisted) return undefined
  if (await navigator.storage.persisted()) return true
  if (!navigator.storage.persist) return false
  return navigator.storage.persist()
}

// One shared persistence state, so the banner and the diagnostics tab never disagree.
let persisted: boolean | undefined
const listeners = new Set<() => void>()

/** Requests persistence (on launch and from the diagnostics button) and publishes the outcome. */
export async function requestPersistence(): Promise<void> {
  try {
    persisted = await ensurePersisted()
  } catch (err) {
    logError(`storage.persist failed: ${String(err)}`)
    persisted = false
  }
  listeners.forEach((fn) => fn())
}

export function usePersisted(): boolean | undefined {
  const [, rerender] = useState(0)
  useEffect(() => {
    const fn = () => rerender((n) => n + 1)
    listeners.add(fn)
    return () => {
      listeners.delete(fn)
    }
  }, [])
  return persisted
}
