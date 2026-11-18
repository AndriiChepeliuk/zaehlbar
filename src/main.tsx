import { render } from 'preact'
import { registerSW } from 'virtual:pwa-register'
import { installGlobalErrorHandlers, logError } from './errorLog'
import { App } from './app'
import './styles.css'

installGlobalErrorHandlers()

registerSW({
  immediate: true,
  onRegisterError: (err) => logError(`Service worker: ${String(err)}`),
})

render(<App />, document.getElementById('app')!)
