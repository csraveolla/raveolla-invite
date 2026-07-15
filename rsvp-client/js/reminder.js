// ============================================================
// reminder.js — Reminder RSVP, H-3/H-1, Ucapan Terima Kasih
// ============================================================
import { SB, H, KEY } from './config.js';
import { showMsg, showToast, fmtWaktuLengkap, showToastCard } from './utils.js';
import { clientData, paketFitur } from './auth.js';
import { allTamu } from './tamu.js';
import { cekKuotaWa } from './paket.js';
import { kirimViaFonnte, kirimManualLoopWithTemplate, kirimSelectedIds } from './kirim.js';

// ── Badge & Summary ───────────────────────────────────────────

export async function refreshReminderBadges() {
  try {
    const res = await fetch(
      `${SB}/rest/v1/reminder_log?client_id=eq.${clientData.id}&select=tamu_id,tipe,status&status=in.(sent,sending)`,
      { headers: H }
    );
    if (!res.ok) return;
    const rows = await res.json();
    const reminderMap = {};
    rows.forEach(r => {
      if (!reminderMap[r.tamu_id]) reminderMap[r.tamu_id] = {};
      reminderMap[r.tamu_id][r.tipe] = r.status;
    });
    // Update allTamu._reminder tanpa mereset status lain
    const { allTamu: tamu } = window._appModules.tamu;
    tamu.forEach(t => { t._reminder = reminderMap[t.id] || t._reminder || {}; });
    updateReminderSummary();
    window._appModules.tamu.filterTamu();
  } catch (e) { console.error('[refreshReminderBadges]', e); }
}

export function updateReminderSummary() {
  if (!allTamu.length) return;
  const total = allTamu.length;
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  const rsvpSudah   = allTamu.filter(t => t._reminder?.rsvp).length;
  set('rem-rsvp-sudah-kirim', rsvpSudah); set('rem-rsvp-belum-kirim', total - rsvpSudah);

  const h3Sudah = allTamu.filter(t => t._reminder?.h3).length;
  set('rem-h3-sudah', h3Sudah); set('rem-h3-belum', total - h3Sudah);

  const h1Sudah = allTamu.filter(t => t._reminder?.h1).length;
  set('rem-h1-sudah', h1Sudah); set('rem-h1-belum', total - h1Sudah);

  const ucapanSudah = allTamu.filter(t => t._reminder?.ucapan).length;
  set('rem-ucapan-sudah-kirim', ucapanSudah); set('rem-ucapan-belum-kirim', total - ucapanSudah);
}

export function updateCountHadir() {
  const { allRsvp } = window._appModules.rsvp;
  const hadir     = allRsvp ? allRsvp.filter(r => r.kehadiran === 'Hadir').length : 0;
  const checkin   = allRsvp ? allRsvp.filter(r => r.status_hadir).length : 0;
  const total     = allTamu ? allTamu.length : 0;
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('rem-hadir-count', hadir);
  set('rem-rsvp-hadir-count', hadir);
  set('rem-ucapan-hadir-count', checkin);
  set('rem-ucapan-semua-count', total);
}

export function updateCountBelumRsvp() {
  const { allRsvp } = window._appModules.rsvp;
  const belum = allTamu.filter(t => !t.sudah_rsvp).length;
  const hadir = allRsvp ? allRsvp.filter(r => r.kehadiran === 'Hadir').length : 0;
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('rem-rsvp-count', belum);
  set('rem-rsvp-hadir-count', hadir);
}

export function updateRemCount() {
  const { allRsvp } = window._appModules.rsvp;
  const belumRsvp = allTamu.filter(t => !t.sudah_rsvp && t.telpon);
  const set = (id, val) => { const el = document.getElementById(id); if (el && el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') el.textContent = val; };
  set('rem-rsvp-count', belumRsvp.length + ' tamu belum RSVP');
}

// ── Load Settings ─────────────────────────────────────────────

export function loadReminderRsvpSettings() {
  if (!clientData) return;
  if (clientData.reminder_rsvp_template)
    document.getElementById('rem-rsvp-template').value = clientData.reminder_rsvp_template;
  const jadwal = clientData.reminder_rsvp_jadwal;
  if (jadwal) {
    document.getElementById('rem-rsvp-jadwal').value = jadwal;
    const info = document.getElementById('rem-rsvp-jadwal-info');
    if (info) { info.textContent = `Terjadwal: ${new Date(jadwal).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day:'2-digit', month:'long', year:'numeric' })} jam 08.00 WIB`; info.style.color = 'var(--green)'; }
  }
  updateCountBelumRsvp();
}

export function loadReminderHadirSettings() {
  if (!clientData) return;
  let tgl = clientData.tanggal_acara;
  if (!tgl) {
    fetch(`${SB}/rest/v1/events?invitation_id=eq.${window._appModules?.invitation?.invitationId || ''}&select=event_date&order=sort_order.asc&limit=1`, { headers: H })
      .then(async r => { const rows = r.ok ? await r.json() : []; if (rows?.[0]?.event_date) { await fetch(`${SB}/rest/v1/clients?id=eq.${clientData.id}`, { method: 'PATCH', headers: { ...H, 'Prefer': 'return=minimal' }, body: JSON.stringify({ tanggal_acara: rows[0].event_date }) }); clientData.tanggal_acara = rows[0].event_date; document.getElementById('rem-hari-h-tgl').value = rows[0].event_date; } })
      .catch(() => {});
  }
  if (tgl) { document.getElementById('rem-hari-h-tgl').value = tgl; document.getElementById('rem-hari-h-tgl').dispatchEvent(new Event('change')); }
  const h3aktif = clientData.reminder_h3 || false;
  const h1aktif = clientData.reminder_h1 || false;
  document.getElementById('rem-h3-aktif').checked = h3aktif;
  document.getElementById('rem-h1-aktif').checked = h1aktif;
  document.getElementById('rem-h3-wrap').style.display = h3aktif ? 'block' : 'none';
  document.getElementById('rem-h1-wrap').style.display = h1aktif ? 'block' : 'none';
  if (clientData.reminder_template_h3) document.getElementById('rem-h3-template').value = clientData.reminder_template_h3;
  if (clientData.reminder_template_h1) document.getElementById('rem-h1-template').value = clientData.reminder_template_h1;
  const info = document.getElementById('rem-hadir-info');
  if (info && (h3aktif || h1aktif)) { info.textContent = `Aktif — server kirim otomatis jam 08.00 WIB`; info.style.color = 'var(--green)'; }
}

export function loadReminderUcapanSettings() {
  if (!clientData) return;
  if (clientData.reminder_ucapan_template)
    document.getElementById('rem-ucapan-template').value = clientData.reminder_ucapan_template;
  const jadwal = clientData.reminder_ucapan_jadwal;
  if (jadwal) {
    document.getElementById('rem-ucapan-jadwal').value = jadwal;
    const info = document.getElementById('rem-ucapan-jadwal-info');
    if (info) { info.textContent = `✓ Terjadwal: ${new Date(jadwal + 'T00:00:00').toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' })} jam 08.00 WIB`; info.style.color = 'var(--green)'; }
  }
}

// ── Kirim Reminder ────────────────────────────────────────────

export async function kirimReminderRsvpSekarang() {
  const btn      = document.getElementById('btn-rem-rsvp-sekarang');
  const msg      = document.getElementById('msg-rem-rsvp');
  const template = document.getElementById('rem-rsvp-template').value.trim();
  if (!template) { showMsg(msg, 'error', 'Isi template pesan dulu!'); return; }
  await fetch(`${SB}/rest/v1/clients?id=eq.${clientData.id}`, { method: 'PATCH', headers: { ...H, 'Prefer': 'return=minimal' }, body: JSON.stringify({ reminder_rsvp_template: template }) });
  clientData.reminder_rsvp_template = template;
  btn.disabled = true; btn.textContent = 'Mengirim...';
  showMsg(msg, 'info', 'Mengirim reminder ke tamu yang belum RSVP...');
  try {
    let data;
    try {
      const controller = new AbortController();
      const timeout    = setTimeout(() => controller.abort(), 25000);
      const res = await fetch(`${SB}/functions/v1/send-reminder-rsvp`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientData.id }), signal: controller.signal
      });
      clearTimeout(timeout);
      data = await res.json();
    } catch (fetchErr) {
      showMsg(msg, 'success', '✓ Permintaan terkirim. Cek WA tamu untuk konfirmasi.');
      return;
    }
    if (data.ok && data.ditembak > 0) {
      showMsg(msg, 'success', `✓ ${data.ditembak} reminder dikirim ke tamu yang belum RSVP.`);
      showToastCard({ tipe: 'rsvp', jumlah: data.ditembak, acara: clientData.nama_acara });
      await refreshReminderBadges();
    } else {
      showMsg(msg, 'info', data.pesan || 'Semua tamu sudah RSVP atau sudah dapat reminder.');
    }
  } catch (e) { showMsg(msg, 'error', 'Gagal mengirim: ' + e.message); }
  finally { btn.disabled = false; btn.textContent = '▶ Kirim Sekarang'; }
}

export async function kirimUcapanSekarang() {
  const btn      = document.getElementById('btn-ucapan-sekarang');
  const msg      = document.getElementById('msg-rem-ucapan');
  const template = document.getElementById('rem-ucapan-template').value.trim();
  if (!template) { showMsg(msg, 'error', 'Isi template pesan dulu!'); return; }
  await fetch(`${SB}/rest/v1/clients?id=eq.${clientData.id}`, { method: 'PATCH', headers: { ...H, 'Prefer': 'return=minimal' }, body: JSON.stringify({ reminder_ucapan_template: template }) }).catch(() => null);
  clientData.reminder_ucapan_template = template;
  btn.disabled = true; btn.textContent = 'Mengirim...';
  showMsg(msg, 'info', 'Mengirim ucapan terima kasih...');
  try {
    let data;
    try {
      const controller = new AbortController();
      const timeout    = setTimeout(() => controller.abort(), 25000);
      const res = await fetch(`${SB}/functions/v1/send-reminder-ucapan`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientData.id }), signal: controller.signal
      });
      clearTimeout(timeout);
      data = await res.json();
    } catch (fetchErr) { showMsg(msg, 'success', '✓ Permintaan terkirim. Cek WA tamu untuk konfirmasi.'); return; }
    if (data.ok && data.ditembak > 0) {
      showMsg(msg, 'success', `✓ ${data.ditembak} ucapan terima kasih terkirim.`);
      showToastCard({ tipe: 'ucapan', jumlah: data.ditembak, acara: clientData.nama_acara });
      await refreshReminderBadges();
    } else { showMsg(msg, 'info', data.pesan || 'Semua tamu sudah mendapat ucapan.'); }
  } catch (e) { showMsg(msg, 'error', 'Gagal mengirim: ' + e.message); }
  finally { btn.disabled = false; btn.textContent = '▶ Kirim Sekarang'; }
}

// ── Jadwal Reminder ───────────────────────────────────────────

export async function simpanJadwalRsvp() {
  const msg      = document.getElementById('msg-rem-rsvp');
  const jadwal   = document.getElementById('rem-rsvp-jadwal').value;
  const template = document.getElementById('rem-rsvp-template').value.trim();
  if (!jadwal)   { showMsg(msg, 'error', 'Pilih tanggal jadwal dulu!'); return; }
  if (!template) { showMsg(msg, 'error', 'Isi template pesan dulu!'); return; }
  try {
    await fetch(`${SB}/rest/v1/clients?id=eq.${clientData.id}`, { method: 'PATCH', headers: { ...H, 'Prefer': 'return=minimal' }, body: JSON.stringify({ reminder_rsvp_aktif: true, reminder_rsvp_jadwal: jadwal, reminder_rsvp_template: template }) });
    clientData.reminder_rsvp_aktif = true; clientData.reminder_rsvp_jadwal = jadwal; clientData.reminder_rsvp_template = template;
    const info = document.getElementById('rem-rsvp-jadwal-info');
    if (info) { info.textContent = `✓ Terjadwal: ${new Date(jadwal).toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' })} jam 08.00 WIB`; info.style.color = 'var(--green)'; }
    showMsg(msg, 'success', '✓ Jadwal reminder RSVP tersimpan.');
  } catch (e) { showMsg(msg, 'error', 'Gagal menyimpan jadwal: ' + e.message); }
}

export async function hapusJadwalRsvp() {
  const msg = document.getElementById('msg-rem-rsvp');
  try {
    await fetch(`${SB}/rest/v1/clients?id=eq.${clientData.id}`, { method: 'PATCH', headers: { ...H, 'Prefer': 'return=minimal' }, body: JSON.stringify({ reminder_rsvp_aktif: false, reminder_rsvp_jadwal: null }) });
    clientData.reminder_rsvp_aktif = false; clientData.reminder_rsvp_jadwal = null;
    document.getElementById('rem-rsvp-jadwal').value = '';
    const info = document.getElementById('rem-rsvp-jadwal-info');
    if (info) { info.textContent = 'Jadwal dihapus.'; info.style.color = 'var(--muted)'; }
    showMsg(msg, 'info', 'Jadwal reminder RSVP dihapus.');
  } catch (e) { showMsg(msg, 'error', 'Gagal hapus jadwal.'); }
}

export async function simpanReminderHadir() {
  const btn    = document.querySelector('[onclick*="simpanReminderHadir"]');
  const msg    = document.getElementById('msg-rem-hadir');
  const info   = document.getElementById('rem-hadir-info');
  const tgl    = document.getElementById('rem-hari-h-tgl').value;
  const h3aktif = document.getElementById('rem-h3-aktif').checked;
  const h1aktif = document.getElementById('rem-h1-aktif').checked;
  const h3tmpl  = document.getElementById('rem-h3-template').value.trim();
  const h1tmpl  = document.getElementById('rem-h1-template').value.trim();
  if (!tgl) { showMsg(msg, 'error', 'Tanggal acara wajib diisi!'); return; }
  if (btn) { btn.disabled = true; btn.textContent = 'Menyimpan...'; }
  try {
    const res = await fetch(`${SB}/rest/v1/clients?id=eq.${clientData.id}`, { method: 'PATCH', headers: { ...H, 'Prefer': 'return=minimal' }, body: JSON.stringify({ tanggal_acara: tgl, reminder_h3: h3aktif, reminder_h1: h1aktif, reminder_template_h3: h3tmpl || null, reminder_template_h1: h1tmpl || null }) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    Object.assign(clientData, { tanggal_acara: tgl, reminder_h3: h3aktif, reminder_h1: h1aktif, reminder_template_h3: h3tmpl || null, reminder_template_h1: h1tmpl || null });
    const invId = window._appModules?.invitation?.invitationId;
    if (invId) { const evRes = await fetch(`${SB}/rest/v1/events?invitation_id=eq.${invId}&select=id&order=sort_order.asc&limit=1`, { headers: H }); const evRows = evRes.ok ? await evRes.json() : []; if (evRows?.[0]?.id) await fetch(`${SB}/rest/v1/events?id=eq.${evRows[0].id}`, { method: 'PATCH', headers: { ...H, 'Prefer': 'return=minimal' }, body: JSON.stringify({ event_date: tgl }) }); }
    showMsg(msg, 'success', '✓ Setting reminder tersimpan.');
    if (info) { info.textContent = h3aktif || h1aktif ? 'Aktif — server kirim otomatis jam 08.00 WIB' : 'Nonaktif'; info.style.color = (h3aktif || h1aktif) ? 'var(--green)' : 'var(--muted)'; }
  } catch (e) { showMsg(msg, 'error', 'Gagal menyimpan: ' + e.message); }
  finally { if (btn) { btn.disabled = false; btn.textContent = '💾 Simpan Setting Reminder'; } }
}

export async function simpanJadwalUcapan() {
  const msg      = document.getElementById('msg-rem-ucapan');
  const jadwal   = document.getElementById('rem-ucapan-jadwal').value;
  const template = document.getElementById('rem-ucapan-template').value.trim();
  if (!jadwal)   { showMsg(msg, 'error', 'Pilih tanggal jadwal dulu!'); return; }
  if (!template) { showMsg(msg, 'error', 'Isi template pesan dulu!'); return; }
  try {
    await fetch(`${SB}/rest/v1/clients?id=eq.${clientData.id}`, { method: 'PATCH', headers: { ...H, 'Prefer': 'return=minimal' }, body: JSON.stringify({ reminder_ucapan_aktif: true, reminder_ucapan_jadwal: jadwal, reminder_ucapan_template: template }) });
    clientData.reminder_ucapan_aktif = true; clientData.reminder_ucapan_jadwal = jadwal; clientData.reminder_ucapan_template = template;
    const info = document.getElementById('rem-ucapan-jadwal-info');
    if (info) { info.textContent = `✓ Terjadwal: ${new Date(jadwal + 'T00:00:00').toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' })} jam 08.00 WIB`; info.style.color = 'var(--green)'; }
    showMsg(msg, 'success', '✓ Jadwal ucapan tersimpan.');
  } catch (e) { showMsg(msg, 'error', 'Gagal menyimpan: ' + e.message); }
}

export async function hapusJadwalUcapan() {
  const msg = document.getElementById('msg-rem-ucapan');
  try {
    await fetch(`${SB}/rest/v1/clients?id=eq.${clientData.id}`, { method: 'PATCH', headers: { ...H, 'Prefer': 'return=minimal' }, body: JSON.stringify({ reminder_ucapan_aktif: false, reminder_ucapan_jadwal: null }) });
    clientData.reminder_ucapan_aktif = false; clientData.reminder_ucapan_jadwal = null;
    document.getElementById('rem-ucapan-jadwal').value = '';
    const info = document.getElementById('rem-ucapan-jadwal-info');
    if (info) { info.textContent = 'Jadwal dihapus.'; info.style.color = 'var(--muted)'; }
    showMsg(msg, 'info', 'Jadwal ucapan dihapus.');
  } catch (e) { showMsg(msg, 'error', 'Gagal hapus jadwal.'); }
}

export function toggleReminderTemplate(tipe) {
  const aktif = document.getElementById(`rem-h${tipe === 'h3' ? '3' : '1'}-aktif`).checked;
  const wrap  = document.getElementById(`rem-h${tipe === 'h3' ? '3' : '1'}-wrap`);
  if (wrap) wrap.style.display = aktif ? 'block' : 'none';
}
