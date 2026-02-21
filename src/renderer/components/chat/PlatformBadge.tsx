import type { Platform } from '../../../types/chat-event'
import twitchIcon from '../../assets/platform-icons/twitch.svg?url'
import youtubeIcon from '../../assets/platform-icons/youtube.svg?url'
import discordIcon from '../../assets/platform-icons/discord.svg?url'
import kickIcon from '../../assets/platform-icons/kick.svg?url'
import destinyggIcon from '../../assets/platform-icons/destinygg.svg?url'
import './PlatformBadge.css'

interface Props {
  platform: Platform
}

const ICONS: Record<string, string> = {
  twitch: twitchIcon,
  youtube: youtubeIcon,
  discord: discordIcon,
  destinygg: destinyggIcon,
  kick: kickIcon,
}

export function PlatformBadge({ platform }: Props) {
  const icon = ICONS[platform]
  return (
    <span className={`platform-badge platform-badge--${platform}`} title={platform}>
      {icon
        ? <img src={icon} alt={platform} className="platform-badge__icon" />
        : platform.slice(0, 2).toUpperCase()
      }
    </span>
  )
}
