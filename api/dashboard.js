const {
  getAccessToken,
  spotifyFetch,
  fetchAllPages,
  sendJson,
  handleError,
} = require('./_lib');

/**
 * GET /api/dashboard?access_token=...
 * Returns dashboard statistics and quick-action data.
 */
module.exports = async (req, res) => {
  try {
    const accessToken = getAccessToken(req);

    // Fetch profile (1 API call)
    const me = await spotifyFetch(accessToken, '/me');

    // Fetch all playlists (paginated, 1+ API calls)
    // Each playlist object already includes tracks.total — no extra fetch needed
    const playlists = await fetchAllPages(accessToken, '/me/playlists');

    // Build simplified playlist data using fields from the playlist object
    const playlistData = playlists.map((pl) => ({
      id: pl.id,
      name: pl.name,
      description: pl.description || '',
      trackCount: pl.tracks?.total || 0,
      isPublic: pl.public,
      externalUrls: pl.external_urls?.spotify || '',
    }));

    // Calculate totals (no additional API calls)
    const totalTracks = playlistData.reduce(
      (sum, p) => sum + p.trackCount,
      0
    );

    // Lixeira stats (from playlist object)
    const lixeiraName = '🧹 [LIXEIRA / REPETIDAS]';
    const lixeira = playlists.find((p) => p.name === lixeiraName);
    const lixeiraCount = lixeira?.tracks?.total || 0;

    // Duplicate count is deferred to /api/duplicates to reduce API calls
    const duplicateCount = 0;

    sendJson(res, 200, {
      user: {
        id: me.id,
        displayName: me.display_name,
        email: me.email,
        images: me.images,
      },
      stats: {
        totalPlaylists: playlists.length,
        totalTracks,
        duplicateTracks: duplicateCount,
        lixeiraCount,
        duplicateNote:
          'Clique em "Escanear Duplicadas" na aba de Varredura para obter a contagem exata.',
      },
      playlists: playlistData,
    });
  } catch (err) {
    handleError(res, err);
  }
};
