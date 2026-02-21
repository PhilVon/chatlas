import { useEffect } from 'react'
import { useChatStore } from '../../store/chat-store'
import { useSettingsStore } from '../../store/settings-store'
import { useIPC } from '../../hooks/useIPC'
import { QuestionCard } from '../chat/QuestionCard'
import { AlertCard } from '../chat/AlertCard'
import './OverlayApp.css'

export function OverlayApp() {
  useIPC()
  const loadSettings    = useSettingsStore(s => s.load)
  const overlayLane     = useSettingsStore(s => s.settings.overlay?.lane ?? 'questions')
  const maxOverlayItems = useSettingsStore(s => s.settings.overlay?.maxOverlayItems ?? 5)
  useEffect(() => { void loadSettings() }, [loadSettings])

  const questionMessages = useChatStore(s => s.lanes.questions.messages)
  const alertMessages    = useChatStore(s => s.lanes.alerts.messages)
  const answeredIds      = useChatStore(s => s.answeredIds)

  const visible = overlayLane === 'questions'
    ? questionMessages.filter(m => !answeredIds.has(m.id)).slice(0, maxOverlayItems)
    : alertMessages.slice(0, maxOverlayItems)

  return (
    <div className="overlay-app">
      <div className="overlay-grip" title="Drag to move" />
      {visible.map(event => (
        <div className="overlay-card-wrapper" key={event.id}>
          {overlayLane === 'questions'
            ? <QuestionCard event={event} isAnswered={false} isFocused={false}
                showAvatars showEmotes onFocusEvent={() => undefined} />
            : <AlertCard event={event} isFocused={false}
                showAvatars showEmotes onFocusEvent={() => undefined} />
          }
        </div>
      ))}
    </div>
  )
}
