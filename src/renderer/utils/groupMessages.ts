import type { ChatEvent } from '../../types/chat-event'

export interface MessageGroup {
  groupId: string
  events: ChatEvent[]
}

export function groupGeneralMessages(messages: ChatEvent[], groupGapMs: number, maxGroupSize: number): MessageGroup[] {
  const groups: MessageGroup[] = []

  for (const event of messages) {
    const last = groups[groups.length - 1]
    const lastEvent = last?.events[last.events.length - 1]

    const canExtend =
      last !== undefined &&
      lastEvent !== undefined &&
      last.events[0].user.platformUserId === event.user.platformUserId &&
      last.events[0].platform === event.platform &&
      event.timestamp - lastEvent.timestamp < groupGapMs &&
      last.events.length < maxGroupSize

    if (canExtend) {
      last.events.push(event)
    } else {
      groups.push({ groupId: event.id, events: [event] })
    }
  }

  return groups
}
