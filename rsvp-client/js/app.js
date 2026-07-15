// ============================================================
// app.js — Orchestrator Utama
// Menghubungkan semua modul & expose fungsi ke window
// agar bisa dipanggil dari onclick="..." inline di HTML.
// ============================================================

import * as Auth      from './auth.js';
import * as Utils     from './utils.js';
import * as Paket     from './paket.js';
import * as Tamu      from './tamu.js';
import * as Rsvp      from './rsvp.js';
import * as Komentar  from './komentar.js';
import * as Kirim     from './kirim.js';
import * as Reminder  from './reminder.js';
import * as Log       from './log.js';
import * as Realtime  from './realtime.js';
import * as Invitation from './invitation.js';
import * as TemplateModal from './template-modal.js';

// ── Registry modul (dipakai modul lain untuk saling akses tanpa circular import) ──
window._appModules = {
  auth: Auth, tamu: Tamu, rsvp: Rsvp, komentar: Komentar,
  kirim: Kirim, reminder: Reminder, log: Log, realtime: Realtime, paket: Paket,
  invitation: Invitation
};

// Getter state global agar realtime.js & modul lain baca versi terbaru
Object.defineProperty(window, '_appState', {
  get() {
    return {
      clientData: Auth.clientData,
      BASE_URL:   Auth.BASE_URL,
      paketFitur: Auth.paketFitur
    };
  }
});

// ── Expose semua fungsi ke window agar bisa dipanggil dari onclick="" ──
window._app = {
  ...Utils, ...Paket, ...Tamu, ...Rsvp, ...Komentar,
  ...Kirim, ...Reminder, ...Log, ...TemplateModal, ...Invitation,
  doLogin: Auth.doLogin, doLogout: Auth.doLogout
};

// Flatten juga ke window langsung supaya onclick="doLogin()" dsb tetap jalan
Object.assign(window, window._app);

// ── Sub-Tab Switching (kirim tab) ──────────────────────────────

window.switchTab = function (tabName) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
  document.getElementById(`tab-${tabName}`).classList.add('active');
  event.currentTarget.classList.add('active');

  if (tabName === 'riwayat')  Log.loadKirimLog();
  if (tabName === 'kirim')    Kirim.updateKirimTamuList();
  if (tabName === 'undangan') Invitation.loadInvitationTab();
};

window.switchSubTab = function (subTabName) {
  document.querySelectorAll('.sub-tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.sub-tab').forEach(el => el.classList.remove('active'));
  const contentMap = {
    'kirim-undangan':  'sub-kirim-undangan',
    'reminder-rsvp':   'sub-reminder-rsvp',
    'reminder-h3':     'sub-reminder-h3',
    'reminder-h1':     'sub-reminder-h1',
    'reminder-ucapan': 'sub-reminder-ucapan'
  };
  document.getElementById(contentMap[subTabName]).classList.add('active');
  event.currentTarget.classList.add('active');
};

// ── Init saat halaman dimuat ────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  Utils.restoreTheme();
  feather.replace();
  Auth.tryAutoLogin();

  // Re-render icon feather setiap kali DOM tab berubah (opsional, ringan)
  const observer = new MutationObserver(() => {
    if (window.feather) feather.replace();
  });
  observer.observe(document.body, { childList: true, subtree: true });
});

// Set default jadwal tanggal minimal = besok
document.addEventListener('DOMContentLoaded', () => {
  const jadwalTgl = document.getElementById('jadwal-tanggal');
  if (jadwalTgl) {
    const besok = new Date(Date.now() + 86400000);
    jadwalTgl.min = besok.toISOString().split('T')[0];
  }
});
