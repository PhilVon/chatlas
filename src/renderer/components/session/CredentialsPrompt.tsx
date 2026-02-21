import './CredentialsPrompt.css'

interface Props {
  platform: 'twitch' | 'youtube' | 'discord' | 'destinygg' | 'kick'
}

export function CredentialsPrompt({ platform }: Props) {
  if (platform === 'twitch') {
    return (
      <div className="credentials-prompt">
        <span className="credentials-prompt__icon">ℹ</span>
        <span>
          Twitch chat works without credentials via anonymous IRC.
          Just enter a channel name below.
        </span>
      </div>
    )
  }

  if (platform === 'kick') {
    return (
      <div className="credentials-prompt">
        <span className="credentials-prompt__icon">ℹ</span>
        <span>
          Kick chat works anonymously without credentials.
          Just enter a channel name below.
        </span>
      </div>
    )
  }

  if (platform === 'destinygg') {
    return (
      <div className="credentials-prompt">
        <span className="credentials-prompt__icon">ℹ</span>
        <span>
          Destiny.gg chat works anonymously without credentials.
          To connect as yourself, add your <strong>auth token</strong> in{' '}
          <strong>Settings → Credentials</strong>.
        </span>
      </div>
    )
  }

  if (platform === 'discord') {
    return (
      <div className="credentials-prompt credentials-prompt--warn">
        <span className="credentials-prompt__icon">⚠</span>
        <span>
          Discord requires a bot token with the <strong>Message Content Intent</strong> enabled.
          Add your token in <strong>Settings → Credentials</strong> first.
        </span>
      </div>
    )
  }

  return (
    <div className="credentials-prompt credentials-prompt--warn">
      <span className="credentials-prompt__icon">⚠</span>
      <span>
        YouTube requires a Data API v3 key and a live <strong>Video ID</strong>.
        Add your API key in <strong>Settings → Credentials</strong> first.
      </span>
    </div>
  )
}
