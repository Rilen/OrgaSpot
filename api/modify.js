const {
  getAccessToken,
  spotifyFetch,
  sendJson,
  handleError,
} = require('./_lib');

const LIXEIRA_NAME = '🧹 [LIXEIRA / REPETIDAS]';

/**
 * POST /api/modify
 * Body: { action: 'move-duplicates' | 'empty-lixeira' | 'create-lixeira' }
 */
module.exports = async (req, res) => {
  try {
    const accessToken = getAccessToken(req);
    const { action, duplicateTrackIds, lixeiraPlaylistId } = req.body || {};

    if (!action) {
      return sendJson(res, 400, {
        error: { message: 'action is required' },
      });
    }

    switch (action) {
      case 'move-duplicates': {
        const { spotifyFetch: _sf, fetchAllPages } = require('./_lib');

        // Find or create lixeira playlist
        let targetPlaylistId = lixeiraPlaylistId;
        if (!targetPlaylistId) {
          // Check if lixeira exists
          const playlists = await fetchAllPages(accessToken, '/me/playlists');
          const existing = playlists.find((p) => p.name === LIXEIRA_NAME);
          targetPlaylistId = existing?.id || null;
          if (!existing) {
            // Create lixeira playlist
            const me = await _sf(accessToken, '/me');
            const created = await _sf(accessToken, `/users/${me.id}/playlists`, {
              method: 'POST',
              body: JSON.stringify({
                name: LIXEIRA_NAME,
                description: 'Tracks marked for removal',
                public: false,
              }),
            });
            targetPlaylistId = created.id;
          }
        }

        if (!duplicateTrackIds || duplicateTrackIds.length === 0) {
          return sendJson(res, 400, {
            error: { message: 'duplicateTrackIds is required for move-duplicates' },
          });
        }

        const uris = duplicateTrackIds.map((id) => `spotify:track:${id}`);

        // Add tracks to lixeira playlist
        for (let i = 0; i < uris.length; i += 100) {
          await spotifyFetch(accessToken, `/playlists/${targetPlaylistId}/tracks`, {
            method: 'POST',
            body: JSON.stringify({
             uris: uris.slice(i, i + 100),
              position: 0,
            }),
          });
        }

        sendJson(res, 200, {
          message: `Moved ${uris.length} tracks to lixeira`,
          lixeiraPlaylistId: targetPlaylistId,
        });
        return;
      }

      case 'empty-lixeira': {
        const { lixeiraPlaylistId: pid } = req.body || {};
        if (!pid) {
          return sendJson(res, 400, {
            error: { message: 'lixeiraPlaylistId is required for empty-lixeira' },
          });
        }

        // Get all tracks in lixeira
        const tracks = await fetchAllPages(
          accessToken,
          `/playlists/${pid}/tracks`
        );
        const trackUris = tracks
          .map((t) => t.track?.uri)
          .filter(Boolean);

        if (trackUris.length === 0) {
          return sendJson(res, 200, {
            message: 'Lixeira is already empty',
            removedCount: 0,
          });
        }

        // Remove in batches of 100
        for (let i = 0; i < trackUris.length; i += 100) {
          const batch = trackUris.slice(i, i + 100).map((uri) => ({ uri }));
          await spotifyFetch(accessToken, `/playlists/${pid}/tracks`, {
            method: 'DELETE',
            body: JSON.stringify({ tracks: batch }),
          });
        }

        sendJson(res, 200, {
          message: `Emptied lixeira: removed ${trackUris.length} tracks`,
          removedCount: trackUris.length,
        });
        return;
      }

      default:
        sendJson(res, 400, {
          error: { message: `Unknown action: ${action}` },
        });
    }
  } catch (err) {
    handleError(res, err);
  }
};
