import { showToast, setLoading } from './ui-helpers.js';
import apiClient from './api-client.js';

/**
 * Dashboard view — renders stat cards and quick action buttons.
 */

export async function renderDashboard(state) {
  const container = document.getElementById('dashboardGrid');
  const actionsContainer = document.getElementById('quickActions');

  if (!state.appState) {
    setLoading(true);
    try {
      const data = await apiClient.get('/api/dashboard');
      state.appState = data;
      state.user = data.user;
      state.playlists = data.playlists;
    } catch (err) {
      showToast(`Erro: ${err.message}`, 'error');
      return;
    } finally {
      setLoading(false);
    }
  }

  const { stats } = state.appState;
  const totalTracks = stats.totalTracks || 0;
  const dupTracks = stats.duplicateTracks || 0;
  const lixeiraCount = stats.lixeiraCount || 0;

  container.innerHTML = `
    <div class="stat-card">
      <div class="stat-value">${stats.totalPlaylists}</div>
      <div class="stat-label">Total de Playlists</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${totalTracks.toLocaleString()}</div>
      <div class="stat-label">Total de Faixas</div>
    </div>
    <div class="stat-card${dupTracks > 0 ? ' danger' : ''}">
      <div class="stat-value">${dupTracks}</div>
      <div class="stat-label">Duplicatas Encontradas</div>
    </div>
    <div class="stat-card${lixeiraCount > 0 ? ' warning' : ''}">
      <div class="stat-value">${lixeiraCount}</div>
      <div class="stat-label">Na Lixeira</div>
    </div>
  `;

  actionsContainer.innerHTML = `
    <button class="btn btn-primary" id="scanBtn">
      🔍 Escanear Duplicadas
    </button>
    <button class="btn btn-ghost" id="validateBtn">
      📊 Validar Taxonomia
    </button>
    <button class="btn btn-ghost" id="exportBtn">
      💾 Backup
    </button>
    <button class="btn btn-ghost" id="emptyLixeiraBtn">
      🧹 Esvaziar Lixeira
    </button>
  `;

  document.getElementById('scanBtn').addEventListener('click', () => {
    import('./duplicates-view.js').then((mod) => mod.triggerScanExternal(state, apiClient));
  });
  document.getElementById('validateBtn').addEventListener('click', () => {
    import('./playlists.js').then((mod) => mod.validateTaxonomy());
  });
  document.getElementById('exportBtn').addEventListener('click', async () => {
    const app = await import('../app.js');
    app.navigateTo('export');
  });
  document.getElementById('emptyLixeiraBtn').addEventListener('click', () => {
    import('./lixeira.js').then((mod) => mod.triggerEmpty(state, apiClient));
  });
}
