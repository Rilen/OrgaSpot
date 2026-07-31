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
    const BATCH_SIZE = 5;

    for (let i = 0; i < targetPlaylists.length; i += BATCH_SIZE) {
      const batch = targetPlaylists.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (pl) => {
          const tracks = await fetchAllPages(
            accessToken,
            `/playlists/${pl.id}/tracks`
          );
          return tracks.map((t) => ({
            track: t.track,
            addedAt: t.added_at,
            playlistId: pl.id,
            playlistName: pl.name,
          })).filter((t) => t.track?.id);
        })
      );

      for (const occurrences of batchResults) {
        for (const occ of occurrences) {
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
      const lixeiraDetails = await spotifyFetch(accessToken, `/playlists/${lixeira.id}`);
      lixeiraCount = lixeiraDetails.tracks.total;
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
    });
  } catch (err) {
    handleError(res, err);
  }
};
