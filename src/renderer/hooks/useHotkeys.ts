import { useEffect, useRef } from 'react'
import { useChatStore } from '../store/chat-store'
import { useSessionStore } from '../store/session-store'
import type { ChatEvent, LaneType } from '../../types/chat-event'

interface HotkeyContext {
  focusedEvent: ChatEvent | null
  focusedLane: LaneType | null
  setFocusedEvent: (event: ChatEvent | null) => void
  setFocusedLane: (lane: LaneType | null) => void
}

export function useHotkeys(ctx: HotkeyContext): void {
  const { focusedLane, setFocusedEvent, setFocusedLane } = ctx

  const { markAnswered, clearLane, removeEvent } = useChatStore(s => ({
    markAnswered: s.markAnswered,
    clearLane: s.clearLane,
    removeEvent: s.removeEvent
  }))
  const questionMessages = useChatStore(s => s.lanes.questions.messages)
  const alertMessages = useChatStore(s => s.lanes.alerts.messages)
  const generalMessages = useChatStore(s => s.lanes.general.messages)
  const answeredIds = useChatStore(s => s.answeredIds)
  const overlayOpen = useSessionStore(s => s.overlayOpen)
  const setOverlayOpen = useSessionStore(s => s.setOverlayOpen)

  // Refs to avoid stale closures in the IPC listener
  const questionMessagesRef = useRef(questionMessages)
  questionMessagesRef.current = questionMessages
  const alertMessagesRef = useRef(alertMessages)
  alertMessagesRef.current = alertMessages
  const generalMessagesRef = useRef(generalMessages)
  generalMessagesRef.current = generalMessages
  const answeredIdsRef = useRef(answeredIds)
  answeredIdsRef.current = answeredIds
  const focusedLaneRef = useRef(focusedLane)
  focusedLaneRef.current = focusedLane
  const overlayOpenRef = useRef(overlayOpen)
  overlayOpenRef.current = overlayOpen

  useEffect(() => {
    const cleanup = window.electronAPI.onHotkey((action) => {
      if (action === 'answered') {
        const msgs = questionMessagesRef.current
        const answered = answeredIdsRef.current
        const first = msgs.find(m => !answered.has(m.id))
        if (first) {
          markAnswered(first.id)
          window.electronAPI.messageAnswered(first.id)
        }
      }

      if (action === 'cyclePlatform') {
        const lanes: LaneType[] = ['alerts', 'questions', 'general']
        const current = focusedLaneRef.current
        const idx = current ? lanes.indexOf(current) : -1
        const nextLane = lanes[(idx + 1) % lanes.length]
        setFocusedLane(nextLane)
        const firstEvent = (
          nextLane === 'questions' ? questionMessagesRef.current :
          nextLane === 'alerts'   ? alertMessagesRef.current :
                                    generalMessagesRef.current
        )[0] ?? null
        setFocusedEvent(firstEvent)
      }

      if (action === 'expand') {
        if (overlayOpenRef.current) {
          void window.electronAPI.overlayClose()
          setOverlayOpen(false)
        } else {
          void window.electronAPI.overlayOpen()
          setOverlayOpen(true)
        }
      }

      if (action === 'clearLane') {
        clearLane('questions')
        window.electronAPI.laneClear('questions')
      }

      if (action === 'clearAlerts') {
        const first = alertMessagesRef.current[0]
        if (first) removeEvent(first.id, 'alerts')
      }
    })
    return cleanup
  }, [markAnswered, clearLane, removeEvent, setFocusedEvent, setFocusedLane, setOverlayOpen])
}
