import { showToast, showConfirmModal, setLoading } from './ui-helpers.js';
import apiClient from './api-client.js';

/**
 * New Playlist creator view — create a clean playlist from duplicate tracks.
 */

export function renderCreator(state, api) {
  const container = document.getElementById('creatorPanel');
  if (!container) return;

  if (state.duplicates.length === 0) {
    container.innerHTML = `
      <h2>Nova Playlist Limpa</h2>
      <p style="color: var(--text-secondary); margin-bottom: 1rem;">
        Escaneie duplicatas na aba "Varredura de Duplicadas" antes de criar uma nova playlist.
      </p>
    `;
    return;
  }

  const allTrackIds = [
    ...new Map(
      state.duplicates.map((d) => [
        d.id,
        {
          id: d.id,
          name: d.name,
          artists: d.artists,
          uri: d.uri,
        },
      ])
    ).values(),
  ];

  container.innerHTML = `
    <h2>Nova Playlist Limpa</h2>
    <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">
      Crie uma nova playlist com as faixas únicas (sem duplicatas) selecionadas abaixo.
    </p>
    <form id="createPlaylistForm" style="margin-bottom: 1.5rem;">
      <div style="margin-bottom: 1rem;">
        <label style="display:block;font-size:0.85rem;margin-bottom:0.4rem;">Nome da Playlist</label>
        <input type="text" id="playlistName" placeholder="Ex: Minha Playlist Limpa"
          style="width:100%;padding:0.6rem;border:1px solid var(--border);border-radius:8px;background:var(--bg-card);color:var(--text-primary);font-size:0.9rem;" required>
      </div>
      <div style="margin-bottom: 1rem;">
        <label style="display:flex;align-items:center;gap:0.4rem;font-size:0.85rem;cursor:pointer;">
          <input type="checkbox" id="addAllTracks" checked style="accent-color:var(--spotify-green);">
          Adicionar todas as ${allTrackIds.length} faixas únicas
        </label>
      </div>
      <button type="submit" class="btn btn-primary" style="width:100%;">
        🎵 Criar Nova Playlist
      </button>
    </form>
    <div id="creatorResult"></div>
  `;

  document.getElementById('createPlaylistForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await createCleanPlaylist(state, api, allTrackIds);
  });
}

async function createCleanPlaylist(state, api, allTrackIds) {
  const nameInput = document.getElementById('playlistName');
  const name = nameInput.value.trim();

  if (!name) {
    showToast('Digite um nome para a playlist.', 'warning');
    return;
  }

  const confirmed = await showConfirmModal(
    'Criar Nova Playlist',
    `Criar playlist "${name}" com ${allTrackIds.length} faixas no Spotify?`
  );

  if (!confirmed) return;

  setLoading(true);
  try {
    const trackUris = allTrackIds.map((t) => t.uri);
    const res = await api.post('/api/modify', {
      action: 'create-playlist',
      name,
      trackUris,
    });

    showToast(res.message || `Playlist "${res.name}" criada!`, 'success');

    document.getElementById('creatorResult').innerHTML = `
      <div style="padding:1rem;background:rgba(29,185,84,0.1);border-radius:8px;border:1px solid var(--spotify-green);">
        <strong>✓ Playlist criada com sucesso!</strong><br>
        ${res.trackCount} faixas adicionadas a <strong>${res.name}</strong>
      </div>
    `;
  } catch (err) {
    showToast(`Erro: ${err.message}`, 'error');
  } finally {
    setLoading(false);
  }
}
