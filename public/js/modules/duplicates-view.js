import { showToast, showConfirmModal, setLoading } from './ui-helpers.js';
import apiClient from './api-client.js';

/**
 * Duplicate scanning and management view.
 */

const LIXEIRA_NAME = '🧹 [LIXEIRA / REPETIDAS]';

export async function renderDuplicates(state, api) {
  const controls = document.getElementById('duplicatesControls');
  const list = document.getElementById('duplicatesList');

  if (state.duplicates.length === 0) {
    controls.innerHTML = `
      <button class="btn btn-primary" id="scanDuplicatesBtn">
        🔍 Escanear Duplicadas
      </button>
      <span style="color: var(--text-secondary); margin-left: 1rem;" id="dupStatus">
        Clique para escanear suas playlists em busca de músicas repetidas.
      </span>
    `;

    const btn = document.getElementById('scanDuplicatesBtn');
    if (btn) {
      btn.addEventListener('click', () => triggerScan(state, api));
    }

    list.innerHTML = '<p style="color: var(--text-secondary);">Nenhuma varredura realizada ainda.</p>';
    return;
  }

  renderDuplicatesControls(state, api, controls);
  renderDuplicatesList(state.duplicates, list, api);
}

export function renderDuplicatesControls(state, api, container) {
  const totalDups = state.duplicates.length;
  const totalExtraTracks = state.duplicates.reduce(
    (sum, d) => sum + d.occurrences.length - 1,
    0
  );

  container.innerHTML = `
    <div class="dup-summary">
      <strong>${totalDups}</strong> faixas duplicadas em <strong>${totalExtraTracks}</strong> ocorrências extras.
    </div>
    <div style="display:flex;gap:1rem;align-items:center;flex-wrap:gap;">
      <button class="btn btn-primary" id="moveSelectedBtn">
        🧹 Mover Selecionadas para Lixeira
      </button>
      <button class="btn btn-ghost" id="refreshScanBtn">
        🔄 Reescanear
      </button>
      <span style="color: var(--text-secondary); font-size: 0.85rem;" id="selectionCount">
        0 selecionadas
      </span>
    </div>
  `;

  document.getElementById('moveSelectedBtn').addEventListener('click', () => {
    moveSelectedDuplicates(state, api);
  });
  document.getElementById('refreshScanBtn').addEventListener('click', () => {
    triggerScan(state, api);
  });
}

export function renderDuplicatesList(duplicates, container, api) {
  if (duplicates.length === 0) {
    container.innerHTML = '<p style="color: var(--text-secondary);">Nenhuma duplicata encontrada.</p>';
    return;
  }

  container.innerHTML = '';
  const fragment = document.createDocumentFragment();

  duplicates.forEach((dup, index) => {
    const div = document.createElement('div');
    div.className = 'dup-card';
    div.dataset.index = index;
    div.innerHTML = `
      <div class="dup-track-info">
        <input type="checkbox" class="dup-checkbox" data-index="${index}" style="margin-right:0.6rem;">
        ${dup.albumImageUrl ? `<img src="${dup.albumImageUrl}" alt="" class="dup-track-cover">` : ''}
        <div>
          <div class="dup-track-name">${escapeHtml(dup.name)}</div>
          <div class="dup-track-artists">${escapeHtml(dup.artists.join(', '))}</div>
          <div class="dup-occurrences">
            ${dup.occurrences
              .map(
                (occ) =>
                  `<span class="dup-occurrence">${escapeHtml(occ.playlistName)} — adicionada em ${formatDate(occ.addedAt)}</span>`
              )
              .join('')}
          </div>
        </div>
      </div>
      <button class="btn btn-danger btn-sm" style="margin-top:0.5rem;" data-move="${index}">
        Mover para Lixeira
      </button>
    `;
    fragment.appendChild(div);
  });

  container.appendChild(fragment);

  // Checkbox selection tracking
  const checkboxes = container.querySelectorAll('.dup-checkbox');
  const selectionCount = document.getElementById('selectionCount');
  checkboxes.forEach((cb) => {
    cb.addEventListener('change', () => {
      const checked = container.querySelectorAll('.dup-checkbox:checked');
      if (selectionCount) {
        selectionCount.textContent = `${checked.length} selecionadas`;
      }
    });
  });

  // Individual move buttons
  container.querySelectorAll('[data-move]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.target.dataset.move, 10);
      moveSingleDuplicate(state, api, duplicates[idx]);
    });
  });
}

export async function triggerScan(state, api) {
  const list = document.getElementById('duplicatesList');
  const controls = document.getElementById('duplicatesControls');

  if (controls) {
    controls.innerHTML = '<p style="color: var(--text-secondary);">Escaneando playlists... 🔄</p>';
  }
  if (list) {
    list.innerHTML = '';
  }

  setLoading(true);
  try {
    const data = await api.get('/api/duplicates');
    state.duplicates = data.duplicates || [];
    state.hasLixeira = data.hasLixeira;
    state.lixeiraCount = data.lixeiraCount;
    state.lixeiraId = data.lixeiraId;
    state.duplicateCount = data.totalCount || 0;

    if (state.duplicates.length === 0) {
      showToast('Nenhuma duplicata encontrada!', 'success');
      if (controls) {
        controls.innerHTML = `
          <button class="btn btn-primary" id="scanDuplicatesBtn">🔍 Escanear Novamente</button>
          <span style="color: var(--text-secondary); margin-left: 1rem;">Tudo limpo!</span>
        `;
        document.getElementById('scanDuplicatesBtn').addEventListener('click', () => triggerScan(state, api));
      }
    } else {
      showToast(`${data.duplicates.length} duplicatas encontradas.`, 'info');
      renderDuplicatesControls(state, api, controls);
      renderDuplicatesList(state.duplicates, list, api);
    }
  } catch (err) {
    if (err.message.includes('403') || err.message.includes('Forbidden')) {
      showToast(
        'Permissão negada pelo Spotify. Detalhe: ' + err.message,
        'error',
        9000
      );
      if (controls) {
        controls.innerHTML = `
          <div class="dup-summary">
            <strong>Permissão negada pelo Spotify (403).</strong><br>
            Detalhe técnico: <code>${escapeHtml(err.message)}</code><br><br>
            Causas comuns:
            <ul style="margin:0.5rem 0 0 1.2rem;color:var(--text-secondary);font-size:0.82rem;">
              <li>Token sem o scope <code>playlist-read-private</code></li>
              <li>App em <strong>Development Mode</strong> e sua conta não adicionada em Users</li>
              <li>Conta Premium limitada (raramente)</li>
            </ul>
          </div>
          <div style="display:flex;gap:1rem;flex-wrap:wrap;">
            <button class="btn btn-primary" id="reconnectBtn">⟳ Reconectar ao Spotify</button>
            <button class="btn btn-ghost" id="retryScanBtn">Tentar novamente</button>
            <button class="btn btn-ghost" id="diagnoseBtn">🔬 Diagnosticar</button>
          </div>
          <div id="diagnoseResult" style="margin-top:0.75rem;font-size:0.85rem;"></div>
        `;
        const rc = document.getElementById('reconnectBtn');
        if (rc) rc.addEventListener('click', async () => {
          const app = await import('../app.js');
          app.forceReconnect();
        });
        const rs = document.getElementById('retryScanBtn');
        if (rs) rs.addEventListener('click', () => triggerScan(state, api));
        const dbg = document.getElementById('diagnoseBtn');
        if (dbg) dbg.addEventListener('click', async () => {
          const resultEl = document.getElementById('diagnoseResult');
          resultEl.textContent = 'Executando diagnóstico... 🔄';
          try {
            const d = await api.get('/api/diagnose');
            resultEl.innerHTML = `
              <strong>Resultado do diagnóstico:</strong><br>
              Conta: ${escapeHtml(d.profile?.displayName || d.profile?.id || '—')}<br>
              Ler playlists (/me/playlists): <b style="color:${d.testPlaylists.ok ? 'var(--spotify-green)' : 'var(--danger)'}">${d.testPlaylists.ok ? 'OK' : 'FALHOU'}</b>
              ${d.testPlaylists.error ? ' — ' + escapeHtml(d.testPlaylists.error) : ''}<br>
              Ler faixas de playlist: <b style="color:${d.testPlaylistTracks.ok ? 'var(--spotify-green)' : 'var(--danger)'}">${d.testPlaylistTracks.ok ? 'OK' : 'FALHOU'}</b>
              ${d.testPlaylistTracks.error ? ' — ' + escapeHtml(d.testPlaylistTracks.error) : ''}<br>
              Token: ${escapeHtml(d.tokenPrefix || 'ausente')}
            `;
          } catch (e) {
            resultEl.innerHTML = `<span style="color:var(--danger);">Falha no diagnóstico: ${escapeHtml(e.message)}</span>`;
          }
        });
      }
    } else if (err.message.includes('429')) {
      showToast('Limite de requisições excedido. Tente novamente em alguns minutos.', 'warning');
    } else if (err.message.includes('401')) {
      showToast('Sessão expirada. Clique em "⟳ Reconectar" para renovar.', 'warning');
    } else {
      showToast(`Erro ao escanear: ${err.message}`, 'error');
    }
  } finally {
    setLoading(false);
  }
}

async function moveSelectedDuplicates(state, api) {
  const checkboxes = document.querySelectorAll('.dup-checkbox:checked');
  if (checkboxes.length === 0) {
    showToast('Selecione pelo menos uma duplicata.', 'warning');
    return;
  }

  const confirmed = await showConfirmModal(
    'Mover para Lixeira',
    `Mover ${checkboxes.length} faixas duplicadas para a playlist 🧹 [LIXEIRA / REPETIDAS]?\nEsta ação não pode ser desfeita.`
  );

  if (!confirmed) return;

  setLoading(true);
  try {
    const trackIds = Array.from(checkboxes).map(
      (cb) => state.duplicates[parseInt(cb.dataset.index, 10)].id
    );

    const res = await api.post('/api/modify', {
      action: 'move-duplicates',
      duplicateTrackIds: trackIds,
      lixeiraPlaylistId: state.lixeiraId,
    });

    showToast(res.message || 'Faixas movidas para a lixeira.', 'success');

    // Remove moved duplicates from state
    const movedIds = new Set(trackIds);
    state.duplicates = state.duplicates.filter((d) => !movedIds.has(d.id));

    renderDuplicatesControls(state, null, document.getElementById('duplicatesControls'));
    renderDuplicatesList(state.duplicates, document.getElementById('duplicatesList'), api);
  } catch (err) {
    showToast(`Erro: ${err.message}`, 'error');
  } finally {
    setLoading(false);
  }
}

async function moveSingleDuplicate(state, api, duplicate) {
  const confirmed = await showConfirmModal(
    'Mover para Lixeira',
    `Mover "${duplicate.name}" para a lixeira?`
  );

  if (!confirmed) return;

  setLoading(true);
  try {
    const res = await api.post('/api/modify', {
      action: 'move-duplicates',
      duplicateTrackIds: [duplicate.id],
      lixeiraPlaylistId: state.lixeiraId,
    });

    showToast(res.message || 'Faixa movida para a lixeira.', 'success');

    state.duplicates = state.duplicates.filter((d) => d.id !== duplicate.id);
    renderDuplicatesList(state.duplicates, document.getElementById('duplicatesList'), api);
  } catch (err) {
    showToast(`Erro: ${err.message}`, 'error');
  } finally {
    setLoading(false);
  }
}

function formatDate(dateString) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function triggerScanExternal(state, api) {
  return triggerScan(state, api);
}
