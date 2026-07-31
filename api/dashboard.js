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

    // Fetch profile
    const me = await spotifyFetch(accessToken, '/me');
    const userId = me.id;

    // Fetch all playlists
    const playlists = await fetchAllPages(accessToken, '/me/playlists');

    // Fetch tracks count for each playlist
    const playlistTrackCounts = await Promise.all(
      playlists.map(async (pl) => {
        const details = await spotifyFetch(accessToken, `/playlists/${pl.id}`);
        return {
          id: pl.id,
          name: pl.name,
          trackCount: details.tracks.total,
          isPublic: pl.public,
          externalUrls: pl.external_urls,
        };
      })
    );

    // Identify lixeira playlist
    const lixeiraName = '🧹 [LIXEIRA / REPETIDAS]';
    const lixeira = playlists.find((p) => p.name === lixeiraName);

    let lixeiraCount = 0;
    let lixeiraTracks = [];
    if (lixeira) {
      const lixeiraDetails = await spotifyFetch(accessToken, `/playlists/${lixeira.id}`);
      lixeiraCount = lixeiraDetails.tracks.total;
      const tracks = await fetchAllPages(accessToken, `/playlists/${lixeira.id}/tracks`);
      lixeiraTracks = tracks.map((t) => t.track).filter(Boolean);
    }

    // Find duplicates (simplified — uses same logic as /api/duplicates)
    const duplicateCount = await countDuplicates(accessToken, playlists, lixeiraName);

    // Calculate totals
    const totalTracks = playlistTrackCounts.reduce(
      (sum, p) => sum + p.trackCount,
      0
    );

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
      },
      playlists: playlistTrackCounts,
      lixeiraTracks,
    });
  } catch (err) {
    handleError(res, err);
  }
};

/**
 * Fetch all tracks for a set of playlists and count duplicates
 * (tracks appearing in more than one playlist, excluding lixeira).
 */
async function countDuplicates(accessToken, playlists, lixeiraName) {
  const nonLixeira = playlists.filter((p) => p.name !== lixeiraName);
  const trackMap = new Map();

  for (const pl of nonLixeira) {
    const tracks = await fetchAllPages(accessToken, `/playlists/${pl.id}/tracks`);
    for (const item of tracks) {
      if (!item.track?.id) continue;
      const key = item.track.id;
      if (!trackMap.has(key)) {
        trackMap.set(key, { count: 0, playlists: [] });
      }
      const entry = trackMap.get(key);
      entry.count += 1;
      entry.playlists.push(pl.id);
    }
  }

  let dupCount = 0;
  for (const entry of trackMap.values()) {
    if (entry.count > 1) {
      dupCount += entry.count - 1;
    }
  }
  return dupCount;
}
