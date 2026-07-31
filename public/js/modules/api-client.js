import storage from './storage.js';

/**
 * API client for communicating with backend endpoints.
 * Manages authentication tokens and handles requests.
 */
class ApiClient {
  constructor() {
    this.accessToken = storage.get('accessToken') || null;
    this.refreshToken = storage.get('refreshToken') || null;
    this.expiresAt = storage.get('expiresAt') || null;
  }

  setTokens(accessToken, refreshToken, expiresIn) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.expiresAt = Date.now() + expiresIn * 1000;

    storage.set('accessToken', accessToken);
    storage.set('refreshToken', refreshToken);
    storage.set('expiresAt', this.expiresAt);
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    this.expiresAt = null;
    storage.remove('accessToken');
    storage.remove('refreshToken');
    storage.remove('expiresAt');
  }

  get isAuthenticated() {
    return !!this.accessToken;
  }

  /**
   * Check token expiry and refresh if needed.
   */
  async ensureValidToken() {
    if (!this.accessToken || !this.expiresAt) {
      throw new Error('Not authenticated');
    }

    if (Date.now() >= this.expiresAt - 60000) {
      await this.refreshAccessToken();
    }
  }

  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch('/api/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: this.refreshToken }),
    });

    if (!response.ok) {
      this.clearTokens();
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    const expiresIn = data.expiresIn || data.expires_in || 3600;
    this.setTokens(data.accessToken, this.refreshToken, expiresIn);
  }

  /**
   * Get the Spotify OAuth URL from the backend.
   */
  async getAuthUrl() {
    const response = await fetch('/api/auth');
    const data = await response.json();
    return data.url;
  }

  /**
   * Make an authenticated request to the backend.
   * @param {string} path - API path
   * @param {object} [options] - fetch options
   */
  async request(path, options = {}) {
    await this.ensureValidToken();

    const response = await fetch(path, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const errMessage = err.error?.message || `Request failed: ${response.statusText}`;

      if (response.status === 401) {
        this.clearTokens();
      }

      throw new Error(`${response.status}: ${errMessage}`);
    }

    return response.json();
  }

  async get(path) {
    return this.request(path);
  }

  async post(path, body) {
    return this.request(path, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }
}

const apiClient = new ApiClient();
export { ApiClient };
export default apiClient;
