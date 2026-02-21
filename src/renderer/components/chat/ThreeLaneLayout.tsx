import { useMemo } from 'react'
import type { ChatEvent, LaneType } from '../../../types/chat-event'
import { LaneColumn } from './LaneColumn'
import './ThreeLaneLayout.css'

interface Props {
  focusedEventId: string | null
  focusedLane: LaneType | null
  onFocusLane: (lane: LaneType) => void
  onFocusEvent: (event: ChatEvent) => void
}

const laneOrder: LaneType[] = ['alerts', 'questions', 'general']

export function ThreeLaneLayout({ focusedEventId, focusedLane, onFocusLane, onFocusEvent }: Props) {
  const focusLaneCallbacks = useMemo(
    () => Object.fromEntries(laneOrder.map(lane => [lane, () => onFocusLane(lane)])) as Record<LaneType, () => void>,
    [onFocusLane]
  )

  return (
    <div className="three-lane-layout">
      {laneOrder.map(lane => (
        <LaneColumn
          key={lane}
          lane={lane}
          focusedEventId={focusedEventId}
          isFocusedLane={focusedLane === lane}
          onFocusLane={focusLaneCallbacks[lane]}
          onFocusEvent={onFocusEvent}
        />
      ))}
    </div>
  )
}
