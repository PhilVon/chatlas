import React, { type ReactNode } from 'react'
import type { ChatEvent } from '../../../types/chat-event'
import { ChatAvatar } from './ChatAvatar'
import { PlatformBadge } from './PlatformBadge'
import { UserBadge } from './UserBadge'
import { formatTime } from '../../utils/formatTime'

interface CardHeaderProps {
  event: ChatEvent
  showAvatars: boolean
  cssPrefix: string
  children?: ReactNode
}

export const CardHeader = React.memo(function CardHeader({ event, showAvatars, cssPrefix, children }: CardHeaderProps) {
  return (
    <div className={`${cssPrefix}__header`}>
      {showAvatars && (
        <ChatAvatar
          avatarUrl={event.user.avatarUrl}
          displayName={event.user.displayName}
          color={event.user.color}
        />
      )}
      <PlatformBadge platform={event.platform} />
      <UserBadge
        displayName={event.user.displayName}
        color={event.user.color}
        roles={event.user.roles}
      />
      {children}
      <span className={`${cssPrefix}__time`}>{formatTime(event.timestamp)}</span>
    </div>
  )
})
