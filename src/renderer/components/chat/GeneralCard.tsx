import React, { useRef, useCallback } from 'react'
import type { ChatEvent } from '../../../types/chat-event'
import { CardHeader } from './CardHeader'
import { renderMessage } from '../../utils/renderMessage'
import { useDockTimer } from '../../hooks/useDockTimer'
import './GeneralCard.css'

interface Props {
  event: ChatEvent
  isAnswered: boolean
  isFocused: boolean
  showAvatars: boolean
  showEmotes: boolean
  onFocusEvent: (event: ChatEvent) => void
}

export const GeneralCard = React.memo(function GeneralCard({ event, isAnswered, isFocused, showAvatars, showEmotes, onFocusEvent }: Props) {
  const cardRef = useRef<HTMLDivElement>(null)
  useDockTimer(event)

  const handleClick = useCallback(() => onFocusEvent(event), [onFocusEvent, event])

  return (
    <div
      ref={cardRef}
      className={`general-card fade-in${isFocused ? ' general-card--focused' : ''}${isAnswered ? ' general-card--answered' : ''}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
    >
      <CardHeader event={event} showAvatars={showAvatars} cssPrefix="general-card" />
      {event.message && (
        <div className="general-card__text">
          {renderMessage(event.message.text, event.platform, event.message.emotes, showEmotes)}
        </div>
      )}
    </div>
  )
})
