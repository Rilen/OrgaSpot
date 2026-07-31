import { SpotifyClient } from './client';
import * as fs from 'fs';
import * as path from 'path';

export async function exportPlaylists(
  client: SpotifyClient,
  format: 'json' | 'csv',
  outputDir: string,
): Promise<string[]> {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const playlists = await client.getAllPlaylists();
  const files: string[] = [];

  for (const playlist of playlists) {
    const tracks = await client.getPlaylistTracks(playlist.id);

    const trackData = tracks
      .filter(t => t.track)
      .map(t => ({
        name: t.track!.name,
        artists: t.track!.artists.map(a => a.name).join(', '),
        album: t.track!.album.name,
        uri: t.track!.uri,
        addedAt: t.added_at,
      }));

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseName = `${playlist.name.replace(/[\\/:*?"<>|]/g, '')}_${timestamp}`;

    let filePath: string;
    let content: string;

    if (format === 'json') {
      filePath = path.join(outputDir, `${baseName}.json`);
      content = JSON.stringify(
        {
          playlistName: playlist.name,
          tracks: trackData,
        },
        null,
        2,
      );
    } else {
      filePath = path.join(outputDir, `${baseName}.csv`);
      const header = 'Name,Artists,Album,URI,AddedAt\n';
      const rows = trackData
        .map(t => `"${t.name}","${t.artists}","${t.album}","${t.uri}","${t.addedAt}"`)
        .join('\n');
      content = header + rows;
    }

    fs.writeFileSync(filePath, content);
    files.push(filePath);
  }

  return files;
}
