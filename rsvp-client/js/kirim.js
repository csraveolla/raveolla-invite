// ============================================================
// kirim.js — Kirim WA Massal, Jadwal, Konfirmasi Duplikasi
// ============================================================
import { SB, H, DEFAULT_TEMPLATE, FONNTE } from './config.js';
import { showMsg, showToast, fmtWaktuLengkap, addLog, delay, showPill, updatePill, addPillItem, updatePillSub } from './utils.js';
import { clientData, BASE_URL, paketFitur } from './auth.js';
import { allTamu, renderTamuTable, buildWALink } from './tamu.js';
import { incrWaQuota, cekKuotaWa } from './paket.js';
import { insertWaLog } from './log.js';

export let kirimSelectedIds = [];
export let kirimRunning     = false;
export let kirimStop        = false;
export let jadwalMode       = 'sekarang';

// ── Kirim Tab UI ──────────────────────────────────────────────

export function filterKirimTamu() { updateKirimTamuList(); }

export function getKirimTargetList() {
  const { allRsvp } = window._appModules.rsvp;
  const filter = document.getElementById('ks-filter')?.value || 'all';
  return allTamu.filter(t => {
    if (!t.telpon) return false;
    if (filter === 'belum_kirim' && t.status_kirim) return false;
    if (filter === 'belum_rsvp'  && t.sudah_rsvp)  return false;
    if (filter === 'sudah_rsvp_hadir') {
      const rsvp = allRsvp.find(r => r.tamu_id === t.id);
      if (!rsvp || rsvp.kehadiran !== 'Hadir') return false;
    }
    return true;
  });
}

export function updateKirimTamuList() {
  const list = getKirimTargetList();
  document.getElementById('ks-count').textContent = `${list.length} tamu`;
  kirimSelectedIds = [...list.map(t => t.id)];
  document.getElementById('ks-selected-count').textContent = `${kirimSelectedIds.length} dipilih`;
  document.getElementById('ks-select-all').checked = true;

  let html = `<table style="width:100%;border-collapse:collapse;font-size:11px">
    <thead><tr style="background:var(--cream)">
      <th style="padding:6px 10px;width:32px">
        <input type="checkbox" id="ks-header-check" checked onchange="window._app.toggleSelectAll()" style="accent-color:var(--gold)">
      </th>
      <th style="padding:6px 10px;text-align:left;font-size:8px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted-l)">Nama</th>
      <th style="padding:6px 10px;text-align:left;font-size:8px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted-l)">Nomor WA</th>
      <th style="padding:6px 10px;text-align:left;font-size:8px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted-l)">Status</th>
    </tr></thead><tbody>`;

  list.forEach(t => {
    const kirimB = t.status_kirim
      ? `<span class="badge b-green" style="font-size:8px">Terkirim</span>`
      : `<span class="badge b-grey" style="font-size:8px">Belum</span>`;
    html += `<tr style="border-bottom:1px solid rgba(201,169,110,0.1)">
      <td style="padding:5px 10px">
        <input type="checkbox" class="table-check ks-item-check" data-id="${t.id}" checked onchange="window._app.updateSelectedCount()" style="accent-color:var(--gold)">
      </td>
      <td style="padding:5px 10px;font-weight:500">${t.nama}</td>
      <td style="padding:5px 10px;font-family:monospace;color:var(--muted-l)">${t.telpon}</td>
      <td style="padding:5px 10px">${kirimB}</td>
    </tr>`;
  });
  html += '</tbody></table>';
  if (!list.length) html = '<div style="padding:16px;text-align:center;font-size:12px;color:var(--muted-l)">Tidak ada tamu sesuai filter.</div>';
  document.getElementById('ks-list-mini').innerHTML = html;
}

export function toggleSelectAll() {
  const checked = document.getElementById('ks-select-all').checked;
  document.querySelectorAll('.ks-item-check').forEach(cb => cb.checked = checked);
  const headerCheck = document.getElementById('ks-header-check');
  if (headerCheck) headerCheck.checked = checked;
  updateSelectedCount();
}

export function updateSelectedCount() {
  const checks = document.querySelectorAll('.ks-item-check:checked');
  kirimSelectedIds = Array.from(checks).map(c => c.dataset.id);
  document.getElementById('ks-selected-count').textContent = `${kirimSelectedIds.length} dipilih`;
  const all    = document.querySelectorAll('.ks-item-check');
  const selAll = document.getElementById('ks-select-all');
  if (selAll) selAll.checked = checks.length === all.length && all.length > 0;
}

export function setJadwal(mode) {
  if (mode === 'jadwal' && !paketFitur.jadwal) {
    showToast('Fitur Jadwal Kirim hanya tersedia di paket Premium');
    return;
  }
  jadwalMode = mode;
  document.getElementById('jopt-sekarang').classList.toggle('active', mode === 'sekarang');
  document.getElementById('jopt-jadwal').classList.toggle('active', mode === 'jadwal');
  document.getElementById('jadwal-picker').style.display = mode === 'jadwal' ? 'block' : 'none';
}

// ── Mulai Kirim ───────────────────────────────────────────────

export async function mulaiKirim() {
  if (kirimRunning) return;
  if (!kirimSelectedIds.length) { showToast('Pilih minimal 1 tamu dulu'); return; }
  const msg = document.getElementById('msg-kirim');

  if (jadwalMode === 'jadwal') {
    const tanggal = document.getElementById('jadwal-tanggal').value;
    const jam     = document.getElementById('jadwal-jam').value;
    if (!tanggal || !jam) { showMsg(msg, 'error', 'Tentukan tanggal dan jam jadwal kirim!'); return; }
    const waktuIso = `${tanggal}T${jam}:00:00+07:00`;
    if (new Date(waktuIso) <= new Date()) { showMsg(msg, 'error', 'Jadwal harus di masa depan!'); return; }
    await simpanJadwal(tanggal, jam);
    return;
  }

  const bolehKirim = await cekKuotaWa(kirimSelectedIds.length);
  if (!bolehKirim) return;
  if (bolehKirim < kirimSelectedIds.length) kirimSelectedIds = kirimSelectedIds.slice(0, bolehKirim);

  let apiKey = await getApiKey();

  const doKirim = async () => {
    if (apiKey) await kirimViaFonnte(apiKey);
    else await kirimManualLoop();
  };

  await cekDanKonfirmasiKirimMassal(doKirim, doKirim);
}

async function getApiKey() {
  if (clientData.wa_mode === 'client') return clientData.wa_api_key || null;
  try {
    const res  = await fetch(`${SB}/rest/v1/admin_settings?id=eq.admin_apikey&select=value`, { headers: H });
    if (res.ok) { const rows = await res.json(); return rows?.[0]?.value || null; }
  } catch (e) {}
  return JSON.parse(localStorage.getItem('rsvp_admin_setting') || '{}').adminApiKey || null;
}

// ── Kirim via Fonnte ──────────────────────────────────────────

export async function kirimViaFonnte(apiKey, templateOverride, logTipe) {
  const tipeLog = logTipe || (templateOverride ? 'reminder_hadir' : 'massal');
  kirimRunning = true; kirimStop = false;
  document.getElementById('btn-mulai-kirim').disabled = true;
  document.getElementById('btn-stop-kirim').style.display = 'inline-block';
  const btnLanjutEl = document.getElementById('btn-lanjut-kirim');
  if (btnLanjutEl) btnLanjutEl.style.display = 'none';
  const progressLog = document.getElementById('progress-log');
  progressLog.style.display = 'block'; progressLog.innerHTML = '';
  showPill(true);

  const tamuToSend = allTamu.filter(t => kirimSelectedIds.includes(t.id) && t.telpon);
  const batasBatch = parseInt(document.getElementById('batas-batch')?.value) || 30;
  const tamuBatch  = tamuToSend.slice(0, batasBatch);
  const adaSisa    = tamuToSend.length > batasBatch;
  const template   = templateOverride || clientData.pesan_template || DEFAULT_TEMPLATE;
  const jedaMin    = parseInt(document.getElementById('jeda-min')?.value) || 5;
  const jedaMax    = parseInt(document.getElementById('jeda-max')?.value) || 30;
  let berhasil = 0, gagal = 0;

  if (adaSisa) addLog(progressLog, `ℹ Batas batch ${batasBatch} pesan — mengirim ${tamuBatch.length} dari ${tamuToSend.length} tamu.`, 'pending');

  for (let i = 0; i < tamuBatch.length; i++) {
    if (kirimStop) { addLog(progressLog, '⏹ Pengiriman dihentikan.', 'pending'); break; }
    const t = tamuBatch[i];
    updatePill(i, tamuBatch.length, t.nama);
    await new Promise(r => setTimeout(r, 0));
    const link   = `${BASE_URL}?tamu=${t.id}`;
    const pesan  = template.replace(/\{nama\}/g, t.nama).replace(/\{link\}/g, link);
    const telpon = t.telpon.replace(/\D/g, '');
    try {
      const fonnteParams = { target: telpon, message: pesan };
      if (clientData.wa_media_url && (clientData.paket === 'pro' || clientData.paket === 'premium'))
        fonnteParams.url = clientData.wa_media_url;
      const res  = await fetch(FONNTE, {
        method: 'POST', headers: { 'Authorization': apiKey }, body: new URLSearchParams(fonnteParams)
      });
      const data = await res.json();
      if (data.status === true) {
        berhasil++;
        addLog(progressLog, `✓ ${t.nama} (${telpon}) — Terkirim`, 'success');
        addPillItem(t.nama, 'ok', telpon);
        fetch(`${SB}/rest/v1/tamu_undangan?id=eq.${t.id}`, { method: 'PATCH', headers: H, body: JSON.stringify({ status_kirim: true }) });
        incrWaQuota(1);
        const found = allTamu.find(x => x.id === t.id);
        if (found) found.status_kirim = true;
        insertWaLog({ tamu_id: t.id, nomor: telpon, nama: t.nama, pesan, status: 'sent',   tipe: tipeLog });
      } else {
        gagal++;
        addLog(progressLog, `✗ ${t.nama} — Gagal: ${data.reason || data.message || 'Error API'}`, 'fail');
        addPillItem(t.nama, 'fail', telpon);
        insertWaLog({ tamu_id: t.id, nomor: telpon, nama: t.nama, pesan, status: 'failed', tipe: tipeLog });
      }
    } catch (e) {
      gagal++;
      addLog(progressLog, `✗ ${t.nama} — Error: ${e.message}`, 'fail');
      addPillItem(t.nama, 'fail', '');
      insertWaLog({ tamu_id: t.id, nomor: telpon, nama: t.nama, pesan: '', status: 'failed', tipe: tipeLog });
    }
    if (i < tamuBatch.length - 1 && !kirimStop) {
      const jeda = (jedaMin + Math.random() * (jedaMax - jedaMin)) * 1000;
      updatePillSub(`Jeda ${Math.round(jeda / 1000)} detik...`);
      await delay(jeda);
    }
  }

  updatePill(tamuBatch.length, tamuBatch.length, '');
  updatePillSub(`✓ ${berhasil} berhasil · ${gagal > 0 ? '✗ ' + gagal + ' gagal' : 'semua oke'}`);
  setTimeout(() => showPill(false), 4000);
  addLog(progressLog, `── Total: ${berhasil} berhasil, ${gagal} gagal ──`, 'pending');
  if (adaSisa && !kirimStop)
    addLog(progressLog, `⚠ Masih ada ${tamuToSend.length - batasBatch} tamu belum dikirim.`, 'pending');
  showMsg(document.getElementById('msg-kirim'), berhasil > 0 ? 'success' : 'error',
    `${berhasil} pesan terkirim, ${gagal} gagal.`);

  kirimRunning = false;
  document.getElementById('btn-mulai-kirim').disabled = false;
  document.getElementById('btn-stop-kirim').style.display = 'none';
  const btnLanjut2 = document.getElementById('btn-lanjut-kirim');
  if (btnLanjut2) {
    const belumSisa = allTamu.filter(t => !t.status_kirim && t.telpon).length;
    btnLanjut2.style.display = (belumSisa > 0 && gagal > 0) ? 'inline-block' : 'none';
  }
  renderTamuTable();
  window._appModules.tamu.updateTamuStats?.();
  window._appModules.log.loadKirimLog();
}

// ── Manual / Fallback ─────────────────────────────────────────

export async function kirimManualLoop() {
  const tamuToSend = allTamu.filter(t => kirimSelectedIds.includes(t.id) && t.telpon);
  if (!tamuToSend.length) { showToast('Tidak ada tamu dengan nomor WA'); return; }
  showMsg(document.getElementById('msg-kirim'), 'info', `Mode Manual: ${tamuToSend.length} WA akan dibuka satu per satu.`);
  for (const t of tamuToSend) {
    window.open(buildWALink(t), '_blank');
    await delay(1000);
    await fetch(`${SB}/rest/v1/tamu_undangan?id=eq.${t.id}`, { method: 'PATCH', headers: H, body: JSON.stringify({ status_kirim: true }) });
  }
  showToast('✓ Semua WA dibuka!');
  window._appModules.tamu.loadTamu();
}

export async function kirimManualLoopWithTemplate(targets, template) {
  if (!targets.length) { showToast('Tidak ada tamu dengan nomor WA'); return; }
  for (const t of targets) {
    const link  = `${BASE_URL}?tamu=${t.id}`;
    const pesan = template.replace(/\{nama\}/g, t.nama).replace(/\{link\}/g, link);
    const telpon = (t.telpon || '').replace(/\D/g, '');
    window.open(`https://wa.me/${telpon}?text=${encodeURIComponent(pesan)}`, '_blank');
    await delay(1000);
  }
  showToast('✓ Semua WA reminder dibuka!');
}

export function stopKirim() {
  kirimStop = true;
  showPill(false);
  showToast('Menghentikan pengiriman...');
  setTimeout(() => {
    const btnLanjut3 = document.getElementById('btn-lanjut-kirim');
    if (btnLanjut3) {
      const belumKirim = allTamu.filter(t => !t.status_kirim && t.telpon).length;
      if (belumKirim > 0) { btnLanjut3.style.display = 'inline-block'; }
    }
  }, 1500);
}

export async function lanjutkanKirim() {
  const belum = allTamu.filter(t => !t.status_kirim && t.telpon);
  if (!belum.length) { showToast('✓ Semua tamu sudah terkirim!'); document.getElementById('btn-lanjut-kirim').style.display = 'none'; return; }
  kirimSelectedIds = belum.map(t => t.id);
  document.getElementById('btn-lanjut-kirim').style.display = 'none';
  const bolehKirim = await cekKuotaWa(kirimSelectedIds.length);
  if (!bolehKirim) return;
  if (bolehKirim < kirimSelectedIds.length) kirimSelectedIds = kirimSelectedIds.slice(0, bolehKirim);
  const apiKey = await getApiKey();
  if (apiKey) await kirimViaFonnte(apiKey);
  else await kirimManualLoop();
}

// ── Jadwal Simpan ─────────────────────────────────────────────

export async function simpanJadwal(tanggal, jam) {
  const msg      = document.getElementById('msg-kirim');
  const waktuIso = `${tanggal}T${jam}:00:00+07:00`;
  const waktuTampil = new Date(waktuIso).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
  await cekDanKonfirmasiJadwal({
    waktuIso, waktuTampil, msg,
    onLanjut: async (tamuIdsFinal) => {
      try {
        const res = await fetch(`${SB}/rest/v1/kirim_jadwal`, {
          method: 'POST',
          headers: { ...H, 'Prefer': 'return=minimal' },
          body: JSON.stringify({ client_id: clientData.id, tamu_ids: tamuIdsFinal, waktu_kirim: waktuIso, total_tamu: tamuIdsFinal.length, status: 'terjadwal' })
        });
        if (!res.ok) { const err = await res.text(); throw new Error(err); }
        showMsg(msg, 'success', `✓ ${tamuIdsFinal.length} pesan dijadwalkan untuk ${waktuTampil}.`);
        window._appModules.log.loadKirimLog();
      } catch (e) { showMsg(msg, 'error', 'Gagal simpan jadwal: ' + e.message); }
    }
  });
}

// ── Cek Duplikasi Kirim Massal ────────────────────────────────

const normNomor = (tel) => {
  let n = String(tel || '').replace(/\D/g, '');
  if (n.startsWith('0')) n = '62' + n.slice(1);
  if (n.startsWith('8')) n = '62' + n;
  if (!n.startsWith('62')) n = '62' + n;
  return n;
};

async function cekDanKonfirmasiKirimMassal(onKirimSemua, onKirimBelum) {
  const selectedIds = new Set(kirimSelectedIds);
  try {
    const res  = await fetch(`${SB}/rest/v1/wa_log?client_id=eq.${clientData.id}&tipe=eq.massal&status=eq.sent&select=tamu_id,nomor,sent_at&order=sent_at.desc&limit=500`, { headers: H });
    const logs = res.ok ? await res.json() : [];
    if (!logs.length) { onKirimSemua(); return; }
    const tamuIdSudah = new Set(logs.map(l => l.tamu_id).filter(Boolean));
    const nomorSudah  = new Set(logs.filter(l => !l.tamu_id).map(l => normNomor(l.nomor)));
    const tamuDipilih = allTamu.filter(t => selectedIds.has(t.id));
    const sudah = tamuDipilih.filter(t => tamuIdSudah.has(t.id) || (!tamuIdSudah.size && nomorSudah.has(normNomor(t.telpon))));
    const belum = tamuDipilih.filter(t => !sudah.includes(t));
    if (!sudah.length) { onKirimSemua(); return; }
    const terakhir = logs[0]?.sent_at ? fmtWaktuLengkap(logs[0].sent_at) : '—';
    showModalKirimMassal({
      jumlahSemua: tamuDipilih.length, jumlahSudah: sudah.length, jumlahBelum: belum.length, terakhirKirim: terakhir,
      onKirimSemua,
      onKirimBelum: belum.length > 0 ? () => { kirimSelectedIds = belum.map(t => t.id); onKirimBelum(); } : null
    });
  } catch (e) { onKirimSemua(); }
}

function showModalKirimMassal({ jumlahSemua, jumlahSudah, jumlahBelum, terakhirKirim, onKirimSemua, onKirimBelum }) {
  const existing = document.getElementById('modal-konfirmasi-massal');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.id = 'modal-konfirmasi-massal';
  modal.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px`;
  modal.innerHTML = `
    <div style="background:white;max-width:420px;width:100%;padding:24px;box-shadow:0 8px 32px rgba(0,0,0,0.2)">
      <div style="font-size:13px;font-weight:600;letter-spacing:0.5px;margin-bottom:8px">⚠️ Peringatan Pengiriman Ganda</div>
      <div style="font-size:12px;color:var(--muted);margin-bottom:16px;line-height:1.6">
        <strong>${jumlahSudah} dari ${jumlahSemua} tamu</strong> sudah pernah menerima pesan massal.<br>
        <span style="font-size:11px">Terakhir dikirim: ${terakhirKirim}</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${onKirimBelum ? `<button id="modal-btn-belum" class="btn btn-gold" style="width:100%;justify-content:center">▶ Kirim hanya yang belum (${jumlahBelum} tamu)</button>` : `<div style="font-size:11px;color:var(--muted);padding:8px;background:var(--cream);text-align:center">Semua tamu yang dipilih sudah pernah dikirim</div>`}
        <button id="modal-btn-semua" class="btn btn-outline" style="width:100%;justify-content:center">Kirim ke semua (${jumlahSemua} tamu)</button>
        <button id="modal-btn-batal" class="btn" style="width:100%;justify-content:center;background:var(--cream);color:var(--muted)">Batal</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.querySelector('#modal-btn-batal').onclick = () => modal.remove();
  modal.querySelector('#modal-btn-semua').onclick  = () => { modal.remove(); onKirimSemua(); };
  if (onKirimBelum) modal.querySelector('#modal-btn-belum').onclick = () => { modal.remove(); onKirimBelum(); };
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

async function cekDanKonfirmasiJadwal({ waktuIso, waktuTampil, msg, onLanjut }) {
  const selectedIds = new Set(kirimSelectedIds);
  try {
    const [resLog, resJadwal] = await Promise.all([
      fetch(`${SB}/rest/v1/wa_log?client_id=eq.${clientData.id}&tipe=eq.massal&status=eq.sent&select=tamu_id,nomor,sent_at&order=sent_at.desc&limit=500`, { headers: H }),
      fetch(`${SB}/rest/v1/kirim_jadwal?client_id=eq.${clientData.id}&status=in.(terjadwal,sebagian)&select=tamu_ids,waktu_kirim`, { headers: H })
    ]);
    const logs    = resLog.ok    ? await resLog.json()    : [];
    const jadwals = resJadwal.ok ? await resJadwal.json() : [];
    const tamuDipilih = allTamu.filter(t => selectedIds.has(t.id));
    const tamuIdSudahKirim  = new Set(logs.map(l => l.tamu_id).filter(Boolean));
    const nomorSudahKirim   = new Set(logs.filter(l => !l.tamu_id).map(l => normNomor(l.nomor)));
    const sudahKirim  = tamuDipilih.filter(t => tamuIdSudahKirim.has(t.id) || (!tamuIdSudahKirim.size && nomorSudahKirim.has(normNomor(t.telpon))));
    const tamuIdSudahJadwal = new Set(jadwals.flatMap(j => j.tamu_ids || []));
    const sudahJadwal = tamuDipilih.filter(t => tamuIdSudahJadwal.has(t.id) && !sudahKirim.find(s => s.id === t.id));
    const totalSudah  = new Set([...sudahKirim, ...sudahJadwal].map(t => t.id));
    const belum       = tamuDipilih.filter(t => !totalSudah.has(t.id));
    if (!totalSudah.size) { await onLanjut(kirimSelectedIds); return; }
    const infoJadwal  = jadwals.length > 0 ? jadwals.map(j => new Date(j.waktu_kirim).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })).join(', ') : null;

    // Modal jadwal (simplified)
    const doSemua  = () => onLanjut(kirimSelectedIds);
    const doBelum  = belum.length > 0 ? () => onLanjut(belum.map(t => t.id)) : null;

    showModalKirimMassal({
      jumlahSemua: tamuDipilih.length, jumlahSudah: totalSudah.size, jumlahBelum: belum.length,
      terakhirKirim: logs[0]?.sent_at ? fmtWaktuLengkap(logs[0].sent_at) : (infoJadwal || '—'),
      onKirimSemua: doSemua, onKirimBelum: doBelum
    });
  } catch (e) { await onLanjut(kirimSelectedIds); }
}
