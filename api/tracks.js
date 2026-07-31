const {
  getAccessToken,
  spotifyFetch,
  sendJson,
  handleError,
} = require('./_lib');

/**
 * POST /api/tracks/remove
 * Body: { playlistId: string, trackIds: string[] }
 * Removes specified tracks from a playlist.
 */
module.exports = async (req, res) => {
  try {
    const accessToken = getAccessToken(req);
    const { playlistId, trackIds } = req.body || {};

    if (!playlistId || !Array.isArray(trackIds) || trackIds.length === 0) {
      return sendJson(res, 400, {
        error: { message: 'playlistId and trackIds are required' },
      });
    }

    // Build the Track objects array (Spotify API expects {uri} objects)
    const tracks = trackIds
      .filter((id) => id)
      .map((id) => ({ uri: `spotify:track:${id}` }));

    // Remove tracks in batches of 100 (API limit)
    const results = [];
    for (let i = 0; i < tracks.length; i += 100) {
      const batch = tracks.slice(i, i + 100);
      await spotifyFetch(accessToken, `/playlists/${playlistId}/tracks`, {
        method: 'DELETE',
        body: JSON.stringify({ tracks }),
      });
      results.push({ batch: i / 100 + 1, removed: batch.length });
    }

    sendJson(res, 200, {
      message: `Removed ${tracks.length} tracks from playlist ${playlistId}`,
      results,
    });
  } catch (err) {
    handleError(res, err);
  }
};
