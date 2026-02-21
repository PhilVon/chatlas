import { useState, useEffect } from 'react'
import type { ChatEvent, LaneType } from '../../../types/chat-event'
import { useIPC } from '../../hooks/useIPC'
import { useHotkeys } from '../../hooks/useHotkeys'
import { useSettingsStore } from '../../store/settings-store'
import { useSessionStore } from '../../store/session-store'
import { ChatHeader } from './ChatHeader'
import { ThreeLaneLayout } from './ThreeLaneLayout'
import { SessionPanel } from '../session/SessionPanel'
import { SettingsModal } from '../settings/SettingsModal'
import './ChatApp.css'

export function ChatApp() {
  const [focusedEvent, setFocusedEvent] = useState<ChatEvent | null>(null)
  const [focusedLane, setFocusedLane] = useState<LaneType | null>(null)
  const [showSession, setShowSession] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const loadSettings = useSettingsStore(s => s.load)
  const setSources = useSessionStore(s => s.setSources)

  // Mount: load IPC listeners, settings, sources
  useIPC()

  useEffect(() => {
    void loadSettings()

    void window.electronAPI.sourceList().then(sources => {
      setSources(sources)
    })
  }, [loadSettings, setSources])

  useHotkeys({
    focusedEvent,
    focusedLane,
    setFocusedEvent,
    setFocusedLane
  })

  return (
    <div className="chat-app">
      <ChatHeader
        onSessionClick={() => setShowSession(true)}
        onSettingsClick={() => setShowSettings(true)}
      />
      <ThreeLaneLayout
        focusedEventId={focusedEvent?.id ?? null}
        focusedLane={focusedLane}
        onFocusLane={(lane) => {
          setFocusedLane(lane)
          setFocusedEvent(null)
        }}
        onFocusEvent={(event) => {
          setFocusedEvent(event)
          setFocusedLane(event.lane)
        }}
      />
      {showSession && (
        <SessionPanel onClose={() => setShowSession(false)} />
      )}
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
  )
}
