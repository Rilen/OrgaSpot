const {
  getAccessToken,
  spotifyFetch,
  fetchAllPages,
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
        // Find or create lixeira playlist
        let targetPlaylistId = lixeiraPlaylistId;
        if (!targetPlaylistId) {
          // Check if lixeira exists
          const playlists = await fetchAllPages(accessToken, '/me/playlists');
          const existing = playlists.find((p) => p.name === LIXEIRA_NAME);
          targetPlaylistId = existing?.id || null;
          if (!existing) {
            // Create lixeira playlist
            const me = await spotifyFetch(accessToken, '/me');
            const created = await spotifyFetch(
              accessToken,
              `/users/${me.id}/playlists`,
              {
                method: 'POST',
                body: JSON.stringify({
                  name: LIXEIRA_NAME,
                  description: 'Tracks marked for removal',
                  public: false,
                }),
              }
            );
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

      case 'create-playlist': {
        const { name, trackUris } = req.body || {};
        if (!name) {
          return sendJson(res, 400, {
            error: { message: 'name is required for create-playlist' },
          });
        }

        const me = await spotifyFetch(accessToken, '/me');
        const playlist = await spotifyFetch(
          accessToken,
          `/users/${me.id}/playlists`,
          {
            method: 'POST',
            body: JSON.stringify({
              name,
              description: 'Created by OrgaSpot',
              public: false,
            }),
          }
        );

        if (trackUris && trackUris.length > 0) {
          for (let i = 0; i < trackUris.length; i += 100) {
            const batch = trackUris.slice(i, i + 100);
            await spotifyFetch(accessToken, `/playlists/${playlist.id}/tracks`, {
              method: 'POST',
              body: JSON.stringify({ uris: batch }),
            });
          }
        }

        sendJson(res, 200, {
          message: `Created playlist "${name}" with ${trackUris?.length || 0} tracks`,
          playlistId: playlist.id,
          name: playlist.name,
          trackCount: trackUris?.length || 0,
        });
        return;
      }

      case 'unfollow-playlist': {
        const { playlistId } = req.body || {};
        if (!playlistId) {
          return sendJson(res, 400, {
            error: { message: 'playlistId is required for unfollow-playlist' },
          });
        }

        await spotifyFetch(accessToken, `/playlists/${playlistId}/followers`, {
          method: 'DELETE',
        });

        sendJson(res, 200, {
          message: 'Playlist removida da sua biblioteca (deixou de seguir).',
          playlistId,
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
