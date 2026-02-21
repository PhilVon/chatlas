import './UserBadge.css'


interface Props {
  displayName: string
  color?: string
  roles?: string[]
}

export function UserBadge({ displayName, color, roles = [] }: Props) {
  const isMod = roles.includes('mod')
  const isBroadcaster = roles.includes('broadcaster')
  const isSub = roles.includes('subscriber') || roles.includes('member')

  return (
    <span
      className={`user-badge${isBroadcaster ? ' user-badge--broadcaster' : isMod ? ' user-badge--mod' : isSub ? ' user-badge--sub' : ''}`}
      style={color ? { color } : undefined}
    >
      {isBroadcaster && <span className="user-badge__icon">★</span>}
      {!isBroadcaster && isMod && <span className="user-badge__icon">⚔</span>}
      {displayName}
    </span>
  )
}
