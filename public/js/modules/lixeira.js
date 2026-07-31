import { showToast, showConfirmModal, setLoading } from './ui-helpers.js';
import apiClient from './api-client.js';

/**
 * Lixeira (trash) management view.
 */

const LIXEIRA_NAME = '🧹 [LIXEIRA / REPETIDAS]';

export async function renderLixeira(state, api) {
  const container = document.getElementById('lixeiraList');

  setLoading(true);
  container.innerHTML = '';

  try {
    // Find lixeira playlist from playlists data
    let lixeiraPlaylist = state.playlists?.find((p) => p.name === LIXEIRA_NAME);

    if (!lixeiraPlaylist || !state.lixeiraId) {
      // Try to find it from playlists
      const plData = await api.get('/api/playlists');
      lixeiraPlaylist = plData.playlists.find((p) => p.name === LIXEIRA_NAME);
    }

    state.lixeiraId = lixeiraPlaylist?.id || null;
    state.lixeiraCount = lixeiraPlaylist?.trackCount || 0;

    if (!state.lixeiraId) {
      container.innerHTML = `
        <div class="lixeira-empty">
          <p>Lixeira não encontrada. Crie uma playlist chamada "${LIXEIRA_NAME}" no Spotify.</p>
          <p>Depois escaneen duplicadas e mova-as para a lixeira.</p>
        </div>
      `;
      return;
    }

    // Fetch lixeira tracks directly from Spotify
    const tracks = await fetchLixeiraTracks(state.lixeiraId, api);

    if (tracks.length === 0) {
      container.innerHTML = `
        <div class="lixeira-empty">
          <p>A lixeira está vazia. ✅</p>
          <p style="color: var(--text-secondary); margin-top: 0.5rem;">
            Última esvaziamento: ${getLastEmptied()}
          </p>
        </div>
      `;
    } else {
      renderLixeiraTracks(tracks, container, state, api);
    }

    // Update dashboard stat if visible
    if (state.appState) {
      state.appState.stats.lixeiraCount = tracks.length;
    }
  } catch (err) {
    showToast(`Erro: ${err.message}`, 'error');
    container.innerHTML = `<p style="color: var(--danger);">Erro ao carregar lixeira: ${err.message}</p>`;
  } finally {
    setLoading(false);
  }
}

async function fetchLixeiraTracks(playlistId, api) {
  const tracks = [];
  let path = `/playlists/${playlistId}/tracks?limit=100&offset=0`;

  while (path) {
    const encodedPath = encodeURIComponent(path);
    const data = await api.get(`/api/spotify?path=${encodedPath}`);
    tracks.push(...data.items);
    if (data.next) {
      path = data.next.replace('https://api.spotify.com/v1/', '');
    } else {
      path = null;
    }
  }

  return tracks.map((t) => t.track).filter(Boolean);
}

function renderLixeiraTracks(tracks, container, state, api) {
  state.lixeiraTracks = tracks;

  const table = document.createElement('table');
  table.style.width = '100%';
  table.innerHTML = `
    <thead>
      <tr>
        <th style="text-align:left;padding:0.6rem;border-bottom:1px solid var(--border);">Faixa</th>
        <th style="text-align:left;padding:0.6rem;border-bottom:1px solid var(--border);">Artista</th>
        <th style="text-align:left;padding:0.6rem;border-bottom:1px solid var(--border);">Álbum</th>
        <th style="text-align:center;padding:0.6rem;border-bottom:1px solid var(--border);">Ações</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector('tbody');
  tracks.forEach((track) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td style="padding:0.5rem;border-bottom:1px solid var(--border);">${track.name}</td>
      <td style="padding:0.5rem;border-bottom:1px solid var(--border);color:var(--text-secondary);">${track.artists.map((a) => a.name).join(', ')}</td>
      <td style="padding:0.5rem;border-bottom:1px solid var(--border);color:var(--text-secondary);">${track.album?.name || ''}</td>
      <td style="padding:0.5rem;border-bottom:1px solid var(--border);">
        <button class="btn btn-danger btn-sm" data-track="${track.id}">Remover</button>
      </td>
    `;
    tbody.appendChild(row);
  });

  container.innerHTML = '';
  container.appendChild(table);

  // Action buttons for removing individual tracks
  tbody.querySelectorAll('[data-track]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const trackId = e.target.dataset.track;
      const confirmed = await showConfirmModal(
        'Remover da Lixeira',
        'Remover esta faixa da lixeira? Esta ação não pode ser desfeita.'
      );
      if (!confirmed) return;
      setLoading(true);
      try {
        await api.post('/api/tracks/remove', { playlistId: state.lixeiraId, trackIds: [trackId] });
        showToast('Faixa removida da lixeira.', 'success');
        renderLixeira(state, api);
      } catch (err) {
        showToast(`Erro: ${err.message}`, 'error');
      } finally {
        setLoading(false);
      }
    });
  });
}

export async function triggerEmpty(state, api) {
  const confirmed = await showConfirmModal(
    'Esvaziar Lixeira',
    `Tem certeza que deseja esvaziar a lixeira?\n\n` +
      `Esta ação removerá permanentemente ${state.lixeiraCount || 0} faixas da sua biblioteca.\n` +
      `Recomendado: esvaziar mensalmente para revisão final.`
  );

  if (!confirmed) return;

  setLoading(true);
  try {
    const res = await api.post('/api/modify', {
      action: 'empty-lixeira',
      lixeiraPlaylistId: state.lixeiraId,
    });

    showToast(res.message || 'Lixeira esvaziada.', 'success');
    storage_setLastEmptied();
    state.appState.stats.lixeiraCount = 0;
    renderLixeira(state, api);
  } catch (err) {
    showToast(`Erro: ${err.message}`, 'error');
  } finally {
    setLoading(false);
  }
}

function storage_setLastEmptied() {
  localStorage.setItem('orgaspot_lastEmptied', new Date().toISOString());
}

function getLastEmptied() {
  const last = localStorage.getItem('orgaspot_lastEmptied');
  if (!last) return 'Nunca';
  return new Date(last).toLocaleString('pt-BR');
}
