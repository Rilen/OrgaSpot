const { getAccessToken, spotifyFetch, sendJson, handleError } = require('./_lib');

/**
 * GET/POST /api/spotify?path=...
 * Generic proxy to Spotify Web API v1.
 * - Pass `path` as a query parameter (e.g. /me/playlists)
 * - Access token via Authorization: Bearer header
 * - GET requests fetch data
 * - POST/PUT/DELETE requests forward req.body as JSON
 */
module.exports = async (req, res) => {
  try {
    const accessToken = getAccessToken(req);
    const path = req.query.path;

    if (!path) {
      return sendJson(res, 400, {
        error: { message: 'path query parameter is required' },
      });
    }

    const options = {};
    if (req.method !== 'GET') {
      options.method = req.method;
      if (req.body && typeof req.body === 'object') {
        options.body = JSON.stringify(req.body);
      }
    }

    const data = await spotifyFetch(accessToken, path, options);
    sendJson(res, 200, data);
  } catch (err) {
    handleError(res, err);
  }
};
