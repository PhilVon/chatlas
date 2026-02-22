# ChAtlas

A multi-platform streamer chat viewer for Windows. Organizes chat from Twitch, Discord, YouTube, Kick, and Destiny.gg into structured lanes with burst control, message pinning, and configurable hotkeys.

<img width="1200" height="800" alt="screenshot-ChAtlas" src="https://github.com/user-attachments/assets/0cbfdcbd-b470-41d8-97af-70b6158bad4d" />

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
- YouTube and Kick work anonymously — no credentials required

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

Sources are added from the **+** button in the session toolbar. Twitch, YouTube, Kick, and Destiny.gg work without credentials — just enter a channel name or Video ID. Discord requires a bot token; add it in **Settings → Credentials** first.

Credentials are stored locally in the Electron user data directory — never in the project files.

## Tech Stack

- **Electron 28** + **Vite 5** + **TypeScript 5**
- **React 18** + **Zustand** (state management)
- **tmi.js** (Twitch), **discord.js** (Discord), InnerTube API (YouTube), native WebSocket (Destiny.gg/Kick)

## License

MIT
