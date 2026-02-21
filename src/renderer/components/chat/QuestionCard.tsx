import React, { useCallback } from 'react'
import type { ChatEvent } from '../../../types/chat-event'
import { CardHeader } from './CardHeader'
import { renderMessage } from '../../utils/renderMessage'
import './QuestionCard.css'

interface Props {
  event: ChatEvent
  isAnswered: boolean
  isFocused: boolean
  showAvatars: boolean
  showEmotes: boolean
  onFocusEvent: (event: ChatEvent) => void
}

export const QuestionCard = React.memo(function QuestionCard({ event, isAnswered, isFocused, showAvatars, showEmotes, onFocusEvent }: Props) {
  const handleClick = useCallback(() => onFocusEvent(event), [onFocusEvent, event])

  return (
    <div
      className={`question-card fade-in${isFocused ? ' question-card--focused' : ''}${isAnswered ? ' question-card--answered' : ''}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
    >
      <CardHeader event={event} showAvatars={showAvatars} cssPrefix="question-card">
        {isAnswered && <span className="question-card__answered-badge">✓ Answered</span>}
      </CardHeader>
      {event.message && (
        <div className="question-card__text">
          {renderMessage(event.message.text, event.platform, event.message.emotes, showEmotes)}
        </div>
      )}
    </div>
  )
})
