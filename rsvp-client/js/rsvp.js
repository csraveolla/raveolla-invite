// ============================================================
// rsvp.js — Tab RSVP
// ============================================================
import { SB, H, PER } from './config.js';
import { fmtWaktu, fmtWaktuLengkap, renderPagination, downloadCSV } from './utils.js';
import { clientData } from './auth.js';
import { openDel } from './tamu.js';

export let allRsvp      = [];
export let filteredRsvp = [];
let rsvpPage = 1;

export async function loadRsvp() {
  try {
    const res = await fetch(
      `${SB}/rest/v1/rsvp_tamu?client_id=eq.${clientData.id}&select=*&order=created_at.desc`,
      { headers: H }
    );
    allRsvp = await res.json();
    if (!Array.isArray(allRsvp)) allRsvp = [];

    document.getElementById('sr-total').textContent   = allRsvp.length;
    document.getElementById('sr-hadir').textContent   = allRsvp.filter(r => r.kehadiran === 'Hadir').length;
    document.getElementById('sr-tidak').textContent   = allRsvp.filter(r => r.kehadiran === 'Tidak Hadir').length;
    document.getElementById('sr-checkin').textContent = allRsvp.filter(r => r.status_hadir).length;
    document.getElementById('badge-rsvp').textContent = allRsvp.length;

    filterRsvp();
    window._appModules.reminder.updateCountHadir();
    window._appModules.reminder.updateCountBelumRsvp();
  } catch (e) { console.error(e); }
}

export function filterRsvp() {
  const kehadiran = document.getElementById('f-rsvp-kehadiran').value;
  const checkin   = document.getElementById('f-rsvp-checkin').value;
  const cari      = document.getElementById('f-rsvp-cari').value.toLowerCase();
  filteredRsvp = allRsvp.filter(r => {
    if (kehadiran && r.kehadiran !== kehadiran) return false;
    if (checkin === 'sudah' && !r.status_hadir) return false;
    if (checkin === 'belum' &&  r.status_hadir) return false;
    if (cari && !r.nama?.toLowerCase().includes(cari) && !r.telpon?.includes(cari)) return false;
    return true;
  });
  rsvpPage = 1;
  renderRsvpTable();
}

export function renderRsvpTable() {
  if (!filteredRsvp.length) {
    document.getElementById('rsvp-table').innerHTML = '<div class="state-box">Belum ada data RSVP.</div>';
    return;
  }
  const start = (rsvpPage - 1) * PER;
  const data  = filteredRsvp.slice(start, start + PER);
  let html = `<table><thead><tr>
    <th>#</th><th>Nama</th><th>Telpon</th><th>RSVP</th>
    <th>Check-in</th><th>Waktu Check-in</th><th>Pesan</th><th>Waktu RSVP</th><th>Aksi</th>
  </tr></thead><tbody>`;
  data.forEach((r, i) => {
    const rsvpB = r.kehadiran === 'Hadir'
      ? `<span class="badge b-green">Hadir</span>`
      : `<span class="badge b-red">Tidak Hadir</span>`;
    const ciB   = r.status_hadir ? `<span class="badge b-gold">✓ Hadir</span>` : `<span class="badge b-grey">Belum</span>`;
    html += `<tr>
      <td style="color:var(--muted-l);font-size:11px">${start + i + 1}</td>
      <td><strong style="font-weight:500">${r.nama || '—'}</strong></td>
      <td style="font-family:monospace;font-size:11px">${r.telpon || '—'}</td>
      <td>${rsvpB}</td><td>${ciB}</td>
      <td style="font-size:11px;color:var(--muted-l)">${r.waktu_hadir ? fmtWaktu(r.waktu_hadir) : '—'}</td>
      <td style="font-size:11px;color:var(--muted-l);max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.pesan || '—'}</td>
      <td style="font-size:11px;color:var(--muted-l)">${fmtWaktu(r.created_at)}</td>
      <td><button class="btn btn-danger btn-xs" onclick="window._app.openDel('${r.id}','${(r.nama || '').replace(/'/g,"\\'")}','rsvp_tamu')">Hapus</button></td>
    </tr>`;
  });
  html += '</tbody></table>';
  document.getElementById('rsvp-table').innerHTML = html;
  renderPagination('rsvp-table', filteredRsvp.length, rsvpPage, p => { rsvpPage = p; renderRsvpTable(); });
}

export function exportRsvpCSV() {
  if (!filteredRsvp.length) return;
  const headers = ['No','Nama','Telpon','RSVP','Check-in','Waktu Check-in','Pesan','Waktu RSVP'];
  const rows    = filteredRsvp.map((r, i) => [
    i + 1, r.nama, r.telpon, r.kehadiran,
    r.status_hadir ? 'Sudah' : 'Belum',
    r.waktu_hadir ? fmtWaktuLengkap(r.waktu_hadir) : '',
    (r.pesan || '').replace(/,/g, ';'),
    fmtWaktuLengkap(r.created_at)
  ]);
  downloadCSV([headers, ...rows], `RSVP_${clientData.nama_acara}`);
}
