import { useEffect } from 'react'
import { useChatStore } from '../../store/chat-store'
import { useSettingsStore } from '../../store/settings-store'
import { useIPC } from '../../hooks/useIPC'
import { QuestionCard } from '../chat/QuestionCard'
import { AlertCard } from '../chat/AlertCard'
import './OverlayApp.css'

const MAX_OVERLAY_QUESTIONS = 5

export function OverlayApp() {
  useIPC()
  const loadSettings = useSettingsStore(s => s.load)
  const overlayLane  = useSettingsStore(s => s.settings.overlay?.lane ?? 'questions')
  useEffect(() => { void loadSettings() }, [loadSettings])

  const questionMessages = useChatStore(s => s.lanes.questions.messages)
  const alertMessages    = useChatStore(s => s.lanes.alerts.messages)
  const answeredIds      = useChatStore(s => s.answeredIds)

  const visible = overlayLane === 'questions'
    ? questionMessages.filter(m => !answeredIds.has(m.id)).slice(0, MAX_OVERLAY_QUESTIONS)
    : alertMessages.slice(0, MAX_OVERLAY_QUESTIONS)

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
