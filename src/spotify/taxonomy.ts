import { SpotifyClient } from './client';

export interface TaxonomyRule {
  prefix: string;
  description: string;
  regex: RegExp;
}

export const TAXONOMY_RULES: TaxonomyRule[] = [
  {
    prefix: '⭐ [FAVORITOS]',
    description: 'Your main tracks in rotation',
    regex: /^⭐ \[FAVORITOS\].*/,
  },
  {
    prefix: '🎸 [GÊNERO / ESTILO]',
    description: 'Thematic genre playlists (Rock, Jazz, Eletrônica, etc.)',
    regex: /^🎸 \[GÊNERO \/ ESTILO\].*/,
  },
  {
    prefix: '🧠 [FOCO / TRABALHO]',
    description: 'Instrumental, lo-fi, ambient for productivity',
    regex: /^🧠 \[FOCO \/ TRABALHO\].*/,
  },
  {
    prefix: '🚗 [ROADTRIP / VIAGEM]',
    description: 'Long playlists for travel',
    regex: /^🚗 \[ROADTRIP \/ VIAGEM\].*/,
  },
  {
    prefix: '📦 [ARQUIVO]',
    description: 'Old playlists kept for sentimental value',
    regex: /^📦 \[ARQUIVO\].*/,
  },
  {
    prefix: '🧹 [LIXEIRA / REPETIDAS]',
    description: 'Temporary holding area for duplicates',
    regex: /^🧹 \[LIXEIRA \/ REPETIDAS\].*/,
  },
];

export interface TaxonomyViolation {
  playlist: string;
  issue: string;
}

export async function validateTaxonomy(client: SpotifyClient): Promise<TaxonomyViolation[]> {
  const playlists = await client.getAllPlaylists();
  const violations: TaxonomyViolation[] = [];

  for (const playlist of playlists) {
    const matches = TAXONOMY_RULES.some(rule => rule.regex.test(playlist.name));

    if (!matches) {
      violations.push({
        playlist: playlist.name,
        issue: 'Playlist does not match any taxonomy prefix',
      });
    }
  }

  return violations;
}
