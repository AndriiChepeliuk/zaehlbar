// On-screen error log: there are no Safari dev tools on the iPhone without a Mac,
// so uncaught errors are collected here and shown in the app.

export interface LoggedError {
  time: number
  message: string
}

const MAX = 50
const errors: LoggedError[] = []
const listeners = new Set<() => void>()

export function logError(message: string): void {
  errors.unshift({ time: Date.now(), message })
  if (errors.length > MAX) errors.length = MAX
  listeners.forEach((fn) => fn())
}

export function getErrors(): readonly LoggedError[] {
  return errors
}

export function clearErrors(): void {
  errors.length = 0
  listeners.forEach((fn) => fn())
}

export function subscribeErrors(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function installGlobalErrorHandlers(): void {
  window.addEventListener('error', (e) => {
    logError(`${e.message} (${e.filename}:${e.lineno}:${e.colno})`)
  })
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason
    logError(`Unhandled rejection: ${r instanceof Error ? `${r.message}\n${r.stack ?? ''}` : String(r)}`)
  })
}
