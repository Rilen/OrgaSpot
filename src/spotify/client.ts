import SpotifyWebApi from 'spotify-web-api-node';
import dotenv from 'dotenv';
import open from 'open';

dotenv.config();

export class SpotifyClient {
  private api: SpotifyWebApi;
  private accessToken: string | null = null;

  constructor() {
    this.api = new SpotifyWebApi({
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      redirectUri: process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:8888/callback',
    });
  }

  public async authenticate(): Promise<void> {
    const scopes = [
      'playlist-read-private',
      'playlist-modify-private',
      'playlist-modify-public',
      'user-library-read',
      'user-library-modify',
    ];

    const state = Math.random().toString(36).substring(2, 15);

    const authorizeURL = this.api.createAuthorizeURL(scopes, state);

    console.log('Opening browser for Spotify authentication...');
    console.log('If browser does not open, visit this URL:');
    console.log(authorizeURL);

    await open(authorizeURL);

    const code = await this.getAuthCodeFromUser();

    const data = await this.api.authorizationCodeGrant(code);
    this.accessToken = data.body['access_token'];

    this.api.setAccessToken(this.accessToken);
    this.api.setRefreshToken(data.body['refresh_token']);

    console.log('Authentication successful!');
  }

  private getAuthCodeFromUser(): Promise<string> {
    return new Promise(resolve => {
      process.stdout.write('Enter the authorization code from the callback URL: ');
      process.stdin.once('data', data => {
        resolve(data.toString().trim());
      });
    });
  }

  public getApi(): SpotifyWebApi {
    return this.api;
  }

  public async getCurrentUserId(): Promise<string> {
    const me = await this.api.getMe();
    return me.body.id;
  }

  public async getAllPlaylists(): Promise<SpotifyApi.PlaylistObjectSimplified[]> {
    const userId = await this.getCurrentUserId();
    const playlists: SpotifyApi.PlaylistObjectSimplified[] = [];
    let offset = 0;
    const limit = 50;
    let hasMore = true;

    while (hasMore) {
      const response = await this.api.getUserPlaylists(userId, { limit, offset });
      playlists.push(...response.body.items);
      offset += limit;
      hasMore = response.body.next !== null && response.body.items.length === limit;
    }

    return playlists;
  }

  public async getPlaylistTracks(playlistId: string): Promise<SpotifyApi.PlaylistTrackObject[]> {
    const tracks: SpotifyApi.PlaylistTrackObject[] = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const response = await this.api.getPlaylistTracks(playlistId, { limit, offset });
      tracks.push(...response.body.items);
      offset += limit;
      hasMore = response.body.next !== null && response.body.items.length === limit;
    }

    return tracks;
  }

  public async createPlaylist(name: string, isPublic: boolean): Promise<string> {
    const response = await this.api.createPlaylist(name, {
      public: isPublic,
      description: 'Created by OrgaSpot',
    });
    return response.body.id;
  }

  public async addToPlaylist(playlistId: string, trackIds: string[]): Promise<void> {
    const uris = trackIds.map(id => `spotify:track:${id}`);
    for (let i = 0; i < uris.length; i += 100) {
      const batch = uris.slice(i, i + 100);
      await this.api.addTracksToPlaylist(playlistId, batch);
    }
  }

  public async removeFromPlaylist(playlistId: string, trackIds: string[]): Promise<void> {
    const uris = trackIds.map(id => `spotify:track:${id}`);
    for (let i = 0; i < uris.length; i += 100) {
      const batch = uris.slice(i, i + 100);
      const tracks = batch.map(uri => ({ uri }));
      await this.api.removeTracksFromPlaylist(playlistId, tracks);
    }
  }
}
