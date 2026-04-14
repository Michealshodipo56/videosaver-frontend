// ─── Save Media — History Module ────────────────────────────────────────────
const HISTORY_KEY = 'saveMediaHistory';
const MAX_ITEMS   = 50;

// ── Storage helpers ──────────────────────────────────────────────────────────

function getHistory() {
    try {
        return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    } catch {
        return [];
    }
}

function saveHistory(items) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
}

/**
 * Add one item to history (called from app.js after download starts).
 * @param {{ id, title, thumbnail, platform, url, format, download_url, downloaded_at }} item
 */
function addToHistory(item) {
    let history = getHistory();

    // Deduplicate by URL — remove any existing entry with the same source URL
    history = history.filter(h => h.url !== item.url);

    // Prepend newest item
    history.unshift(item);

    // Enforce max cap
    if (history.length > MAX_ITEMS) {
        history = history.slice(0, MAX_ITEMS);
    }

    saveHistory(history);
}

function deleteHistoryItem(id) {
    const history = getHistory().filter(h => h.id !== id);
    saveHistory(history);
    renderHistory();
}

function clearHistory() {
    localStorage.removeItem(HISTORY_KEY);
    renderHistory();
}

// ── Time formatting ──────────────────────────────────────────────────────────

function timeAgo(dateString) {
    const date  = new Date(dateString);
    const now   = new Date();
    const diff  = Math.floor((now - date) / 1000); // seconds

    if (diff < 60)          return 'Just now';
    if (diff < 3600)        return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400)       return `${Math.floor(diff / 3600)} hours ago`;
    if (diff < 604800)      return `${Math.floor(diff / 86400)} days ago`;
    return date.toLocaleDateString();
}

// ── Platform icon mapping ────────────────────────────────────────────────────

function platformIcon(platform) {
    const map = {
        youtube:   'youtube',
        instagram: 'instagram',
        twitter:   'twitter',
        facebook:  'facebook',
        tiktok:    'music-2',
    };
    const key = (platform || '').toLowerCase();
    return map[key] || 'video';
}

// ── Render ───────────────────────────────────────────────────────────────────

function renderHistory() {
    const list    = document.getElementById('historyList');
    const empty   = document.getElementById('historyEmpty');
    const history = getHistory();

    list.innerHTML = '';

    if (history.length === 0) {
        empty.style.display = 'flex';
        list.style.display  = 'none';
        return;
    }

    empty.style.display = 'none';
    list.style.display  = 'flex';

    history.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'history-item glass';
        card.style.animationDelay = `${index * 0.05}s`;

        const thumbSrc = item.thumbnail || '';
        const platform = item.platform  || 'Video';
        const format   = item.format    || '—';
        const when     = item.downloaded_at ? timeAgo(item.downloaded_at) : '—';
        const icon     = platformIcon(platform);

        card.innerHTML = `
            <div class="history-thumb-wrap">
                <img class="history-thumb" src="${thumbSrc}" alt="Thumbnail" loading="lazy"
                     onerror="this.src=''; this.parentElement.classList.add('thumb-broken')">
                <div class="thumb-overlay"><i data-lucide="play" class="thumb-play"></i></div>
            </div>
            <div class="history-info">
                <h3 class="history-title">${escapeHtml(item.title || 'Untitled')}</h3>
                <div class="history-meta">
                    <span class="history-badge platform-badge-sm">
                        <i data-lucide="${icon}"></i>${escapeHtml(platform)}
                    </span>
                    <span class="history-badge format-badge">
                        <i data-lucide="file-video"></i>${escapeHtml(format)}
                    </span>
                    <span class="history-badge time-badge">
                        <i data-lucide="clock"></i>${when}
                    </span>
                </div>
            </div>
            <div class="history-actions">
                <button class="h-dl-btn" onclick="reDownload('${escapeAttr(item.download_url)}')">
                    <i data-lucide="download"></i><span>Download Again</span>
                </button>
                <button class="h-del-btn" onclick="deleteHistoryItem('${escapeAttr(item.id)}')">
                    <i data-lucide="trash-2"></i>
                </button>
            </div>
        `;

        list.appendChild(card);
    });

    lucide.createIcons();
}

// ── Actions ──────────────────────────────────────────────────────────────────

function reDownload(downloadUrl) {
    if (!downloadUrl) {
        showHistoryToast('Download URL is no longer available.');
        return;
    }
    const a  = document.createElement('a');
    a.href   = downloadUrl;
    a.click();
    showHistoryToast('Download started!');
}

// ── Modal ────────────────────────────────────────────────────────────────────

function openClearModal() {
    document.getElementById('clearModal').classList.add('modal-visible');
}

function closeClearModal() {
    document.getElementById('clearModal').classList.remove('modal-visible');
}

// ── Toast ────────────────────────────────────────────────────────────────────

function showHistoryToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// ── Sanitization helpers ─────────────────────────────────────────────────────

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function escapeAttr(str) {
    return String(str || '').replace(/'/g, "\\'");
}

// ── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    // Render history on page load
    renderHistory();

    // Clear History button
    const clearBtn = document.getElementById('clearHistoryBtn');
    if (clearBtn) clearBtn.addEventListener('click', openClearModal);

    // Modal buttons
    const confirmBtn = document.getElementById('modalConfirm');
    const cancelBtn  = document.getElementById('modalCancel');
    if (confirmBtn) confirmBtn.addEventListener('click', () => {
        clearHistory();
        closeClearModal();
        showHistoryToast('History cleared.');
    });
    if (cancelBtn) cancelBtn.addEventListener('click', closeClearModal);

    // Close modal on backdrop click
    const modal = document.getElementById('clearModal');
    if (modal) modal.addEventListener('click', (e) => {
        if (e.target === modal) closeClearModal();
    });

    // Animate header
    if (typeof gsap !== 'undefined') {
        gsap.from('[data-gsap="fade-down"]', { y: -30, opacity: 0, duration: 0.8, ease: 'power3.out' });
        gsap.from('[data-gsap="fade-up"]',   { y: 40,  opacity: 0, duration: 1,   delay: 0.2, ease: 'power4.out' });
    }
});
