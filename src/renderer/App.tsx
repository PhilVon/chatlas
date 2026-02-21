import { ChatApp } from './components/chat/ChatApp'
import { OverlayApp } from './components/overlay/OverlayApp'
import { useSettingsStore } from './store/settings-store'
import './App.css'

function isOverlayMode(): boolean {
  return new URLSearchParams(window.location.search).get('mode') === 'overlay'
}

export function App() {
  const crtEffect = useSettingsStore(s => s.settings.display.crtEffect)

  if (isOverlayMode()) {
    return <OverlayApp />
  }

  return (
    <div className={`app-container${crtEffect ? ' crt-effect' : ''}`}>
      <ChatApp />
    </div>
  )
}
