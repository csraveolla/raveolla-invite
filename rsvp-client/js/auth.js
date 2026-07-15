// ============================================================
// auth.js — Login / Auto-Login / Logout
// ============================================================
import { SB, H, PAKET_FEATURES } from './config.js';
import { showToast } from './utils.js';
import { applyPaketGates, updateWaQuota } from './paket.js';
import { loadAll } from './tamu.js';
import { loadReminderRsvpSettings, loadReminderHadirSettings, loadReminderUcapanSettings } from './reminder.js';
import { initRealtime, stopRealtime } from './realtime.js';
import { cleanOldWaLog } from './log.js';

// State global — di-export agar modul lain bisa baca
export let clientData  = null;
export let BASE_URL    = '';
export let paketFitur  = PAKET_FEATURES.lite;

// Setter untuk dipakai modul lain
export function setClientData(data) { clientData = data; }
export function setBaseUrl(url)     { BASE_URL   = url;  }
export function setPaketFitur(pf)   { paketFitur = pf;   }

// ── Login Manual ──────────────────────────────────────────────

export async function doLogin() {
  const token = document.getElementById('login-token').value.trim().toUpperCase();
  const btn   = document.getElementById('login-btn');
  const msg   = document.getElementById('login-msg');
  if (!token) return;
  btn.disabled = true; btn.textContent = 'Memverifikasi...';
  msg.style.display = 'none';
  try {
    const res  = await fetch(`${SB}/rest/v1/clients?token=eq.${token}&select=*`, { headers: H });
    const data = await res.json();
    if (!data.length) throw new Error('Token tidak valid. Hubungi admin.');
    clientData = data[0];
    BASE_URL   = clientData.base_url || '';
    paketFitur = PAKET_FEATURES[clientData.paket || 'lite'] || PAKET_FEATURES.lite;
    sessionStorage.setItem('rsvp_token', token);
    showApp();
  } catch (e) {
    msg.textContent = '✗ ' + e.message;
    msg.style.display = 'block';
    btn.disabled = false;
    btn.textContent = 'Masuk →';
  }
}

// ── Auto-Login dari sessionStorage ────────────────────────────

export async function tryAutoLogin() {
  const token = sessionStorage.getItem('rsvp_token');
  if (!token) return;
  try {
    const res  = await fetch(`${SB}/rest/v1/clients?token=eq.${token}&select=*`, { headers: H });
    const data = await res.json();
    if (!data.length) { sessionStorage.removeItem('rsvp_token'); return; }
    clientData = data[0];
    BASE_URL   = clientData.base_url || '';
    paketFitur = PAKET_FEATURES[clientData.paket || 'lite'] || PAKET_FEATURES.lite;
    showApp();
  } catch (e) {
    sessionStorage.removeItem('rsvp_token');
  }
}

// ── Show App (dipanggil setelah login berhasil) ───────────────

function showApp() {
  document.getElementById('app-acara').textContent      = clientData.nama_acara;
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app-screen').style.display   = 'block';
  applyPaketGates();
  loadAll();
  loadReminderRsvpSettings();
  loadReminderHadirSettings();
  loadReminderUcapanSettings();
  initRealtime();
  cleanOldWaLog();
}

// ── Logout ────────────────────────────────────────────────────

export function doLogout() {
  sessionStorage.removeItem('rsvp_token');
  stopRealtime();
  clientData = null;
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('app-screen').style.display   = 'none';
  document.getElementById('login-token').value = '';
  document.getElementById('login-btn').disabled    = false;
  document.getElementById('login-btn').textContent  = 'Masuk →';
}
