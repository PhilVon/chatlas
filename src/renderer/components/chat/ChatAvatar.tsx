import { useState } from 'react'
import './ChatAvatar.css'

// Module-level cache: URLs that have failed to load (e.g. 429) are skipped on
// re-renders and remounts instead of being requested again.
const failedAvatarUrls = new Set<string>()

interface Props {
  avatarUrl?: string
  displayName: string
  color?: string
  size?: number
}

export function ChatAvatar({ avatarUrl, displayName, color, size = 20 }: Props) {
  const [imgError, setImgError] = useState(false)

  const style = { width: size, height: size }
  const stripped = displayName.startsWith('@') ? displayName.slice(1) : displayName
  const initial = (stripped || displayName).charAt(0).toUpperCase()

  const alreadyFailed = avatarUrl != null && failedAvatarUrls.has(avatarUrl)
  if (avatarUrl && !imgError && !alreadyFailed) {
    return (
      <img
        className="chat-avatar"
        src={avatarUrl}
        alt={displayName}
        style={style}
        onError={() => { failedAvatarUrls.add(avatarUrl); setImgError(true) }}
      />
    )
  }

  return (
    <span
      className="chat-avatar chat-avatar--initials"
      style={{ ...style, backgroundColor: color ?? 'rgba(0,255,255,0.25)' }}
    >
      {initial}
    </span>
  )
}
