# OrgaSpot

A web dashboard for organizing your Spotify account — find and clean up duplicate tracks across playlists with a governance framework for naming and management.

## Features

- **OAuth 2.0 Authentication** — connect your Spotify account securely
- **Dashboard** — overview of playlists, tracks, duplicates, and lixeira count
- **Duplicate Scanner** — detect tracks appearing in multiple playlists
- **Playlist Manager** — validate taxonomy, view all playlists
- **Lixeira** — temporarily hold duplicates for monthly review before permanent removal
- **Playlist Creator** — build a clean playlist from unique tracks
- **Backup** — export all playlist data to CSV or JSON

## Tech Stack

- **Frontend**: Vanilla HTML/CSS/JS (ES6 modules, dark theme, responsive)
- **Backend**: Vercel Serverless Functions (Node.js)
- **API**: Spotify Web API v1 (Authorization Code Flow)

## Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/Rilen/OrgaSpot.git
   cd OrgaSpot
   ```

2. Create a `.env` file from `.env.example`:
   ```bash
   cp .env.example .env
   ```

3. Get Spotify API credentials from [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   - Set Redirect URI to `http://localhost:3000/api/auth`
   - Enable Authorization Code Flow

4. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

5. Run locally:
   ```bash
   vercel dev
   ```

## Deployment to Vercel

1. Push to GitHub:
   ```bash
   git add -A
   git commit -m "feat: your message"
   git push origin main
   ```

2. Import the project in [Vercel Dashboard](https://vercel.com/new)

3. Set environment variables in Vercel Project Settings:
   - `SPOTIFY_CLIENT_ID`
   - `SPOTIFY_CLIENT_SECRET`
   - `SPOTIFY_REDIRECT_URI` → `https://your-app.vercel.app/api/auth`
   - `FRONTEND_URL` → `https://your-app.vercel.app/`

4. Update the Spotify Developer Dashboard with the Vercel URL as your Redirect URI

## Project Structure

```
OrgaSpot/
├── api/
│   ├── _lib.js        # Shared Spotify API utilities (not a route)
│   ├── auth.js        # OAuth URL generation + callback handling
│   ├── refresh.js     # Token refresh endpoint
│   ├── dashboard.js   # Dashboard statistics
│   ├── playlists.js   # Playlist listing with taxonomy validation
│   ├── duplicates.js  # Duplicate track detection
│   ├── modify.js      # Track operations (move, create, empty)
│   ├── tracks.js      # Remove tracks from playlist
│   ├── export.js      # CSV/JSON export
│   └── spotify.js     # Generic Spotify API proxy
├── public/
│   ├── index.html
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   ├── app.js              # Main entry point + routing
│   │   └── modules/
│   │       ├── storage.js       # localStorage wrapper
│   │       ├── ui-helpers.js    # Toasts, modals, loading
│   │       ├── api-client.js    # HTTP client for backend
│   │       ├── dashboard.js     # Dashboard rendering
│   │       ├── playlists.js     # Playlist view + taxonomy
│   │       ├── duplicates-view.js # Duplicate scanner UI
│   │       ├── lixeira.js       # Lixeira management
│   │       ├── playlist-creator.js # New playlist creator
│   │       └── backup.js        # Export/backup UI
│   └── assets/
│       └── favicon.svg
├── vercel.json
├── package.json
└── .env.example
```

## License

MIT
