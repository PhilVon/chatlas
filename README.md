# ChAtlas

A multi-platform streamer chat viewer for Windows. Organizes chat from Twitch, Discord, YouTube, Kick, and Destiny.gg into structured lanes with burst control, message pinning, and configurable hotkeys.

<img width="1200" height="800" alt="screenshot-ChAtlas" src="https://github.com/user-attachments/assets/331224de-7cf6-490f-b384-0bb2d6ac1d1c" />

## Features

- **Multi-source chat**: Twitch, Discord, YouTube, Kick, Destiny.gg
- **Organized lanes**: General chat, Questions, Alerts — each with configurable burst limits
- **Topic clustering**: Groups related messages by keyword similarity; decay window and similarity threshold are adjustable
- **Question deduplication**: Collapses repeated questions from different users; sensitivity is configurable
- **Overlay window**: Frameless transparent window for OBS/stream layout with configurable item limit
- **Avatars & emotes**: Renders Discord/YouTube avatars and Twitch/Kick emotes inline
- **Pinning & hotkeys**: Pin important messages; global hotkeys configurable per action
- **Persistent settings**: Credentials, layout, and preferences saved between sessions

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- A Twitch account (for Twitch chat) — no OAuth required for read-only
- A Discord bot token (for Discord channels) with `MESSAGE_CONTENT` intent enabled
- A YouTube Data API v3 key (for YouTube live chat)
- Kick chat works anonymously — no credentials required

### Install & Run

```bash
npm install
npm run dev
```

### Build Installer (Windows)

```bash
npm run dist
```

Output goes to `release/`.

## Configuration

On first run, open **Settings → Credentials** and enter your platform tokens/keys. Sources are added from the **+** button in the session toolbar. Kick sources only require a channel name.

Credentials are stored locally in the Electron user data directory — never in the project files.

## Tech Stack

- **Electron 28** + **Vite 5** + **TypeScript 5**
- **React 18** + **Zustand** (state management)
- **tmi.js** (Twitch), **discord.js** (Discord), native WebSocket (YouTube/Destiny.gg/Kick)

## License

MIT
