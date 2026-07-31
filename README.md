# OrgaSpot

A CLI tool for cleaning up and organizing your Spotify account, implementing a governance blueprint for playlist management and duplicate removal.

## Overview

This project implements the Spotify Account Organization Blueprint:
1. **🧹 Lixeira/Repetidas** - Duplicate track management with lifecycle rules
2. **Taxonomy** - Structured playlist naming convention (⭐, 🎸, 🧠, 🚗, 📦)
3. **Governança** - Automated and manual cleanup workflows

## Quick Start

```bash
npm install
npm run dev
```

## Configuration

Create a `.env` file with your Spotify API credentials:

```
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:8888/callback
```

Get your credentials from [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).

## CLI Commands

| Command | Purpose |
|---|---|
| `orgaspot setup` | Creates 🧹 [LIXEIRA / REPETIDAS], ⭐ [FAVORITOS], 📦 [ARQUIVO] |
| `orgaspot scan-duplicates` | Finds tracks appearing in >1 playlist |
| `orgaspot move-duplicates` | Moves duplicates to lixeira playlist |
| `orgaspot empty-lixeira` | Monthly purge of lixeira (supports `--dry-run`) |
| `orgaspot export-playlists` | Backs up playlists to CSV/JSON |
| `orgaspot validate-taxonomy` | Checks playlists match naming convention |

## License

MIT
