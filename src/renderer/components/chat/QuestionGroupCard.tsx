import React, { useCallback } from 'react'
import type { QuestionGroup } from '../../../types/brain'
import { useChatStore } from '../../store/chat-store'
import { PlatformBadge } from './PlatformBadge'
import { formatTime } from '../../utils/formatTime'
import './QuestionGroupCard.css'

interface Props {
  group: QuestionGroup
}

const MAX_VISIBLE_ASKERS = 3

export const QuestionGroupCard = React.memo(function QuestionGroupCard({ group }: Props) {
  const markAnswered = useChatStore(s => s.markAnswered)

  const handleMarkAnswered = useCallback(() => {
    group.eventIds.forEach(id => markAnswered(id))
  }, [group.eventIds, markAnswered])

  const visibleAskers = group.askers.slice(0, MAX_VISIBLE_ASKERS)
  const overflowCount = group.askers.length - MAX_VISIBLE_ASKERS

  return (
    <div className="question-group-card fade-in">
      <div className="question-group-card__header">
        <span className="question-group-card__count-badge">
          {group.askers.length} asked
        </span>
        <span className="question-group-card__time">
          {formatTime(group.firstTimestamp)}
        </span>
      </div>

      <div className="question-group-card__text">
        {group.representativeText}
      </div>

      <div className="question-group-card__askers">
        {visibleAskers.map(asker => (
          <span key={asker.userId} className="question-group-card__asker">
            <PlatformBadge platform={asker.platform} />
            <span
              className="question-group-card__asker-name"
              style={asker.color ? { color: asker.color } : undefined}
            >
              {asker.displayName}
            </span>
          </span>
        ))}
        {overflowCount > 0 && (
          <span className="question-group-card__overflow">+{overflowCount} more</span>
        )}
      </div>

      <button
        className="question-group-card__answer-btn"
        onClick={handleMarkAnswered}
      >
        Mark Answered
      </button>
    </div>
  )
})
