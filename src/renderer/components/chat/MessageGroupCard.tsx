import React, { useCallback } from 'react'
import type { ChatEvent } from '../../../types/chat-event'
import type { MessageGroup } from '../../utils/groupMessages'
import { CardHeader } from './CardHeader'
import { DockEffect } from './DockEffect'
import { renderMessage } from '../../utils/renderMessage'
import { formatTime } from '../../utils/formatTime'
import './MessageGroupCard.css'

interface Props {
  group: MessageGroup
  answeredIds: Set<string>
  focusedEventId: string | null
  showAvatars: boolean
  showEmotes: boolean
  onFocusEvent: (event: ChatEvent) => void
}

export const MessageGroupCard = React.memo(function MessageGroupCard({ group, answeredIds, focusedEventId, showAvatars, showEmotes, onFocusEvent }: Props) {
  const firstEvent = group.events[0]
  const isFocused = group.events.some(e => e.id === focusedEventId)
  const allAnswered = group.events.every(e => answeredIds.has(e.id))

  const handleGroupClick = useCallback(() => onFocusEvent(firstEvent), [onFocusEvent, firstEvent])

  return (
    <div
      className={`msg-group fade-in${isFocused ? ' msg-group--focused' : ''}${allAnswered ? ' msg-group--answered' : ''}`}
      onClick={handleGroupClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleGroupClick()}
    >
      {/* Dock timer side-effects — invisible */}
      {group.events.map(event => (
        <DockEffect key={`dock-${event.id}`} event={event} />
      ))}

      <CardHeader event={firstEvent} showAvatars={showAvatars} cssPrefix="msg-group" />

      <div className="msg-group__messages">
        {group.events.map((event, i) => (
          <div
            key={event.id}
            className={`msg-group__line${event.id === focusedEventId ? ' msg-group__line--focused' : ''}`}
            onClick={(e) => { e.stopPropagation(); onFocusEvent(event) }}
          >
            {i > 0 && (
              <span className="msg-group__line-time">{formatTime(event.timestamp)}</span>
            )}
            <span className="msg-group__line-text">
              {event.message
                ? renderMessage(event.message.text, event.platform, event.message.emotes, showEmotes)
                : null}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
})
