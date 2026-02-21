import type { LaneType } from '../../../types/chat-event'
import './LaneHeader.css'

interface Props {
  lane: LaneType
  count: number
  isFocused: boolean
  onClear: () => void
  onClick: () => void
}

const LANE_LABELS: Record<LaneType, string> = {
  alerts: '🔔 Alerts',
  questions: '❓ Questions',
  general: '💬 General'
}

export function LaneHeader({ lane, count, isFocused, onClear, onClick }: Props) {
  return (
    <div
      className={`lane-header${isFocused ? ' lane-header--focused' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      <span className="lane-header__label">{LANE_LABELS[lane]}</span>
      <span className="lane-header__count">{count}</span>
      <button
        className="lane-header__clear"
        onClick={(e) => { e.stopPropagation(); onClear() }}
        title="Clear lane (F5)"
      >
        ✕
      </button>
    </div>
  )
}
