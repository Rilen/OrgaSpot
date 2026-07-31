import { SpotifyClient } from './client';

export interface DuplicateEntry {
  track: {
    artist: string;
    name: string;
    uri: string;
    id: string;
  };
  occurrences: {
    playlistId: string;
    playlistName: string;
    addedAt: string;
  }[];
}

export async function findDuplicates(client: SpotifyClient): Promise<DuplicateEntry[]> {
  const playlists = await client.getAllPlaylists();
  const trackMap = new Map<string, DuplicateEntry>();

  for (const playlist of playlists) {
    const tracks = await client.getPlaylistTracks(playlist.id);

    for (const item of tracks) {
      if (!item.track || !item.track.id) continue;

      const key = item.track.id;

      if (!trackMap.has(key)) {
        trackMap.set(key, {
          track: {
            artist: item.track.artists.map(a => a.name).join(', '),
            name: item.track.name,
            uri: item.track.uri,
            id: item.track.id,
          },
          occurrences: [],
        });
      }

      const entry = trackMap.get(key)!;
      entry.occurrences.push({
        playlistId: playlist.id,
        playlistName: playlist.name,
        addedAt: item.added_at,
      });
    }
  }

  const duplicates: DuplicateEntry[] = [];
  for (const entry of trackMap.values()) {
    if (entry.occurrences.length > 1) {
      duplicates.push(entry);
    }
  }

  return duplicates.sort((a, b) => b.occurrences.length - a.occurrences.length);
}
