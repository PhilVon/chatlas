import type { ChatEvent } from '../../../types/chat-event'
import { useDockTimer } from '../../hooks/useDockTimer'

export function DockEffect({ event }: { event: ChatEvent }) {
  useDockTimer(event)
  return null
}
