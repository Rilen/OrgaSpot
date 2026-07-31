const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

const RAW_REDIRECT = process.env.SPOTIFY_REDIRECT_URI || 'https://orgaspot.vercel.app';
const REDIRECT_URI = RAW_REDIRECT.includes('/api/auth')
  ? RAW_REDIRECT
  : RAW_REDIRECT.replace(/\/$/, '') + '/api/auth';

const SPOTIFY_AUTH_BASE = 'https://accounts.spotify.com';
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

const SCOPES = [
  'playlist-read-private',
  'playlist-modify-private',
  'playlist-modify-public',
  'user-library-read',
  'user-library-modify',
  'user-read-private',
];

/**
 * Make an authenticated request to the Spotify API.
 * @param {string} accessToken - Spotify access token
 * @param {string} path - API path (e.g. '/me/playlists') or full URL
 * @param {object} [options] - fetch options
 */
async function spotifyFetch(accessToken, path, options = {}, retries = 0) {
  const url = path.startsWith('http') ? path : SPOTIFY_API_BASE + path;
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (response.status === 429 && retries < 3) {
    const retryAfter = parseInt(
      response.headers.get('Retry-After') || '2',
      10
    );
    const delay = Math.min(retryAfter * 1000, 10000);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return spotifyFetch(accessToken, path, options, retries + 1);
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      err.error?.message ||
        `Spotify API error: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Fetch all pages of a paginated Spotify endpoint.
 * @param {string} accessToken
 * @param {string} path - Starting endpoint path
 * @returns {Promise<Array>} All items combined
 */
async function fetchAllPages(accessToken, path) {
  const items = [];
  let url = path;

  while (url) {
    const data = await spotifyFetch(accessToken, url);
    items.push(...data.items);
    url = data.next;
  }

  return items;
}

/**
 * Generate the Spotify Authorization Code URL.
 */
function generateAuthUrl() {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES.join(' '),
    state: Math.random().toString(36).substring(2, 15),
  });
  return `${SPOTIFY_AUTH_BASE}/authorize?${params.toString()}`;
}

/**
 * Exchange an authorization code for access + refresh tokens.
 */
async function exchangeCodeForTokens(code) {
  const response = await fetch(`${SPOTIFY_AUTH_BASE}/api/token`, {
    method: 'POST',
    headers: {
      Authorization:
        'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error_description || 'Token exchange failed');
  }

  return response.json();
}

/**
 * Refresh an access token using a refresh token.
 */
async function refreshAccessToken(refreshToken) {
  const response = await fetch(`${SPOTIFY_AUTH_BASE}/api/token`, {
    method: 'POST',
    headers: {
      Authorization:
        'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error_description || 'Token refresh failed');
  }

  return response.json();
}

/**
 * Get the access token from the request headers.
 */
function getAccessToken(req) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization header');
  }
  return auth.slice(7);
}

/**
 * Send a JSON response.
 */
function sendJson(res, statusCode, data) {
  res.status(statusCode).json(data);
}

/**
 * Handle errors in a serverless function.
 */
function handleError(res, error) {
  const isAuthError =
    error.message.includes('401') ||
    error.message.includes('UNAUTHORIZED') ||
    error.message.includes('Missing or invalid Authorization') ||
    error.message.includes('Not authenticated');
  const status = isAuthError ? 401 : 500;
  sendJson(res, status, {
    error: {
      message: error.message,
      code: isAuthError ? 'UNAUTHORIZED' : 'INTERNAL_ERROR',
    },
  });
}

module.exports = {
  spotifyFetch,
  fetchAllPages,
  generateAuthUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  getAccessToken,
  sendJson,
  handleError,
  REDIRECT_URI,
  SPOTIFY_API_BASE,
};
