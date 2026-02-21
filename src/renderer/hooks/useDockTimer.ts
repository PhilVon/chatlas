import { useEffect } from 'react'
import { useChatStore } from '../store/chat-store'
import { useSettingsStore } from '../store/settings-store'
import type { ChatEvent } from '../../types/chat-event'

export function useDockTimer(event: ChatEvent): void {
  const removeEvent = useChatStore(s => s.removeEvent)
  const dockDurationMs = useSettingsStore(s => s.settings.dock.dockDurationMs)

  useEffect(() => {
    if (event.lane !== 'general') return

    const timer = setTimeout(() => {
      removeEvent(event.id, event.lane)
    }, dockDurationMs)

    return () => clearTimeout(timer)
  }, [event.id, event.lane, dockDurationMs, removeEvent])
}
