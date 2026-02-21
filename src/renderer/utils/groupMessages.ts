import type { ChatEvent } from '../../types/chat-event'

export interface MessageGroup {
  groupId: string
  events: ChatEvent[]
}

const GROUP_GAP_MS = 20_000   // break group if >20s between messages
const MAX_GROUP_SIZE = 6       // max messages per visual group

export function groupGeneralMessages(messages: ChatEvent[]): MessageGroup[] {
  const groups: MessageGroup[] = []

  for (const event of messages) {
    const last = groups[groups.length - 1]
    const lastEvent = last?.events[last.events.length - 1]

    const canExtend =
      last !== undefined &&
      lastEvent !== undefined &&
      last.events[0].user.platformUserId === event.user.platformUserId &&
      last.events[0].platform === event.platform &&
      event.timestamp - lastEvent.timestamp < GROUP_GAP_MS &&
      last.events.length < MAX_GROUP_SIZE

    if (canExtend) {
      last.events.push(event)
    } else {
      groups.push({ groupId: event.id, events: [event] })
    }
  }

  return groups
}
