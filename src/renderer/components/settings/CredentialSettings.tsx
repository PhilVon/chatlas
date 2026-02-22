import type { AppSettings } from '../../../types/settings'
import './CredentialSettings.css'

interface Props {
  settings: AppSettings
  onChange: (settings: AppSettings) => void
}

export function CredentialSettings({ settings, onChange }: Props) {
  const { credentials } = settings

  const update = (patch: Partial<typeof credentials>) =>
    onChange({ ...settings, credentials: { ...credentials, ...patch } })

  return (
    <div className="credential-settings">
      <div className="credential-settings__section">
        <div className="credential-settings__section-title">Twitch</div>
        <p className="credential-settings__note">
          Twitch uses anonymous IRC. No credentials required.
        </p>
      </div>

      <div className="credential-settings__section">
        <div className="credential-settings__section-title">YouTube</div>
        <p className="credential-settings__note">
          YouTube uses the internal InnerTube API. No credentials required.
        </p>
      </div>

      <div className="credential-settings__section">
        <div className="credential-settings__section-title">Discord</div>
        <div className="settings-field">
          <label className="settings-label">Discord Bot Token</label>
          <input
            className="credential-settings__input"
            type="password"
            autoComplete="off"
            placeholder="Bot token…"
            value={credentials.discordBotToken ?? ''}
            onChange={e => update({ discordBotToken: e.target.value || undefined })}
          />
        </div>
      </div>

      <div className="credential-settings__section">
        <div className="credential-settings__section-title">Destiny.gg</div>
        <p className="credential-settings__note">
          Optional. Authenticate using a login key from{' '}
          <strong>destiny.gg/profile/app</strong>.
        </p>
        <div className="settings-field">
          <label className="settings-label">DGG Auth Token</label>
          <input
            className="credential-settings__input"
            type="password"
            autoComplete="off"
            placeholder="Login key from destiny.gg/profile/app"
            value={credentials.dggAuthToken ?? ''}
            onChange={e => update({ dggAuthToken: e.target.value || undefined })}
          />
        </div>
      </div>
    </div>
  )
}
