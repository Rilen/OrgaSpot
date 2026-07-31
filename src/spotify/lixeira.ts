import { SpotifyClient } from './client';
import { DuplicateEntry } from './duplicates';

export async function findOrCreateLixeira(
  client: SpotifyClient,
  lixeiraName: string = '🧹 [LIXEIRA / REPETIDAS]',
): Promise<string> {
  const playlists = await client.getAllPlaylists();
  const existing = playlists.find(p => p.name === lixeiraName);
  if (existing) return existing.id;
  return client.createPlaylist(lixeiraName, true);
}

export async function moveToLixeira(
  client: SpotifyClient,
  duplicates: DuplicateEntry[],
  lixeiraName: string = '🧹 [LIXEIRA / REPETIDAS]',
): Promise<number> {
  const lixeiraId = await findOrCreateLixeira(client, lixeiraName);
  let moved = 0;

  for (const dup of duplicates) {
    const occurrences = dup.occurrences;
    if (occurrences.length <= 1) continue;

    const toMove = occurrences.slice(1);
    const trackIds = toMove.map(() => dup.track.id);

    await client.addToPlaylist(lixeiraId, trackIds);

    for (const occ of toMove) {
      await client.removeFromPlaylist(occ.playlistId, [dup.track.id]);
      moved++;
    }
  }

  return moved;
}

export async function emptyLixeira(
  client: SpotifyClient,
  lixeiraName: string = '🧹 [LIXEIRA / REPETIDAS]',
  dryRun: boolean = false,
): Promise<number> {
  const playlists = await client.getAllPlaylists();
  const lixeira = playlists.find(p => p.name === lixeiraName);
  if (!lixeira) {
    console.log(`Lixeira playlist "${lixeiraName}" not found`);
    return 0;
  }

  const tracks = await client.getPlaylistTracks(lixeira.id);
  const trackIds = tracks.map(t => t.track?.id).filter(Boolean) as string[];

  if (dryRun) {
    return trackIds.length;
  }

  for (let i = 0; i < trackIds.length; i += 100) {
    const batch = trackIds.slice(i, i + 100);
    await client.removeFromPlaylist(lixeira.id, batch);
  }

  return trackIds.length;
}
