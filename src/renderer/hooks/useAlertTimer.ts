import { useEffect } from 'react'
import { useChatStore } from '../store/chat-store'
import { useSettingsStore } from '../store/settings-store'
import type { ChatEvent } from '../../types/chat-event'

export function useAlertTimer(event: ChatEvent): void {
  const removeEvent = useChatStore(s => s.removeEvent)
  const alertAutoClearMs = useSettingsStore(s => s.settings.lanes.alertAutoClearMs)

  useEffect(() => {
    if (alertAutoClearMs === 0) return

    const timer = setTimeout(() => {
      removeEvent(event.id, event.lane)
    }, alertAutoClearMs)

    return () => clearTimeout(timer)
  }, [event.id, event.lane, alertAutoClearMs, removeEvent])
}
