const {
  getAccessToken,
  spotifyFetch,
  fetchAllPages,
  sendJson,
  handleError,
} = require('./_lib');

/**
 * GET /api/export?access_token=...
 * Returns all playlist + track data formatted for CSV/JSON export.
 */
module.exports = async (req, res) => {
  try {
    const accessToken = getAccessToken(req);
    const { format } = req.query;

    // Fetch all playlists
    const playlists = await fetchAllPages(accessToken, '/me/playlists');

    // Fetch tracks for each playlist
    const exportData = await Promise.all(
      playlists.map(async (pl) => {
        const tracks = await fetchAllPages(
          accessToken,
          `/playlists/${pl.id}/tracks`
        );

        return {
          playlistId: pl.id,
          playlistName: pl.name,
          description: pl.description || '',
          trackCount: tracks.length,
          tracks: tracks
            .filter((t) => t.track)
            .map((t) => ({
              id: t.track.id,
              name: t.track.name,
              artists: t.track.artists.map((a) => a.name).join(', '),
              album: t.track.album?.name || '',
              uri: t.track.uri,
              addedAt: t.added_at,
            })),
        };
      })
    );

    if (format === 'csv') {
      // Build CSV
      const rows = [
        'Playlist,Track ID,Track Name,Artists,Album,URI,Added At',
      ];

      for (const pl of exportData) {
        for (const track of pl.tracks) {
          rows.push(
            [
              `"${pl.playlistName.replace(/"/g, '""')}"`,
              track.id,
              `"${track.name.replace(/"/g, '""')}"`,
              `"${track.artists.replace(/"/g, '""')}"`,
              `"${track.album.replace(/"/g, '""')}"`,
              track.uri,
              track.addedAt,
            ].join(',')
          );
        }
      }

      const csv = rows.join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="orgaspot-backup-${Date.now()}.csv"`
      );
      res.send(csv);
      return;
    }

    // Default: JSON
    sendJson(res, 200, {
      exportedAt: new Date().toISOString(),
      totalPlaylists: exportData.length,
      playlists: exportData,
    });
  } catch (err) {
    handleError(res, err);
  }
};
