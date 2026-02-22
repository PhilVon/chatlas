import { useState } from 'react'
import type { Platform } from '../../../types/chat-event'
import type { SourceConfig } from '../../../types/session'
import { useSessionStore } from '../../store/session-store'
import { CredentialsPrompt } from './CredentialsPrompt'
import './AddSourceModal.css'

interface Props {
  onClose: () => void
}

export function AddSourceModal({ onClose }: Props) {
  const [platform, setPlatform] = useState<Platform>('twitch')
  const [channel, setChannel] = useState('')
  const [videoId, setVideoId] = useState('')
  const [channelId, setChannelId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const setSources = useSessionStore(s => s.setSources)

  const handleAdd = async () => {
    setError(null)
    setLoading(true)

    if (platform === 'twitch' && !channel.trim()) {
      setError('Channel name is required')
      setLoading(false)
      return
    }

    if (platform === 'youtube' && !videoId.trim()) {
      setError('Video ID is required')
      setLoading(false)
      return
    }

    if (platform === 'discord' && !channelId.trim()) {
      setError('Channel ID is required')
      setLoading(false)
      return
    }

    if (platform === 'kick' && !channel.trim()) {
      setError('Channel name is required')
      setLoading(false)
      return
    }

    const config: SourceConfig = {
      type: platform,
      ...(platform === 'twitch' ? { channel: channel.replace('#', '').trim() } : {}),
      ...(platform === 'youtube' ? { videoId: videoId.trim() } : {}),
      ...(platform === 'discord' ? { discordChannelId: channelId.trim() } : {}),
      ...(platform === 'kick' ? { channel: channel.trim() } : {})
    }

    const result = await window.electronAPI.sourceAdd(config)
    setLoading(false)

    if (!result.ok) {
      setError(result.error ?? 'Failed to add source')
      return
    }

    const sources = await window.electronAPI.sourceList()
    setSources(sources)
    onClose()
  }

  return (
    <div className="add-source-modal-overlay" onClick={onClose}>
      <div className="add-source-modal" onClick={e => e.stopPropagation()}>
        <div className="add-source-modal__header">
          <h3>Add Source</h3>
          <button className="add-source-modal__close" onClick={onClose}>✕</button>
        </div>

        <div className="add-source-modal__body">
          <div className="add-source-modal__field">
            <label>Platform</label>
            <div className="add-source-modal__tabs">
              <button
                className={`add-source-modal__tab${platform === 'twitch' ? ' add-source-modal__tab--active' : ''}`}
                onClick={() => setPlatform('twitch')}
              >
                Twitch
              </button>
              <button
                className={`add-source-modal__tab${platform === 'youtube' ? ' add-source-modal__tab--active' : ''}`}
                onClick={() => setPlatform('youtube')}
              >
                YouTube
              </button>
              <button
                className={`add-source-modal__tab${platform === 'discord' ? ' add-source-modal__tab--active' : ''}`}
                onClick={() => setPlatform('discord')}
              >
                Discord
              </button>
              <button
                className={`add-source-modal__tab${platform === 'destinygg' ? ' add-source-modal__tab--active' : ''}`}
                onClick={() => setPlatform('destinygg')}
              >
                Destiny.gg
              </button>
              <button
                className={`add-source-modal__tab${platform === 'kick' ? ' add-source-modal__tab--active' : ''}`}
                onClick={() => setPlatform('kick')}
              >
                Kick
              </button>
            </div>
          </div>

          <CredentialsPrompt platform={platform} />

          {platform === 'twitch' && (
            <div className="add-source-modal__field">
              <label>Channel Name</label>
              <input
                className="add-source-modal__input"
                type="text"
                placeholder="e.g. shroud"
                value={channel}
                onChange={e => setChannel(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && void handleAdd()}
                autoFocus
              />
            </div>
          )}

          {platform === 'youtube' && (
            <div className="add-source-modal__field">
              <label>Video ID</label>
              <input
                className="add-source-modal__input"
                type="text"
                placeholder="e.g. dQw4w9WgXcQ"
                value={videoId}
                onChange={e => setVideoId(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && void handleAdd()}
                autoFocus
              />
            </div>
          )}

          {platform === 'discord' && (
            <div className="add-source-modal__field">
              <label>Channel ID</label>
              <input
                className="add-source-modal__input"
                type="text"
                placeholder="e.g. 1234567890123456789"
                value={channelId}
                onChange={e => setChannelId(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && void handleAdd()}
                autoFocus
              />
            </div>
          )}

          {platform === 'kick' && (
            <div className="add-source-modal__field">
              <label>Channel Name</label>
              <input
                className="add-source-modal__input"
                type="text"
                placeholder="e.g. xqc"
                value={channel}
                onChange={e => setChannel(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && void handleAdd()}
                autoFocus
              />
            </div>
          )}

          {error && <div className="add-source-modal__error">{error}</div>}
        </div>

        <div className="add-source-modal__footer">
          <button className="add-source-modal__btn add-source-modal__btn--cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            className="add-source-modal__btn add-source-modal__btn--add"
            onClick={() => void handleAdd()}
            disabled={loading}
          >
            {loading ? 'Connecting…' : 'Add Source'}
          </button>
        </div>
      </div>
    </div>
  )
}
