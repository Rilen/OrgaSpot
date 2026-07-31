# OrgaSpot - Spotify Account Organization Toolkit

A CLI tool for cleaning up and organizing your Spotify account, implementing a governance blueprint for playlist management and duplicate removal.

## Overview

This project implements the Spotify Account Organization Blueprint:
1. **🧹 Lixeira/Repetidas** - Duplicate track management with lifecycle rules
2. **Taxonomy** - Structured playlist naming convention (⭐, 🎸, 🧠, 🚗, 📦)
3. **Governança** - Automated and manual cleanup workflows

## Quick Start

```bash
npm install
npm run build
```

## Configuration

Create a `.env` file with your Spotify API credentials:

```
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:8888/callback
```

Get your credentials from [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).

## License

MIT
