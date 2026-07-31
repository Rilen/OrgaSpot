/**
 * UI helper functions: toasts, modals, loading states.
 */

/**
 * Show a toast notification.
 * @param {string} message
 * @param {'success' | 'error' | 'warning' | 'info'} [type]
 * @param {number} [duration=4000]
 */
function showToast(message, type = 'info', duration = 4000) {
  const container = getToastContainer();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-header">
      <span class="toast-icon">${getIcon(type)}</span>
      <span>${getTypeLabel(type)}</span>
    </div>
    <div class="toast-message">${escapeHtml(message)}</div>
  `;

  container.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 10);

  setTimeout(() => {
    toast.classList.remove('show');
    toast.addEventListener('transitionend', () => toast.remove());
  }, duration);
}

function getIcon(type) {
  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };
  return icons[type] || 'ℹ';
}

function getTypeLabel(type) {
  const labels = {
    success: 'Sucesso',
    error: 'Erro',
    warning: 'Aviso',
    info: 'Info',
  };
  return labels[type] || 'Info';
}

function getToastContainer() {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  return container;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Show a confirmation modal.
 * @param {string} title
 * @param {string} body
 * @returns {Promise<boolean>} Resolves with true if confirmed
 */
function showConfirmModal(title, body) {
  return new Promise((resolve) => {
    const modal = getModal();

    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmBody').textContent = body;

    const onConfirm = () => {
      modal.classList.remove('show');
      modal.setAttribute('aria-hidden', 'true');
      modal.removeEventListener('click', onOverlayClick);
      cleanup();
      resolve(true);
    };

    const onCancel = () => {
      modal.classList.remove('show');
      modal.setAttribute('aria-hidden', 'true');
      modal.removeEventListener('click', onOverlayClick);
      cleanup();
      resolve(false);
    };

    const onOverlayClick = (e) => {
      if (e.target === modal) onCancel();
    };

    const cleanup = () => {
      document.getElementById('confirmAction').removeEventListener('click', onConfirm);
      document.getElementById('confirmCancel').removeEventListener('click', onCancel);
    };

    modal.addEventListener('click', onOverlayClick);
    document.getElementById('confirmAction').addEventListener('click', onConfirm, { once: true });
    document.getElementById('confirmCancel').addEventListener('click', onCancel, { once: true });

    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
  });
}

function getModal() {
  let modal = document.getElementById('confirmModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'confirmModal';
    modal.className = 'modal-overlay';
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <h3 id="confirmTitle"></h3>
        <p id="confirmBody"></p>
        <div class="modal-actions">
          <button class="btn btn-ghost" id="confirmCancel">Cancelar</button>
          <button class="btn btn-primary" id="confirmAction">Confirmar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  return modal;
}

/**
 * Toggle a global loading overlay.
 */
function setLoading(show) {
  let overlay = document.getElementById('loadingOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'loadingOverlay';
    overlay.className = 'loading-overlay';
    overlay.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(overlay);
  }
  overlay.style.display = show ? 'flex' : 'none';
}

/**
 * Format milliseconds into a human-readable duration.
 */
function formatDuration(ms) {
  if (!ms || ms < 0) return '';
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

/**
 * Format a date string to a localized date.
 */
function formatDate(dateString) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export {
  showToast,
  showConfirmModal,
  setLoading,
  formatDuration,
  formatDate,
};
