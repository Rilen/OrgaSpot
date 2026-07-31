import { showToast, showConfirmModal, setLoading } from './ui-helpers.js';
import apiClient from './api-client.js';

/**
 * Playlist management view — lists all playlists with taxonomy validation.
 */

export async function renderPlaylists(state) {
  const container = document.getElementById('playlistList');
  const legend = document.querySelector('.taxonomy-legend');

  // Render taxonomy legend
  legend.innerHTML = `
    <div class="taxonomy-tag valid">⭐ [FAVORITOS]</div>
    <div class="taxonomy-tag valid">🎸 [GÊNERO / ESTILO]</div>
    <div class="taxonomy-tag valid">🧠 [FOCO / TRABALHO]</div>
    <div class="taxonomy-tag valid">🚗 [ROADTRIP / VIAGEM]</div>
    <div class="taxonomy-tag valid">📦 [ARQUIVO]</div>
    <div class="taxonomy-tag valid">🧹 [LIXEIRA / REPETIDAS]</div>
  `;

  if (!state.playlists || state.playlists.length === 0) {
    container.innerHTML = '<p style="color: var(--text-secondary);">Nenhuma playlist encontrada.</p>';
    return;
  }

  setLoading(true);
  container.innerHTML = '';

  try {
    // Always fetch from playlists endpoint — dashboard data lacks taxonomy field
    const data = await apiClient.get('/api/playlists');
    state.playlists = data.playlists;

    state.playlists.forEach((pl) => {
      const badgeClass = pl.taxonomy?.valid ? 'ok' : 'warning';
      const badgeText = pl.taxonomy?.valid ? '✓ OK' : '⚠ Revisar';

      const card = document.createElement('div');
      card.className = 'playlist-card';
      card.innerHTML = `
        <div class="playlist-header">
          <div>
            <div class="playlist-name">${escapeHtml(pl.name)}</div>
            <div class="playlist-meta">
              ${pl.trackCount} faixas • ${pl.isPublic ? 'Pública' : 'Privada'}
            </div>
          </div>
          <span class="taxonomy-badge ${badgeClass}">${badgeText}</span>
        </div>
          ${
            !pl.taxonomy?.valid
              ? `<div style="font-size:0.75rem;color:var(--text-secondary);margin-top:0.4rem;">
                ${escapeHtml(pl.taxonomy?.suggestion || 'Renomeie para seguir a taxonomia.')}
               </div>`
              : ''
          }
      `;
      container.appendChild(card);
    });
  } catch (err) {
    showToast(`Erro ao carregar playlists: ${err.message}`, 'error');
  } finally {
    setLoading(false);
  }
}

/**
 * Run taxonomy validation and show results.
 */
export async function validateTaxonomy() {
  try {
    const data = await apiClient.get('/api/playlists');
    const violations = data.playlists.filter((p) => !p.taxonomy.valid);

    if (violations.length === 0) {
      showToast('Todas as playlists seguem a taxonomia!', 'success');
    } else {
      showToast(`${violations.length} playlists precisam de revisão de nome.`, 'warning');
    }
  } catch (err) {
    showToast(`Erro: ${err.message}`, 'error');
  }
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function escapeHtmlHelper(str) {
  return escapeHtml(str);
}
