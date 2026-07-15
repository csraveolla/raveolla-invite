// ============================================================
// utils.js — Fungsi Helper Bersama
// ============================================================
import { TZ, PER } from './config.js';

// ── Format Waktu ─────────────────────────────────────────────

export function parseWaktu(val) {
  if (!val) return null;
  if (/Z|[+-]\d{2}:\d{2}$/.test(val)) return new Date(val);
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(val)) return new Date(val + '+07:00');
  return new Date(val.replace(' ', 'T') + 'Z');
}

export function fmtWaktu(val) {
  if (!val) return '—';
  return parseWaktu(val).toLocaleString('id-ID', {
    timeZone: TZ, day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit'
  });
}

export function fmtWaktuLengkap(val) {
  if (!val) return '—';
  return parseWaktu(val).toLocaleString('id-ID', {
    timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// ── UI Helpers ────────────────────────────────────────────────

export function showMsg(el, type, text) {
  el.className = 'msg ' + type;
  el.textContent = text;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 6000);
}

export function showToast(text) {
  const t = document.getElementById('toast');
  t.textContent = text;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

export function closeModal(id) {
  document.getElementById(id).classList.remove('show');
}

export function renderPagination(containerId, total, page, cb) {
  const pages = Math.ceil(total / PER);
  if (pages <= 1) return;
  let html = `<div class="pagination">`;
  html += `<button class="pg-btn" onclick="(${cb.toString()})(${page - 1})" ${page === 1 ? 'disabled' : ''}>‹</button>`;
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || (i >= page - 2 && i <= page + 2))
      html += `<button class="pg-btn ${i === page ? 'active' : ''}" onclick="(${cb.toString()})(${i})">${i}</button>`;
    else if (i === page - 3 || i === page + 3)
      html += `<span style="padding:4px;font-size:11px;color:var(--muted-l)">…</span>`;
  }
  html += `<button class="pg-btn" onclick="(${cb.toString()})(${page + 1})" ${page === pages ? 'disabled' : ''}>›</button></div>`;
  document.getElementById(containerId).insertAdjacentHTML('beforeend', html);
}

export function copyText(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = '✓';
    btn.classList.add('ok');
    showToast('Link disalin!');
    setTimeout(() => { btn.textContent = '⎘'; btn.classList.remove('ok'); }, 2000);
  });
}

export function downloadCSV(rows, nama) {
  const csv = rows.map(r => r.join(',')).join('\n');
  const a   = document.createElement('a');
  a.href    = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `${nama.replace(/\s+/g, '_')}.csv`;
  a.click();
}

export function addLog(el, text, type) {
  const dot = type === 'success' ? '🟢' : type === 'fail' ? '🔴' : '🟡';
  el.innerHTML += `<div>${dot} ${text}</div>`;
  el.scrollTop = el.scrollHeight;
}

export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function genTamuId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const arr = new Uint8Array(12);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => chars[b % chars.length]).join('');
}

// ── Dark Mode ─────────────────────────────────────────────────

export function toggleTheme() {
  const isDark = document.body.getAttribute('data-theme') === 'dark';
  document.body.setAttribute('data-theme', isDark ? '' : 'dark');
  localStorage.setItem('rsvp_theme', isDark ? 'light' : 'dark');
}

export function restoreTheme() {
  const saved = localStorage.getItem('rsvp_theme');
  if (saved === 'dark') document.body.setAttribute('data-theme', 'dark');
}

// ── Floating Progress Pill ────────────────────────────────────

let _pillSent = 0, _pillFailed = 0, _pillTotal = 0;

export function showPill(show) {
  const el = document.getElementById('floating-progress');
  if (!el) return;
  if (show) {
    _pillSent = 0; _pillFailed = 0; _pillTotal = 0;
    const listEl = document.getElementById('pill-list');
    if (listEl) listEl.innerHTML = '';
    ['pill-sent','pill-failed','pill-total'].forEach(id => {
      const e = document.getElementById(id);
      if (e) e.textContent = '0';
    });
    el.classList.add('show');
  } else {
    el.classList.remove('show');
  }
}

export function updatePill(current, total, nama) {
  const pct          = total > 0 ? Math.round((current / total) * 100) : 0;
  const circumference = 2 * Math.PI * 18;
  const fg     = document.getElementById('pill-circle-fg');
  const pctEl  = document.getElementById('pill-pct');
  const titleEl = document.getElementById('pill-title');
  const subEl   = document.getElementById('pill-sub');
  const totalEl = document.getElementById('pill-total');
  if (fg)      fg.style.strokeDashoffset = circumference - (pct / 100) * circumference;
  if (pctEl)   pctEl.textContent   = pct + '%';
  if (titleEl) titleEl.textContent = current >= total ? 'Selesai!' : 'Mengirim WA...';
  if (subEl)   subEl.textContent   = `${current} / ${total} pesan`;
  _pillTotal = total;
  if (totalEl) totalEl.textContent = total;
  if (nama) addPillItem(nama, 'sending');
}

export function addPillItem(nama, status) {
  const listEl = document.getElementById('pill-list');
  if (!listEl) return;
  if (status !== 'sending') {
    const lastSending = listEl.querySelector('.pill-item.sending');
    if (lastSending) {
      lastSending.className = `pill-item ${status}`;
      const statusEl = lastSending.querySelector('.pill-item-status');
      if (statusEl) statusEl.textContent = status === 'ok' ? '✓' : '✗';
      if (status === 'ok')   { _pillSent++;   const e = document.getElementById('pill-sent');   if (e) e.textContent = _pillSent; }
      if (status === 'fail') { _pillFailed++; const e = document.getElementById('pill-failed'); if (e) e.textContent = _pillFailed; }
      return;
    }
  }
  const item = document.createElement('div');
  item.className = `pill-item ${status}`;
  item.innerHTML = `
    <div class="pill-item-dot"></div>
    <div class="pill-item-name">${nama}</div>
    <div class="pill-item-status">${status === 'sending' ? '...' : status === 'ok' ? '✓' : '✗'}</div>`;
  listEl.appendChild(item);
  listEl.scrollTop = listEl.scrollHeight;
  while (listEl.children.length > 20) listEl.removeChild(listEl.firstChild);
}

export function updatePillSub(text) {
  const el = document.getElementById('pill-sub');
  if (el) el.textContent = text;
}

// ── Toast Stack ───────────────────────────────────────────────

const TOAST_TYPES = {
  rsvp:   { icon: '📋', label: 'Reminder RSVP',       cls: 'toast-rsvp'   },
  h3:     { icon: '📅', label: 'Reminder H-3',        cls: 'toast-h3'     },
  h1:     { icon: '📅', label: 'Reminder H-1',        cls: 'toast-h1'     },
  ucapan: { icon: '🙏', label: 'Ucapan Terima Kasih', cls: 'toast-ucapan' },
};

export function showToastCard({ tipe = 'rsvp', jumlah = 0, acara = '', durasi = 6000 } = {}) {
  const stack = document.getElementById('toast-stack');
  if (!stack) return;
  const cfg = TOAST_TYPES[tipe] || TOAST_TYPES.rsvp;
  const id  = 'tc-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
  const card = document.createElement('div');
  card.className = `toast-card ${cfg.cls}`;
  card.id = id;
  card.innerHTML = `
    <div class="toast-card-header">
      <div class="toast-card-icon">${cfg.icon}</div>
      <div class="toast-card-title">${cfg.label}</div>
      <button class="toast-card-close" onclick="dismissToastCard('${id}')">✕</button>
    </div>
    <div class="toast-card-body">
      <div class="toast-card-count">${jumlah}</div>
      <div class="toast-card-count-label">pesan berhasil dikirim${acara ? ' · ' + acara : ''}</div>
    </div>
    <div class="toast-card-progress">
      <div class="toast-card-progress-bar" id="${id}-bar" style="width:100%"></div>
    </div>`;
  stack.appendChild(card);
  requestAnimationFrame(() => {
    const bar = document.getElementById(`${id}-bar`);
    if (bar) { bar.style.transition = `width ${durasi}ms linear`; bar.style.width = '0%'; }
  });
  const timer = setTimeout(() => dismissToastCard(id), durasi);
  card._dismissTimer = timer;
}

export function dismissToastCard(id) {
  const card = document.getElementById(id);
  if (!card) return;
  clearTimeout(card._dismissTimer);
  card.classList.add('dismissing');
  setTimeout(() => card.remove(), 320);
}
