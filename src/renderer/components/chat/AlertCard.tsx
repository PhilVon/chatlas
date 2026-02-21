import React, { useCallback } from 'react'
import type { ChatEvent } from '../../../types/chat-event'
import { useAlertTimer } from '../../hooks/useAlertTimer'
import { CardHeader } from './CardHeader'
import { renderMessage } from '../../utils/renderMessage'
import './AlertCard.css'

interface Props {
  event: ChatEvent
  isFocused: boolean
  showAvatars: boolean
  showEmotes: boolean
  onFocusEvent: (event: ChatEvent) => void
}

const EVENT_LABELS: Record<string, string> = {
  sub: '⭐ Subscription',
  donation: '💰 Donation',
  follow: '💜 Follow',
  raid: '⚡ Raid',
  membership: '🎖 Membership',
  system: 'ℹ System',
  modNote: '🛡 Mod Note',
  message: '📣 Alert'
}

export const AlertCard = React.memo(function AlertCard({ event, isFocused, showAvatars, showEmotes, onFocusEvent }: Props) {
  useAlertTimer(event)
  const label = EVENT_LABELS[event.eventType] ?? event.eventType

  const handleClick = useCallback(() => onFocusEvent(event), [onFocusEvent, event])

  return (
    <div
      className={`alert-card glow-pulse fade-in${isFocused ? ' alert-card--focused' : ''}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
    >
      <div className="alert-card__type">{label}</div>
      <CardHeader event={event} showAvatars={showAvatars} cssPrefix="alert-card" />
      {event.message && (
        <div className="alert-card__text">
          {renderMessage(event.message.text, event.platform, event.message.emotes, showEmotes)}
        </div>
      )}
      {event.metadata && event.metadata['amount'] != null && (
        <div className="alert-card__meta">{String(event.metadata['amount'])}</div>
      )}
    </div>
  )
})
