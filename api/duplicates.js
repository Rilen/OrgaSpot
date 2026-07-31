const {
  getAccessToken,
  spotifyFetch,
  fetchAllPages,
  sendJson,
  handleError,
} = require('./_lib');

const LIXEIRA_NAME = '🧹 [LIXEIRA / REPETIDAS]';

/**
 * GET /api/duplicates?access_token=...
 * Fetches all playlists + tracks, identifies duplicates.
 */
module.exports = async (req, res) => {
  try {
    const accessToken = getAccessToken(req);
    const playlists = await fetchAllPages(accessToken, '/me/playlists');

    // Filter out the lixeira playlist from duplicate analysis
    const targetPlaylists = playlists.filter((p) => p.name !== LIXEIRA_NAME);

    // Fetch all tracks from each playlist concurrently (with concurrency limit)
    const trackMap = new Map();
    const skipped = [];
    const BATCH_SIZE = 5;

    for (let i = 0; i < targetPlaylists.length; i += BATCH_SIZE) {
      const batch = targetPlaylists.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (pl) => {
          try {
            const tracks = await fetchAllPages(
              accessToken,
              `/playlists/${pl.id}/tracks`
            );
            return {
              pl,
              occurrences: tracks
                .map((t) => ({
                  track: t.track,
                  addedAt: t.added_at,
                  playlistId: pl.id,
                  playlistName: pl.name,
                }))
                .filter((t) => t.track?.id),
            };
          } catch (e) {
            // Skip inaccessible playlists (e.g. followed/restricted ones) instead of
            // aborting the whole scan.
            return {
              pl,
              error: e.message || 'unknown error',
            };
          }
        })
      );

      for (const result of batchResults) {
        if (result.error) {
          skipped.push({
            id: result.pl.id,
            name: result.pl.name,
            error: result.error,
          });
          continue;
        }
        for (const occ of result.occurrences) {
          const key = occ.track.id;
          if (!trackMap.has(key)) {
            trackMap.set(key, {
              id: key,
              name: occ.track.name,
              artists: occ.track.artists.map((a) => a.name),
              album: occ.track.album?.name || '',
              albumImageUrl: occ.track.album?.images?.[0]?.url || '',
              uri: occ.track.uri,
              occurrences: [],
            });
          }
          trackMap.get(key).occurrences.push({
            playlistId: occ.playlistId,
            playlistName: occ.playlistName,
            addedAt: occ.addedAt,
          });
        }
      }
    }

    const duplicates = Array.from(trackMap.values()).filter(
      (entry) => entry.occurrences.length > 1
    );

    // Sort by number of occurrences (descending)
    duplicates.sort((a, b) => b.occurrences.length - a.occurrences.length);

    const lixeira = playlists.find((p) => p.name === LIXEIRA_NAME);
    const hasLixeira = !!lixeira;

    let lixeiraCount = 0;
    if (hasLixeira && lixeira) {
      try {
        const lixeiraDetails = await spotifyFetch(
          accessToken,
          `/playlists/${lixeira.id}`
        );
        lixeiraCount = lixeiraDetails.tracks?.total || 0;
      } catch (e) {
        // Non-fatal — lixeira count is secondary to duplicate detection
        lixeiraCount = 0;
      }
    }

    sendJson(res, 200, {
      duplicates,
      totalCount: duplicates.length,
      totalDuplicateTracks: duplicates.reduce(
        (sum, d) => sum + d.occurrences.length - 1,
        0
      ),
      hasLixeira,
      lixeiraCount,
      lixeiraId: lixeira?.id || null,
      skippedPlaylists: skipped,
    });
  } catch (err) {
    handleError(res, err);
  }
};
