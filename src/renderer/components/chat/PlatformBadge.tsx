import type { Platform } from '../../../types/chat-event'
import './PlatformBadge.css'

interface Props {
  platform: Platform
}

export function PlatformBadge({ platform }: Props) {
  const LABELS: Record<string, string> = { twitch: 'TW', youtube: 'YT', discord: 'DC', destinygg: 'DGG', kick: 'KI' }
  const label = LABELS[platform] ?? platform.slice(0, 2).toUpperCase()

  return (
    <span className={`platform-badge platform-badge--${platform}`}>
      {label}
    </span>
  )
}
