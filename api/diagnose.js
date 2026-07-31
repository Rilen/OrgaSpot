const {
  getAccessToken,
  spotifyFetch,
  sendJson,
  handleError,
} = require('./_lib');

/**
 * GET /api/diagnose
 * Diagnostic endpoint — verifies the token's validity and effective scopes.
 */
module.exports = async (req, res) => {
  try {
    const accessToken = getAccessToken(req);

    let me = null;
    let playlistsOk = false;
    let playlistsError = null;
    let playlistTracksOk = false;
    let playlistTracksError = null;

    // Test /me
    try {
      me = await spotifyFetch(accessToken, '/me');
    } catch (e) {
      // continue — capture error below
    }

    // Test /me/playlists (needs playlist-read-private)
    try {
      const playlists = await spotifyFetch(accessToken, '/me/playlists?limit=1');
      playlistsOk = !!playlists.items;
    } catch (e) {
      playlistsError = e.message;
    }

    // Test reading tracks of one playlist (if any returned)
    try {
      const playlists = await spotifyFetch(accessToken, '/me/playlists?limit=1');
      const first = playlists?.items?.[0];
      if (first?.id) {
        const tracks = await spotifyFetch(
          accessToken,
          `/playlists/${first.id}/tracks?limit=1`
        );
        playlistTracksOk = !!tracks.items;
      } else {
        playlistTracksOk = true;
      }
    } catch (e) {
      playlistTracksError = e.message;
    }

    sendJson(res, 200, {
      tokenPresent: !!accessToken,
      tokenPrefix: accessToken ? accessToken.slice(0, 8) + '...' : null,
      profile: me
        ? { id: me.id, displayName: me.display_name }
        : null,
      profileError: me ? null : 'Não foi possível obter /me',
      scopes: me ? me : null,
      testPlaylists: {
        ok: playlistsOk,
        error: playlistsError,
      },
      testPlaylistTracks: {
        ok: playlistTracksOk,
        error: playlistTracksError,
      },
      note: 'Para verificar scopes efetivos, use o token: decode a parte central do JWT em jwt.io',
    });
  } catch (err) {
    handleError(res, err);
  }
};
