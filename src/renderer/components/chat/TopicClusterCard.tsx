import React, { useCallback } from 'react'
import type { TopicCluster } from '../../../types/cluster'
import type { ChatEvent } from '../../../types/chat-event'
import { PlatformBadge } from './PlatformBadge'
import { ChatAvatar } from './ChatAvatar'
import { DockEffect } from './DockEffect'
import { renderMessage } from '../../utils/renderMessage'
import { formatTime } from '../../utils/formatTime'
import './TopicClusterCard.css'

interface Props {
  cluster: TopicCluster
  answeredIds: Set<string>
  focusedEventId: string | null
  showAvatars: boolean
  showEmotes: boolean
  tier?: 'hot' | 'warm' | 'cold'
  onFocusEvent: (event: ChatEvent) => void
  onExpand: (clusterId: string) => void
}

const PREVIEW_COUNT = 2

function participantList(cluster: TopicCluster): string {
  const seedAuthorId = cluster.messages[0]?.user.platformUserId
  const seen = new Set<string>()
  const names: string[] = []
  for (const msg of cluster.messages) {
    if (msg.user.platformUserId === seedAuthorId) continue
    if (!seen.has(msg.user.platformUserId)) {
      seen.add(msg.user.platformUserId)
      names.push(msg.user.displayName)
    }
  }
  if (names.length === 0) return ''
  if (names.length <= 3) return names.join(', ')
  return names.slice(0, 3).join(', ') + ` +${names.length - 3}`
}

export const TopicClusterCard = React.memo(function TopicClusterCard({
  cluster,
  tier,
  showAvatars,
  showEmotes,
  onFocusEvent,
  onExpand
}: Props) {
  const firstMsg = cluster.messages[0]
  const isSingleton = cluster.messages.length === 1
  const tierClass = tier ? ` chat-topic-cluster--${tier}` : ''

  const handleFirstMsgClick = useCallback(() => onFocusEvent(firstMsg), [onFocusEvent, firstMsg])
  const handleExpandClick = useCallback(() => onExpand(cluster.clusterId), [onExpand, cluster.clusterId])

  if (isSingleton) {
    return (
      <div
        className={`topic-cluster-card topic-cluster-card--singleton fade-in${tierClass}`}
        onClick={handleFirstMsgClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleFirstMsgClick()}
      >
        <DockEffect event={firstMsg} />
        <div className="topic-cluster-card__row">
          {showAvatars && (
            <ChatAvatar
              avatarUrl={firstMsg.user.avatarUrl}
              displayName={firstMsg.user.displayName}
              color={firstMsg.user.color}
            />
          )}
          <PlatformBadge platform={firstMsg.platform} />
          <span
            className="topic-cluster-card__username"
            style={firstMsg.user.color ? { color: firstMsg.user.color } : undefined}
          >
            {firstMsg.user.displayName}
          </span>
          <span className="topic-cluster-card__time">{formatTime(firstMsg.timestamp)}</span>
        </div>
        {firstMsg.message && (
          <div className="topic-cluster-card__text">
            {renderMessage(firstMsg.message.text, firstMsg.platform, firstMsg.message.emotes, showEmotes)}
          </div>
        )}
      </div>
    )
  }

  const replyMessages = cluster.messages.slice(1)
  const participants = participantList(cluster)
  const visibleReplies = cluster.isExpanded ? replyMessages : replyMessages.slice(-PREVIEW_COUNT)
  const hiddenCount = Math.max(0, replyMessages.length - PREVIEW_COUNT)

  return (
    <div className={`topic-cluster-card topic-cluster-card--multi fade-in${tierClass}`}>
      {cluster.messages.map(msg => (
        <DockEffect key={`dock-${msg.id}`} event={msg} />
      ))}
      <div
        className="topic-cluster-card__strip"
        onClick={handleExpandClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleExpandClick()}
      >
        <span className="topic-cluster-card__strip-count">{cluster.messages.length} msgs</span>
        {participants && (
          <span className="topic-cluster-card__strip-participants">· {participants}</span>
        )}
        <span className="topic-cluster-card__expand-btn">
          {cluster.isExpanded ? '▲' : '▼'}
        </span>
      </div>
      <div
        className="topic-cluster-card__seed"
        onClick={handleFirstMsgClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleFirstMsgClick()}
      >
        <div className="topic-cluster-card__seed-meta">
          {showAvatars && (
            <ChatAvatar
              avatarUrl={firstMsg.user.avatarUrl}
              displayName={firstMsg.user.displayName}
              color={firstMsg.user.color}
            />
          )}
          <PlatformBadge platform={firstMsg.platform} />
          <span
            className="topic-cluster-card__username"
            style={firstMsg.user.color ? { color: firstMsg.user.color } : undefined}
          >
            {firstMsg.user.displayName}
          </span>
          <span className="topic-cluster-card__time">{formatTime(firstMsg.timestamp)}</span>
        </div>
        {firstMsg.message && (
          <div className="topic-cluster-card__seed-text">
            {renderMessage(firstMsg.message.text, firstMsg.platform, firstMsg.message.emotes, showEmotes)}
          </div>
        )}
      </div>
      {replyMessages.length > 0 && (
        <div className="topic-cluster-card__replies">
          {visibleReplies.map(msg => (
            <div
              key={msg.id}
              className="topic-cluster-card__row"
              onClick={() => onFocusEvent(msg)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onFocusEvent(msg)}
            >
              <PlatformBadge platform={msg.platform} />
              <span
                className="topic-cluster-card__username"
                style={msg.user.color ? { color: msg.user.color } : undefined}
              >
                {msg.user.displayName}
              </span>
              <span className="topic-cluster-card__msg-text">
                {msg.message ? renderMessage(msg.message.text, msg.platform, msg.message.emotes, showEmotes) : undefined}
              </span>
            </div>
          ))}
        </div>
      )}
      {!cluster.isExpanded && hiddenCount > 0 && (
        <button
          className="topic-cluster-card__more-btn"
          onClick={handleExpandClick}
        >
          +{hiddenCount} more
        </button>
      )}
    </div>
  )
})
