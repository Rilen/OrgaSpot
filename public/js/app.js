import storage from './modules/storage.js';
import { showToast, setLoading, showConfirmModal } from './modules/ui-helpers.js';
import apiClient from './modules/api-client.js';

/**
 * Application controller — handles routing, auth, and view orchestration.
 */

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'playlists', label: 'Playlists', icon: '🎵' },
  { id: 'duplicates', label: 'Varredura de Duplicadas', icon: '🔍' },
  { id: 'lixeira', label: 'Lixeira', icon: '🧹' },
  { id: 'creator', label: 'Nova Playlist', icon: '➕' },
  { id: 'export', label: 'Backup', icon: '💾' },
];

const state = {
  currentView: 'dashboard',
  user: null,
  playlists: [],
  duplicates: [],
  appState: null, // Full app state from dashboard API
};

/**
 * Initialize the application.
 */
export function initApp() {
  // Check for tokens in URL hash (OAuth callback)
  handleOAuthCallback();

  // Render navigation tabs
  renderNavTabs();

  // Set up auth button
  renderAuthSection();

  // Set up event listeners
  setupEventListeners();

  // Load initial data
  if (apiClient.isAuthenticated) {
    loadData();
  }
}

/**
 * Handle OAuth callback tokens from URL hash.
 */
function handleOAuthCallback() {
  const hash = window.location.hash.substring(1);
  if (!hash) return;

  const params = new URLSearchParams(hash);

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  const expiresIn = parseInt(params.get('expires_in') || '3600', 10);
  const error = params.get('error');

  if (error) {
    showToast(`Erro de autenticação: ${error}`, 'error');
  }

  if (accessToken) {
    apiClient.setTokens(accessToken, refreshToken || '', expiresIn);
    showToast('Conectado ao Spotify com sucesso!', 'success');
    window.location.hash = '';
    window.location.reload();
  }
}

function renderNavTabs() {
  const container = document.getElementById('navTabs');
  container.innerHTML = '';
  TABS.forEach((tab) => {
    const btn = document.createElement('button');
    btn.className = `nav-tab${state.currentView === tab.id ? ' active' : ''}`;
    btn.textContent = `${tab.icon} ${tab.label}`;
    btn.addEventListener('click', () => navigateTo(tab.id));
    container.appendChild(btn);
  });
}

function renderAuthSection() {
  const container = document.getElementById('authSection');
  container.innerHTML = '';

  if (apiClient.isAuthenticated) {
    const badge = document.createElement('div');
    badge.className = 'auth-badge auth-connected';
    badge.textContent = `✓ Conectado: ${state.user?.displayName || 'Spotify'}`;
    container.appendChild(badge);

    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'btn btn-ghost btn-sm';
    logoutBtn.textContent = 'Desconectar';
    logoutBtn.addEventListener('click', () => {
      apiClient.clearTokens();
      storage.clear();
      state.user = null;
      state.playlists = [];
      state.duplicates = [];
      window.location.reload();
    });
    container.appendChild(logoutBtn);
  } else {
    const connectBtn = document.createElement('button');
    connectBtn.className = 'btn btn-primary';
    connectBtn.innerHTML = '🔗 Conectar ao Spotify';
    connectBtn.addEventListener('click', async () => {
      setLoading(true);
      try {
        const url = await apiClient.getAuthUrl();
        window.location.href = url;
      } catch (err) {
        showToast(`Erro ao conectar: ${err.message}`, 'error');
      } finally {
        setLoading(false);
      }
    });
    container.appendChild(connectBtn);
  }
}

function setupEventListeners() {
  // Listen for hash changes (OAuth callback)
  window.addEventListener('hashchange', () => {
    handleOAuthCallback();
  });
}

function navigateTo(viewId) {
  state.currentView = viewId;
  renderNavTabs();

  document.querySelectorAll('.view-section').forEach((section) => {
    section.classList.toggle('active', section.id === `view-${viewId}`);
  });

  // Load view-specific data
  switch (viewId) {
    case 'dashboard':
      renderDashboard();
      break;
    case 'playlists':
      renderPlaylists();
      break;
    case 'duplicates':
      renderDuplicates();
      break;
    case 'lixeira':
      renderLixeira();
      break;
    case 'creator':
      renderCreator();
      break;
    case 'export':
      renderBackup();
      break;
  }
}

async function loadData() {
  setLoading(true);
  try {
    const data = await apiClient.get('/api/dashboard');
    state.appState = data;
    state.user = data.user;
    state.playlists = data.playlists;
    renderAuthSection();
    renderDashboard();
  } catch (err) {
    showToast(`Erro ao carregar dados: ${err.message}`, 'error');
  } finally {
    setLoading(false);
  }
}

// === View Renderers (lazy imports to avoid circular dependencies) ===

function renderDashboard() {
  import('./modules/dashboard.js').then((mod) => mod.renderDashboard(state));
}

function renderPlaylists() {
  import('./modules/playlists.js').then((mod) => mod.renderPlaylists(state));
}

function renderDuplicates() {
  import('./modules/duplicates-view.js').then((mod) => mod.renderDuplicates(state, apiClient));
}

function renderLixeira() {
  import('./modules/lixeira.js').then((mod) => mod.renderLixeira(state, apiClient));
}

function renderCreator() {
  import('./modules/playlist-creator.js').then((mod) =>
    mod.renderCreator(state, apiClient)
  );
}

function renderBackup() {
  import('./modules/backup.js').then((mod) => mod.renderBackup(state, apiClient));
}

// Expose navigation for potential cross-module calls
export { navigateTo, loadData, state };

// Initialize app
initApp();
