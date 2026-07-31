const {
  getAccessToken,
  spotifyFetch,
  fetchAllPages,
  sendJson,
  handleError,
} = require('./_lib');

const LIXEIRA_NAME = '🧹 [LIXEIRA / REPETIDAS]';

/**
 * GET /api/playlists?access_token=...
 * Returns all playlists with their taxonomy validation status.
 */
module.exports = async (req, res) => {
  try {
    const accessToken = getAccessToken(req);
    const playlists = await fetchAllPages(accessToken, '/me/playlists');

    // Use track count from playlist object (already included in /me/playlists response)
    const playlistData = playlists.map((pl) => {
      const taxonomy = validateTaxonomy(pl.name);

      return {
        id: pl.id,
        name: pl.name,
        description: pl.description || '',
        owner: pl.owner?.display_name || pl.owner?.id,
        trackCount: pl.tracks?.total || 0,
        isPublic: pl.public,
        isLixeira: pl.name === LIXEIRA_NAME,
        taxonomy: {
          valid: taxonomy.valid,
          category: taxonomy.category,
          suggestion: taxonomy.suggestion,
        },
        externalUrl: pl.external_urls?.spotify,
      };
    });

    sendJson(res, 200, { playlists: playlistData });
  } catch (err) {
    handleError(res, err);
  }
};

/**
 * Check if a playlist name matches the taxonomy convention.
 */
function validateTaxonomy(name) {
  const rules = [
    { prefix: '⭐ [FAVORITOS]', category: 'favoritos' },
    { prefix: '🎸 [GÊNERO / ESTILO]', category: 'genero' },
    { prefix: '🧠 [FOCO / TRABALHO]', category: 'foco' },
    { prefix: '🚗 [ROADTRIP / VIAGEM]', category: 'roadtrip' },
    { prefix: '📦 [ARQUIVO]', category: 'arquivo' },
    { prefix: '🧹 [LIXEIRA / REPETIDAS]', category: 'lixeira' },
  ];

  const match = rules.find((r) => name.startsWith(r.prefix));
  if (match) {
    return { valid: true, category: match.category, suggestion: null };
  }

  return {
    valid: false,
    category: 'desconhecido',
    suggestion: 'Renomeie para seguir a taxonomia: ⭐ [FAVORITOS], 🎸 [GÊNERO / ESTILO], etc.',
  };
}
