import { useSessionStore } from '../../store/session-store'
import './ChatHeader.css'

interface Props {
  onSessionClick: () => void
  onSettingsClick: () => void
}

export function ChatHeader({ onSessionClick, onSettingsClick }: Props) {
  const sources = useSessionStore(s => s.sources)
  const connectedCount = sources.filter(s => s.status === 'connected').length
  const overlayOpen = useSessionStore(s => s.overlayOpen)
  const setOverlayOpen = useSessionStore(s => s.setOverlayOpen)

  const handleOverlayToggle = () => {
    if (overlayOpen) {
      void window.electronAPI.overlayClose()
      setOverlayOpen(false)
    } else {
      void window.electronAPI.overlayOpen()
      setOverlayOpen(true)
    }
  }

  return (
    <div className="chat-header">
      <div className="chat-header__brand">
        <span className="chat-header__title">ChAtlas</span>
        {connectedCount > 0 && (
          <span className="chat-header__status">
            <span className="chat-header__dot" />
            {connectedCount} live
          </span>
        )}
      </div>
      <div className="chat-header__actions">
        <button
          className={`chat-header__btn${overlayOpen ? ' chat-header__btn--active' : ''}`}
          onClick={handleOverlayToggle}
          title="Overlay"
        >
          {overlayOpen ? '◉ Overlay' : '○ Overlay'}
        </button>
        <button className="chat-header__btn" onClick={onSessionClick} title="Sources">
          ⚡ Sources
        </button>
        <button className="chat-header__btn" onClick={onSettingsClick} title="Settings">
          ⚙ Settings
        </button>
        <button
          className="chat-header__btn chat-header__btn--close"
          onClick={() => window.electronAPI.windowClose()}
          title="Close"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
