import { useEffect } from 'react'
import { useChatStore } from '../store/chat-store'
import { useSessionStore } from '../store/session-store'

export function useIPC(): void {
  const addEvent = useChatStore(s => s.addEvent)
  const updateBurst = useChatStore(s => s.updateBurst)
  const markAnswered = useChatStore(s => s.markAnswered)
  const updateSourceStatus = useSessionStore(s => s.updateSourceStatus)

  useEffect(() => {
    const cleanupChat = window.electronAPI.onChatEvents((events) => {
      for (const event of events) addEvent(event)
    })

    const cleanupStatus = window.electronAPI.onPlatformStatus((payload) => {
      updateSourceStatus(payload)
    })

    const cleanupBurst = window.electronAPI.onBurstUpdate((summary) => {
      updateBurst(summary)
    })

    const cleanupAnswered = window.electronAPI.onMessageAnswered((eventId) => {
      markAnswered(eventId)
    })

    return () => {
      cleanupChat()
      cleanupStatus()
      cleanupBurst()
      cleanupAnswered()
    }
  }, [addEvent, updateBurst, markAnswered, updateSourceStatus])
}
