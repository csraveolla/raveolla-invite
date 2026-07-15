// ============================================================
// komentar.js — Tab Ucapan & Komentar
// ============================================================
import { SB, H } from './config.js';
import { fmtWaktuLengkap } from './utils.js';
import { clientData } from './auth.js';

export let allKomentar = [];

export async function loadKomentar() {
  try {
    const res = await fetch(
      `${SB}/rest/v1/komentar?client_id=eq.${clientData.id}&select=*&order=created_at.desc`,
      { headers: H }
    );
    allKomentar = await res.json();
    if (!Array.isArray(allKomentar)) allKomentar = [];
    document.getElementById('badge-komentar').textContent  = allKomentar.length;
    document.getElementById('komentar-count').textContent  = `${allKomentar.length} ucapan`;
    filterKomentar();
  } catch (e) { console.error(e); }
}

export function filterKomentar() {
  const cari     = (document.getElementById('f-komentar-cari')?.value || '').toLowerCase();
  const filtered = cari
    ? allKomentar.filter(k => k.nama?.toLowerCase().includes(cari) || k.isi?.toLowerCase().includes(cari))
    : allKomentar;
  renderKomentarData(filtered);
}

function renderKomentarData(data) {
  const list = document.getElementById('komentar-list');
  if (!allKomentar.length) { list.innerHTML = '<div class="state-box">Belum ada komentar.</div>'; return; }
  if (!data.length) { list.innerHTML = '<div class="state-box">Tidak ada hasil pencarian.</div>'; return; }
  let html = `<table style="width:100%;border-collapse:collapse;font-size:12px;min-width:500px">
    <thead><tr>
      <th style="padding:10px 14px;text-align:left;font-size:8px;letter-spacing:2px;text-transform:uppercase;color:var(--muted-l);border-bottom:1px solid var(--border);background:var(--cream);font-weight:500">#</th>
      <th style="padding:10px 14px;text-align:left;font-size:8px;letter-spacing:2px;text-transform:uppercase;color:var(--muted-l);border-bottom:1px solid var(--border);background:var(--cream);font-weight:500">Nama</th>
      <th style="padding:10px 14px;text-align:left;font-size:8px;letter-spacing:2px;text-transform:uppercase;color:var(--muted-l);border-bottom:1px solid var(--border);background:var(--cream);font-weight:500">Ucapan</th>
      <th style="padding:10px 14px;text-align:left;font-size:8px;letter-spacing:2px;text-transform:uppercase;color:var(--muted-l);border-bottom:1px solid var(--border);background:var(--cream);font-weight:500">Waktu</th>
      <th style="padding:10px 14px;text-align:left;font-size:8px;letter-spacing:2px;text-transform:uppercase;color:var(--muted-l);border-bottom:1px solid var(--border);background:var(--cream);font-weight:500">Aksi</th>
    </tr></thead><tbody>`;
  data.forEach((k, i) => {
    html += `<tr style="border-bottom:1px solid rgba(201,169,110,0.1)">
      <td style="padding:11px 14px;color:var(--muted-l);font-size:11px">${i + 1}</td>
      <td style="padding:11px 14px"><strong style="font-weight:500">${k.nama || '—'}</strong></td>
      <td style="padding:11px 14px;font-family:'Cormorant Garamond',serif;font-style:italic;font-size:15px;color:var(--muted)">"${k.isi || ''}"</td>
      <td style="padding:11px 14px;font-size:11px;color:var(--muted-l);white-space:nowrap">${fmtWaktuLengkap(k.created_at)}</td>
      <td style="padding:11px 14px"><button class="btn btn-danger btn-xs" onclick="window._app.openDel('${k.id}','${(k.nama || '').replace(/'/g,"\\'")}','komentar')">Hapus</button></td>
    </tr>`;
  });
  html += '</tbody></table>';
  list.innerHTML = html;
}
