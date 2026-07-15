// ============================================================
// tamu.js — Daftar Tamu, CRUD, Filter, Import Excel
// ============================================================
import { SB, H, DEFAULT_TEMPLATE, PER } from './config.js';
import { showMsg, showToast, closeModal, renderPagination, genTamuId, fmtWaktu } from './utils.js';
import { clientData, BASE_URL, paketFitur } from './auth.js';

export let allTamu      = [];
export let filteredTamu = [];
let tamuPage = 1;

// ── Load ──────────────────────────────────────────────────────

export async function loadAll() {
  const { loadRsvp }    = window._appModules.rsvp;
  const { loadKomentar } = window._appModules.komentar;
  await Promise.all([loadTamu(), loadRsvp(), loadKomentar()]);
}

export async function loadTamu() {
  try {
    const [r1, r2, r3] = await Promise.all([
      fetch(`${SB}/rest/v1/tamu_undangan?client_id=eq.${clientData.id}&select=*&order=created_at.asc`, { headers: H }),
      fetch(`${SB}/rest/v1/rsvp_tamu?client_id=eq.${clientData.id}&select=tamu_id`, { headers: H }),
      fetch(`${SB}/rest/v1/reminder_log?client_id=eq.${clientData.id}&select=tamu_id,tipe,status&status=in.(sent,sending)`, { headers: H })
    ]);

    if (!document.getElementById('pesan-template').value) {
      document.getElementById('pesan-template').value = clientData.pesan_template || DEFAULT_TEMPLATE;
    }

    allTamu = await r1.json();
    const rsvpIds      = (await r2.json()).map(r => r.tamu_id);
    const reminderRows = r3.ok ? await r3.json() : [];
    if (!Array.isArray(allTamu)) allTamu = [];

    const reminderMap = {};
    reminderRows.forEach(r => {
      if (!reminderMap[r.tamu_id]) reminderMap[r.tamu_id] = {};
      reminderMap[r.tamu_id][r.tipe] = r.status;
    });

    allTamu = allTamu.map(t => ({
      ...t,
      sudah_rsvp: rsvpIds.includes(t.id),
      _reminder:  reminderMap[t.id] || {}
    }));

    updateTamuStats();
    filterTamu();
    window._appModules.reminder.updateReminderSummary();
    document.getElementById('badge-tamu').textContent = allTamu.length;

    const max = clientData.max_tamu || paketFitur.max_tamu;
    document.getElementById('tamu-quota-text').textContent = `${allTamu.length} / ${max} tamu`;
    const overQuota = allTamu.length >= max;
    document.getElementById('btn-tambah-tamu').disabled = overQuota;
    if (overQuota) showToast(`Kuota tamu paket sudah penuh (${max})`);

    const tmpl = clientData.pesan_template || DEFAULT_TEMPLATE;
    const preview = document.getElementById('ks-template-preview');
    if (preview) preview.textContent = tmpl.substring(0, 200) + (tmpl.length > 200 ? '...' : '');
  } catch (e) { console.error(e); }
}

// ── Stats & Filter ────────────────────────────────────────────

function updateTamuStats() {
  document.getElementById('st-total').textContent = allTamu.length;
  document.getElementById('st-kirim').textContent = allTamu.filter(t => t.status_kirim).length;
  document.getElementById('st-buka').textContent  = allTamu.filter(t => t.status_buka).length;
  document.getElementById('st-rsvp').textContent  = allTamu.filter(t => t.sudah_rsvp).length;
  document.getElementById('st-belum').textContent = allTamu.filter(t => !t.sudah_rsvp).length;
}

export function filterTamu() {
  const cari   = document.getElementById('f-tamu-cari').value.toLowerCase();
  const status = document.getElementById('f-tamu-status').value;
  filteredTamu = allTamu.filter(t => {
    if (cari && !t.nama.toLowerCase().includes(cari)) return false;
    if (status === 'terkirim' && !t.status_kirim) return false;
    if (status === 'belum'    &&  t.status_kirim) return false;
    if (status === 'buka'     && !t.status_buka)  return false;
    if (status === 'rsvp'     && !t.sudah_rsvp)   return false;
    return true;
  });
  tamuPage = 1;
  renderTamuTable();
}

// ── Render Table ──────────────────────────────────────────────

export function renderTamuTable() {
  if (!filteredTamu.length) {
    document.getElementById('tamu-table').innerHTML = '<div class="state-box">Belum ada tamu.</div>';
    return;
  }
  const start = (tamuPage - 1) * PER;
  const data  = filteredTamu.slice(start, start + PER);
  let html = `<table><thead><tr>
    <th>#</th><th>Nama Tamu</th><th>WhatsApp</th>
    <th>Link Undangan</th><th>Buka</th><th>RSVP</th><th>Terkirim</th><th>Reminder</th><th>Aksi</th>
  </tr></thead><tbody>`;
  data.forEach((t, i) => {
    const link   = `${BASE_URL}?tamu=${t.id}`;
    const waLink = buildWALink(t);
    const buka   = t.status_buka  ? `<span class="badge b-green">✓ Dibuka</span>`   : `<span class="badge b-grey">Belum</span>`;
    const rsvp   = t.sudah_rsvp   ? `<span class="badge b-gold">✓ RSVP</span>`      : `<span class="badge b-grey">Belum</span>`;
    const kirim  = t.status_kirim ? `<span class="badge b-green">✓ Terkirim</span>` : `<span class="badge b-grey">Belum</span>`;
    const rem = t._reminder || {};
    const remBadge = (tipe, label) => rem[tipe]
      ? `<span class="badge b-green" title="${label} sudah dikirim">✓ ${label}</span>`
      : `<span class="badge b-grey" title="${label} belum dikirim">– ${label}</span>`;
    const reminderHtml = `<div style="display:flex;flex-wrap:wrap;gap:2px">
      ${remBadge('rsvp','RSVP')} ${remBadge('h3','H-3')} ${remBadge('h1','H-1')} ${remBadge('ucapan','Ucapan')}
    </div>`;
    html += `<tr>
      <td style="color:var(--muted-l);font-size:11px">${start + i + 1}</td>
      <td><strong style="font-weight:500">${t.nama}</strong></td>
      <td style="font-family:monospace;font-size:11px">${t.telpon || '—'}</td>
      <td><div class="link-cell"><span class="link-text" title="${link}">${link}</span>
        <button class="copy-btn" onclick="window._app.copyText('${link}',this)">⎘</button></div></td>
      <td>${buka}</td><td>${rsvp}</td><td>${kirim}</td>
      <td>${reminderHtml}</td>
      <td><div style="display:flex;gap:4px;flex-wrap:wrap">
        <a href="${waLink}" target="_blank" onclick="window._app.tandaiKirim('${t.id}')" class="btn btn-green btn-xs">WA</a>
        <button class="btn btn-outline btn-xs" onclick="window._app.openEdit('${t.id}')">Edit</button>
        <button class="btn btn-danger btn-xs" onclick="window._app.openDel('${t.id}','${t.nama.replace(/'/g,"\\'")}','tamu_undangan')">Hapus</button>
      </div></td>
    </tr>`;
  });
  html += '</tbody></table>';
  document.getElementById('tamu-table').innerHTML = html;
  renderPagination('tamu-table', filteredTamu.length, tamuPage, p => { tamuPage = p; renderTamuTable(); });
}

// ── WA Link ───────────────────────────────────────────────────

export function buildWALink(t) {
  const telpon   = (t.telpon || '').replace(/\D/g, '');
  const link     = `${BASE_URL}?tamu=${t.id}`;
  const template = document.getElementById('pesan-template').value || DEFAULT_TEMPLATE;
  const pesan    = template.replace(/\{nama\}/g, t.nama).replace(/\{link\}/g, link);
  return `https://wa.me/${telpon}?text=${encodeURIComponent(pesan)}`;
}

export async function tandaiKirim(tamuId) {
  await fetch(`${SB}/rest/v1/tamu_undangan?id=eq.${tamuId}`, {
    method: 'PATCH', headers: H, body: JSON.stringify({ status_kirim: true })
  });
  const t = allTamu.find(x => x.id === tamuId);
  if (t) t.status_kirim = true;
  renderTamuTable();
  updateTamuStats();
}

// ── CRUD ──────────────────────────────────────────────────────

export async function tambahTamu() {
  const nama   = document.getElementById('t-nama').value.trim();
  const telpon = document.getElementById('t-telpon').value.trim();
  const msg    = document.getElementById('msg-tamu');
  if (!nama) { showMsg(msg, 'error', 'Nama tamu wajib diisi!'); return; }
  const max = clientData.max_tamu || paketFitur.max_tamu;
  if (allTamu.length >= max) { showMsg(msg, 'error', `Kuota tamu paket sudah penuh (${max} tamu).`); return; }
  try {
    const res = await fetch(`${SB}/rest/v1/tamu_undangan`, {
      method: 'POST', headers: { ...H, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ id: genTamuId(), client_id: clientData.id, nama, telpon })
    });
    if (res.ok || res.status === 201) {
      showMsg(msg, 'success', `✓ Tamu "${nama}" ditambahkan!`);
      document.getElementById('t-nama').value   = '';
      document.getElementById('t-telpon').value = '';
      loadTamu();
    } else { const e = await res.json(); throw new Error(e.message || 'Gagal'); }
  } catch (e) { showMsg(msg, 'error', '✗ ' + e.message); }
}

export function openEdit(id) {
  const t = allTamu.find(x => x.id === id); if (!t) return;
  document.getElementById('edit-id').value     = t.id;
  document.getElementById('edit-nama').value   = t.nama;
  document.getElementById('edit-telpon').value = t.telpon || '';
  document.getElementById('edit-pesan').value  = t.pesan_custom || '';
  document.getElementById('modal-edit').classList.add('show');
}

export async function simpanEdit() {
  const id     = document.getElementById('edit-id').value;
  const nama   = document.getElementById('edit-nama').value.trim();
  const telpon = document.getElementById('edit-telpon').value.trim();
  const pesan  = document.getElementById('edit-pesan').value.trim();
  if (!nama) { showToast('Nama tidak boleh kosong'); return; }
  try {
    const res = await fetch(`${SB}/rest/v1/tamu_undangan?id=eq.${id}`, {
      method: 'PATCH', headers: H, body: JSON.stringify({ nama, telpon, pesan_custom: pesan })
    });
    if (res.ok) { closeModal('modal-edit'); showToast('✓ Data tamu diperbarui'); loadTamu(); }
  } catch (e) { showToast('Error: ' + e.message); }
}

export let delTarget = null, delTable = null;

export function openDel(id, nama, table) {
  delTarget = id; delTable = table;
  document.getElementById('del-msg').textContent = `Data "${nama}" akan dihapus permanen.`;
  document.getElementById('modal-del').classList.add('show');
}

export async function confirmDel() {
  if (!delTarget) return;
  closeModal('modal-del');
  try {
    const res = await fetch(`${SB}/rest/v1/${delTable}?id=eq.${delTarget}`, { method: 'DELETE', headers: H });
    if (res.ok) {
      showToast('✓ Data berhasil dihapus');
      if (delTable === 'tamu_undangan') loadTamu();
      if (delTable === 'rsvp_tamu')     window._appModules.rsvp.loadRsvp();
      if (delTable === 'komentar')      window._appModules.komentar.loadKomentar();
    }
  } catch (e) { showToast('Error: ' + e.message); }
  delTarget = null; delTable = null;
}

// ── Import / Export Excel ─────────────────────────────────────

export function importExcel(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const wb   = XLSX.read(e.target.result, { type: 'array' });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
      const max  = clientData.max_tamu || paketFitur.max_tamu;
      const sisa = max - allTamu.length;
      const data = rows.slice(1).filter(r => r[0]).slice(0, sisa).map(r => ({
        id: genTamuId(), client_id: clientData.id,
        nama: String(r[0] || '').trim(),
        telpon: String(r[1] || '').trim(),
        pesan_custom: String(r[2] || '').trim()
      }));
      if (!data.length) { showToast('Tidak ada data di Excel atau kuota penuh'); return; }
      const res = await fetch(`${SB}/rest/v1/tamu_undangan`, {
        method: 'POST', headers: { ...H, 'Prefer': 'return=minimal' },
        body: JSON.stringify(data)
      });
      if (res.ok || res.status === 201) { showToast(`✓ ${data.length} tamu diimport!`); loadTamu(); }
      else throw new Error('Gagal import');
    } catch (e) { showToast('Error: ' + e.message); }
    input.value = '';
  };
  reader.readAsArrayBuffer(file);
}

export function downloadTemplateExcel() {
  const ws = XLSX.utils.aoa_to_sheet([
    ['Nama', 'Nomor WA', 'Pesan Custom'],
    ['Contoh Nama', '628123456789', 'Pesan khusus (opsional)']
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Tamu');
  XLSX.writeFile(wb, 'template_tamu_undangan.xlsx');
  return false;
}

// ── Template Pesan ────────────────────────────────────────────

export async function simpanTemplate() {
  const tmpl = document.getElementById('pesan-template').value.trim();
  const msg  = document.getElementById('msg-template');
  if (!tmpl) return;
  try {
    const res = await fetch(`${SB}/rest/v1/clients?id=eq.${clientData.id}`, {
      method: 'PATCH', headers: H, body: JSON.stringify({ pesan_template: tmpl })
    });
    if (res.ok) { clientData.pesan_template = tmpl; showMsg(msg, 'success', '✓ Template disimpan!'); }
    else throw new Error('Gagal');
  } catch (e) { showMsg(msg, 'error', '✗ ' + e.message); }
}

export function resetTemplate() {
  document.getElementById('pesan-template').value = DEFAULT_TEMPLATE;
  showToast('Template direset ke default');
}
