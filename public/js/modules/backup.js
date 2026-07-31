import { showToast, setLoading } from './ui-helpers.js';
import apiClient from './api-client.js';

/**
 * Backup / Export view — download playlist data as CSV or JSON.
 */

export function renderBackup(state, api) {
  const container = document.getElementById('exportPanel');

  container.innerHTML = `
    <h2>Backup de Playlists</h2>
    <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">
      Exporte todas as suas playlists como backup. Útil antes de realizar limpezas.
    </p>
    <div class="export-options">
      <label class="export-option">
        <input type="radio" name="exportFormat" value="json" checked> JSON
      </label>
      <label class="export-option">
        <input type="radio" name="exportFormat" value="csv"> CSV
      </label>
    </div>
    <button class="btn btn-primary" id="exportBtn" style="width: 100%;">
      💾 Exportar Dados
    </button>
    <div id="exportStatus" style="margin-top:1rem;"></div>
  `;

  document.getElementById('exportBtn').addEventListener('click', async () => {
    const format = document.querySelector('input[name="exportFormat"]:checked').value;
    await exportData(state, api, format);
  });
}

async function exportData(state, api, format) {
  const statusEl = document.getElementById('exportStatus');
  statusEl.innerHTML = '<p style="color:var(--text-secondary);">Exportando... 🔄</p>';
  setLoading(true);

  try {
    // For CSV: backend returns the file directly
    if (format === 'csv') {
      const accessToken = apiClient.accessToken;
      const response = await fetch(
        `/api/export?format=csv&access_token=${accessToken}`
      );

      if (!response.ok) throw new Error('Export failed');

      const csv = await response.text();
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orgaspot-backup-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      showToast('Backup CSV baixado com sucesso!', 'success');
      statusEl.innerHTML = '';
      return;
    }

    // For JSON: backend returns JSON, we trigger download
    const data = await api.get('/api/export?format=json');
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orgaspot-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showToast(`Backup JSON baixado: ${data.totalPlaylists} playlists.`, 'success');
    statusEl.innerHTML = '';
  } catch (err) {
    showToast(`Erro no export: ${err.message}`, 'error');
    statusEl.innerHTML = `<p style="color:var(--danger);">Erro: ${err.message}</p>`;
  } finally {
    setLoading(false);
  }
}

  // triggerExport removed — dashboard now navigates directly via app.js
