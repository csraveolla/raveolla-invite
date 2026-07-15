// ============================================================
// log.js — Riwayat Pengiriman (wa_log + reminder_log)
// ============================================================
import { SB, H, PER } from './config.js';
import { fmtWaktuLengkap, renderPagination } from './utils.js';
import { clientData } from './auth.js';

let allLogs      = [];
let currentFilter = 'semua';
let logPage       = 1;

export async function insertWaLog({ tamu_id, nomor, nama, pesan, status, tipe }) {
  try {
    await fetch(`${SB}/rest/v1/wa_log`, {
      method: 'POST',
      headers: { ...H, 'Prefer': 'return=minimal' },
      body: JSON.stringify({
        client_id: clientData.id,
        tamu_id, nomor, nama,
        pesan: (pesan || '').slice(0, 300),
        status, tipe: tipe || 'massal'
      })
    });
  } catch (e) { console.warn('[insertWaLog] gagal:', e.message); }
}

export async function cleanOldWaLog() {
  try {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    await fetch(`${SB}/rest/v1/wa_log?client_id=eq.${clientData.id}&sent_at=lt.${cutoff}`, {
      method: 'DELETE', headers: H
    });
  } catch (e) { /* diamkan — tidak kritikal */ }
}

export async function loadKirimLog() {
  const container = document.getElementById('kirim-log');
  const toolbar    = document.getElementById('log-toolbar');
  const summaryBar = document.getElementById('log-summary-bar');
  container.innerHTML = '<div class="state-box"><div class="spinner"></div></div>';
  try {
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const [waRes, remRes] = await Promise.all([
      fetch(`${SB}/rest/v1/wa_log?client_id=eq.${clientData.id}&sent_at=gte.${since}&order=sent_at.desc&limit=200`, { headers: H }),
      fetch(`${SB}/rest/v1/reminder_log?client_id=eq.${clientData.id}&sent_at=gte.${since}&order=sent_at.desc&limit=200`, { headers: H })
    ]);
    const waLogs  = waRes.ok  ? (await waRes.json()).map(r  => ({ ...r, _sumber: 'wa_log' }))       : [];
    const remLogs = remRes.ok ? (await remRes.json()).map(r => ({ ...r, _sumber: 'reminder_log' })) : [];
    allLogs = [...waLogs, ...remLogs].sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at));

    if (!allLogs.length) {
      container.innerHTML = '<div class="state-box">Belum ada riwayat pengiriman.</div>';
      toolbar.style.display = 'none'; summaryBar.style.display = 'none';
      return;
    }
    toolbar.style.display = 'flex';
    summaryBar.style.display = 'flex';
    logPage = 1;
    renderLogSummary();
    renderLogList();
  } catch (e) {
    container.innerHTML = `<div class="state-box">Gagal memuat riwayat: ${e.message}</div>`;
  }
}

function renderLogSummary() {
  const sent   = allLogs.filter(l => l.status === 'sent').length;
  const failed = allLogs.filter(l => l.status === 'failed').length;
  const bar = document.getElementById('log-summary-bar');
  bar.innerHTML = `
    <span>Total: <strong>${allLogs.length}</strong></span>
    <span style="color:var(--success)">✓ Terkirim: <strong>${sent}</strong></span>
    <span style="color:var(--danger)">✗ Gagal: <strong>${failed}</strong></span>`;
}

export function setLogFilter(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll('.log-filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  logPage = 1;
  renderLogList();
}

function renderLogList() {
  const container = document.getElementById('kirim-log');
  let filtered = allLogs;
  if (currentFilter === 'wa_log')       filtered = allLogs.filter(l => l._sumber === 'wa_log');
  if (currentFilter === 'reminder_log') filtered = allLogs.filter(l => l._sumber === 'reminder_log');

  if (!filtered.length) {
    container.innerHTML = '<div class="state-box">Tidak ada riwayat untuk filter ini.</div>';
    document.getElementById('log-pagination').innerHTML = '';
    return;
  }

  const start = (logPage - 1) * PER;
  const data  = filtered.slice(start, start + PER);
  let html = '';
  data.forEach(l => {
    const dotClass = l.status === 'sent' ? 'success' : l.status === 'failed' ? 'fail' : 'pending';
    const tipeLabel = {
      massal: '📤 Kirim Massal', manual: '✋ Manual',
      rsvp: '📋 Reminder RSVP', h3: '📅 Reminder H-3', h1: '📅 Reminder H-1', ucapan: '🙏 Ucapan'
    }[l.tipe] || l.tipe;
    html += `<div class="log-item">
      <div class="log-dot ${dotClass}"></div>
      <div class="log-detail">
        <div><strong style="font-weight:500">${l.nama || '—'}</strong> · ${tipeLabel}</div>
        <div class="log-time">${fmtWaktuLengkap(l.sent_at)} · ${l.nomor || '—'}</div>
      </div>
    </div>`;
  });
  container.innerHTML = html;

  const pgWrap = document.getElementById('log-pagination');
  pgWrap.innerHTML = '';
  const pages = Math.ceil(filtered.length / PER);
  if (pages > 1) {
    for (let i = 1; i <= pages; i++) {
      const btn = document.createElement('button');
      btn.className = `log-page-btn ${i === logPage ? 'active' : ''}`;
      btn.textContent = i;
      btn.onclick = () => { logPage = i; renderLogList(); };
      pgWrap.appendChild(btn);
    }
  }
}
