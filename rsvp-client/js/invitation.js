// ============================================================
// invitation.js — Tab "Data Undangan"
// Client bisa edit: mempelai, quote, hashtag, acara, galeri,
//                    kado (bank_accounts), love story
// Client TIDAK BISA edit: slug, theme_id, package_id,
//                    expired_at, is_published
// (field-field itu memang tidak dimunculkan di form ini sama sekali)
// ============================================================
import { showMsg, showToast } from './utils.js';
import { DOMAIN } from './config.js';
import { clientData } from './auth.js';
import { initSupabaseClient, supabaseClient } from './realtime.js';

const MEMPELAI_FIELDS = [
  'bride_name', 'bride_nickname', 'bride_father', 'bride_mother',
  'bride_instagram', 'bride_photo_url',
  'groom_name', 'groom_nickname', 'groom_father', 'groom_mother',
  'groom_instagram', 'groom_photo_url',
  'quote', 'hashtag', 'music_url'
];

export let invitationId = null;   // id invitations (bigint) milik client ini
export const state = {
  events:       [],
  bankAccounts: [],
  loveStories:  []
};
export const galleryState = []; // [{ url, caption, is_cover, sort_order }]

let loaded = false;

// ── Sub-Tab Switching (khusus tab Data Undangan) ────────────────

export function switchInvSubTab(name) {
  document.querySelectorAll('#undangan-subtabs .sub-tab').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('#tab-undangan .sub-tab-content').forEach(el => el.classList.remove('active'));
  event.currentTarget.classList.add('active');
  document.getElementById(`inv-sub-${name}`).classList.add('active');
}

// ── Load ──────────────────────────────────────────────────────

export async function loadInvitationTab() {
  if (loaded) return; // hanya load sekali per sesi, hemat request
  initSupabaseClient();

  const loadingEl  = document.getElementById('inv-loading');
  const notfoundEl = document.getElementById('inv-notfound');
  const wrapEl     = document.getElementById('inv-wrap');

  loadingEl.style.display  = 'block';
  notfoundEl.style.display = 'none';
  wrapEl.style.display     = 'none';

  try {
    const { data, error } = await supabaseClient
      .from('invitations')
      .select([...MEMPELAI_FIELDS, 'id', 'slug', 'expired_at', 'is_published', 'themes(name)'].join(','))
      .eq('client_id', clientData.id)
      .single();

    if (error || !data) {
      loadingEl.style.display  = 'none';
      notfoundEl.style.display = 'block';
      return;
    }

    invitationId = data.id;
    fillMempelaiForm(data);
    fillStatusSidebar(data);
    initCopyButtons();

    const [eventsRes, bankRes, loveRes, galleryRes] = await Promise.all([
      supabaseClient.from('events')
        .select('event_name, event_date, start_time, end_time, location_name, address, maps_url')
        .eq('invitation_id', invitationId).order('sort_order'),
      supabaseClient.from('bank_accounts')
        .select('type, bank_name, account_number, account_name')
        .eq('invitation_id', invitationId).order('sort_order'),
      supabaseClient.from('love_stories')
        .select('event_date, title, description')
        .eq('invitation_id', invitationId).order('sort_order'),
      supabaseClient.from('galleries')
        .select('file_url, caption, is_cover, sort_order')
        .eq('invitation_id', invitationId).order('sort_order')
    ]);

    state.events       = eventsRes.data || [];
    state.bankAccounts = bankRes.data   || [];
    state.loveStories  = loveRes.data   || [];
    galleryState.length = 0;
    (galleryRes.data || []).forEach(g => galleryState.push({
      url: g.file_url, caption: g.caption, is_cover: g.is_cover, sort_order: g.sort_order
    }));

    renderEvents();
    renderBankAccounts();
    renderLoveStories();
    renderGallery();

    const musicInput = document.getElementById('music_url');
    if (musicInput) {
      musicInput.addEventListener('input', updateMusicPreview);
      if (musicInput.value) updateMusicPreview();
    }

    loaded = true;
    loadingEl.style.display = 'none';
    wrapEl.style.display    = 'block';
  } catch (e) {
    loadingEl.style.display  = 'none';
    notfoundEl.style.display = 'block';
    notfoundEl.textContent   = 'Gagal memuat data undangan: ' + e.message;
  }
}

function fillMempelaiForm(inv) {
  MEMPELAI_FIELDS.forEach(field => {
    const el = document.getElementById(field);
    if (el) el.value = inv[field] ?? '';
  });
  const tglEl = document.getElementById('tanggal_acara');
  if (tglEl) tglEl.value = clientData.tanggal_acara || '';
  setPhotoPreview('bride', inv.bride_photo_url);
  setPhotoPreview('groom', inv.groom_photo_url);
}

function fillStatusSidebar(inv) {
  const namaEl  = document.getElementById('inv-info-nama');
  const linkEl  = document.getElementById('inv-info-link');
  const paketEl = document.getElementById('inv-info-paket');
  const pubEl   = document.getElementById('inv-info-published');
  const expEl   = document.getElementById('inv-info-expired');
  const temaEl  = document.getElementById('inv-info-tema');
  const tokenEl = document.getElementById('inv-info-token');
  const pinEl   = document.getElementById('inv-info-pin');

  if (namaEl) namaEl.textContent = clientData.nama_acara || '—';

  const tglAcaraEl = document.getElementById('inv-info-tanggal-acara');
  if (tglAcaraEl) {
    if (clientData.tanggal_acara) {
      const d = new Date(clientData.tanggal_acara + 'T00:00:00');
      tglAcaraEl.textContent = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    } else {
      tglAcaraEl.textContent = '—';
    }
  }

  const url = clientData.base_url || (inv.slug ? `${DOMAIN}/${inv.slug}` : '');
  if (linkEl) {
    if (url) { linkEl.href = url; linkEl.textContent = url.replace(/^https?:\/\//, ''); }
    else { linkEl.textContent = '—'; linkEl.removeAttribute('href'); }
  }

  if (paketEl) {
    const paketLabel = { lite: 'Lite', pro: 'Pro', premium: 'Premium' }[clientData.paket] || clientData.paket || '—';
    paketEl.textContent = paketLabel;
    paketEl.className = 'paket-badge ' + (clientData.paket || 'lite');
  }

  if (pubEl) {
    pubEl.innerHTML = inv.is_published
      ? '<span class="badge b-green">✓ Published</span>'
      : '<span class="badge b-grey">Draft</span>';
  }

  if (expEl) {
    if (inv.expired_at) {
      const d = new Date(inv.expired_at);
      const isExpired = d < new Date();
      const tgl = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
      expEl.innerHTML = isExpired
        ? `${tgl} <span class="badge b-red" style="margin-left:4px">Kadaluarsa</span>`
        : `${tgl} <span class="badge b-green" style="margin-left:4px">Aktif</span>`;
    } else {
      expEl.textContent = 'Tidak ada batas';
    }
  }

  if (temaEl)  temaEl.textContent  = inv.themes?.name || '—';
  if (tokenEl) tokenEl.textContent = clientData.token || '—';
  if (pinEl)   pinEl.textContent   = clientData.scanner_pin  || '—';
}

function initCopyButtons() {
  document.querySelectorAll('.inv-copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-copy');
      const el = document.getElementById(targetId);
      if (!el || !el.textContent || el.textContent === '—') return;
      navigator.clipboard.writeText(el.textContent.trim()).then(() => {
        btn.classList.add('copied');
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
        setTimeout(() => {
          btn.classList.remove('copied');
          btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
        }, 1500);
      });
    });
  });
}

// ── Save: Mempelai (bride/groom fields + quote/hashtag) ─────────
// Ini satu-satunya UPDATE ke tabel invitations dari sisi client.
// Kolom yang dikirim SELALU dibatasi ke MEMPELAI_FIELDS —
// tidak pernah menyentuh slug/theme_id/package_id/expired_at/dll.

export async function saveInvitationMain() {
  const btn = document.getElementById('btn-save-mempelai');
  const msg = document.getElementById('msg-inv-mempelai');
  if (!invitationId) { showMsg(msg, 'error', 'Data undangan belum dimuat.'); return; }

  const tglEl = document.getElementById('tanggal_acara');
  const tglVal = tglEl ? tglEl.value : '';
  if (!tglVal) { showMsg(msg, 'error', 'Tanggal Pernikahan wajib diisi!'); return; }

  const payload = {};
  MEMPELAI_FIELDS.forEach(field => {
    const el = document.getElementById(field);
    if (el) payload[field] = el.value || null;
  });

  btn.disabled = true; btn.textContent = 'Menyimpan...';
  try {
    const { error } = await supabaseClient
      .from('invitations')
      .update(payload)
      .eq('id', invitationId);
    if (error) throw new Error(error.message);

    await supabaseClient
      .from('clients')
      .update({ tanggal_acara: tglVal })
      .eq('id', clientData.id);
    clientData.tanggal_acara = tglVal;

    const { data: evRows } = await supabaseClient
      .from('events')
      .select('id')
      .eq('invitation_id', invitationId)
      .order('sort_order')
      .limit(1);
    if (evRows?.[0]?.id) {
      await supabaseClient
        .from('events')
        .update({ event_date: tglVal })
        .eq('id', evRows[0].id);
    }

    showMsg(msg, 'success', '✓ Data mempelai tersimpan.');
    showToast('✓ Data mempelai diperbarui');
  } catch (e) {
    showMsg(msg, 'error', 'Gagal menyimpan: ' + e.message);
  } finally {
    btn.disabled = false; btn.textContent = '💾 Simpan Data Mempelai';
  }
}

// ── Foto Profil Mempelai ──────────────────────────────────────

export function setPhotoPreview(person, url) {
  const preview = document.getElementById(person + '_photo_preview');
  const lbl     = document.getElementById(person + '_photo_label');
  const hidden  = document.getElementById(person + '_photo_url');
  if (!preview) return;
  if (url) {
    preview.style.backgroundImage    = `url('${url}')`;
    preview.style.backgroundSize     = 'cover';
    preview.style.backgroundPosition = 'center';
    preview.textContent = '';
    if (lbl)    lbl.textContent = 'Ganti Foto';
    if (hidden) hidden.value    = url;
  } else {
    preview.style.backgroundImage = '';
    preview.textContent = person === 'bride' ? 'A' : 'B';
    if (lbl)    lbl.textContent = 'Pilih Foto';
    if (hidden) hidden.value    = '';
  }
}

export async function uploadProfilePhoto(person, file) {
  if (!file || !invitationId) return;
  const lbl = document.getElementById(person + '_photo_label');
  if (lbl) lbl.textContent = 'Mengupload...';

  const ext  = file.name.split('.').pop();
  const path = `${invitationId}/${person}-${Date.now()}.${ext}`;

  const { error } = await supabaseClient.storage
    .from('profile-photos')
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) {
    showToast('Upload gagal: ' + error.message);
    if (lbl) lbl.textContent = 'Ganti Foto';
    return;
  }

  const { data: urlData } = supabaseClient.storage.from('profile-photos').getPublicUrl(path);
  const publicUrl = urlData.publicUrl;
  setPhotoPreview(person, publicUrl);

  const { error: updateErr } = await supabaseClient
    .from('invitations')
    .update({ [person + '_photo_url']: publicUrl })
    .eq('id', invitationId);

  if (updateErr) showToast('Gagal simpan foto ke database: ' + updateErr.message);
  else showToast(`✓ Foto ${person === 'bride' ? 'mempelai wanita' : 'mempelai pria'} diperbarui`);
}

// ── ACARA (events) ────────────────────────────────────────────

export function renderEvents() {
  const wrap = document.getElementById('inv-events-repeater');
  if (!wrap) return;
  if (!state.events.length) {
    wrap.innerHTML = '<div class="state-box">Belum ada acara. Klik "Tambah Acara" di bawah.</div>';
    return;
  }
  wrap.innerHTML = state.events.map((ev, i) => `
    <div class="inv-repeater-item">
      <div class="inv-repeater-head">
        <div class="inv-repeater-title">${ev.event_name || 'Acara Baru'}</div>
        <button class="inv-repeater-del" onclick="window._app.removeEvent(${i})">✕</button>
      </div>
      <div class="inv-repeater-body">
        <div class="fg"><label>Nama Acara</label>
          <input class="inv-input" value="${escAttr(ev.event_name)}"
            oninput="window._app.state.events[${i}].event_name=this.value;
              document.querySelectorAll('#inv-events-repeater .inv-repeater-title')[${i}].textContent=this.value||'Acara Baru'">
        </div>
        <div class="fg"><label>Tanggal</label>
          <input class="inv-input" type="date" value="${ev.event_date || ''}"
            oninput="window._app.state.events[${i}].event_date=this.value">
        </div>
        <div class="fg"><label>Jam Mulai (24 jam)</label>
          <div class="inv-time-pair">
            ${renderTimeSelect(i, 'start_time', 'h', ev.start_time)}
            <span class="inv-time-sep">:</span>
            ${renderTimeSelect(i, 'start_time', 'm', ev.start_time)}
          </div>
        </div>
        <div class="fg"><label>Jam Selesai (24 jam)</label>
          <div class="inv-time-pair">
            ${renderTimeSelect(i, 'end_time', 'h', ev.end_time)}
            <span class="inv-time-sep">:</span>
            ${renderTimeSelect(i, 'end_time', 'm', ev.end_time)}
          </div>
        </div>
        <div class="fg span2"><label>Nama Venue</label>
          <input class="inv-input" value="${escAttr(ev.location_name)}"
            oninput="window._app.state.events[${i}].location_name=this.value">
        </div>
        <div class="fg span2"><label>Alamat</label>
          <input class="inv-input" value="${escAttr(ev.address)}"
            oninput="window._app.state.events[${i}].address=this.value">
        </div>
        <div class="fg span2"><label>Link Google Maps</label>
          <input class="inv-input" value="${escAttr(ev.maps_url)}"
            oninput="window._app.state.events[${i}].maps_url=this.value">
        </div>
      </div>
    </div>
  `).join('');
}

export function addEvent() {
  state.events.push({ event_name: '', event_date: '', start_time: '', end_time: '', location_name: '', address: '', maps_url: '' });
  renderEvents();
}

function renderTimeSelect(i, field, part, currentVal) {
  // currentVal format dari DB: "HH:MM" atau "HH:MM:SS" atau kosong
  const [hh, mm] = (currentVal || '').split(':');
  const cur = part === 'h' ? hh : mm;
  const max = part === 'h' ? 24 : 60;
  let opts = `<option value="">--</option>`;
  for (let n = 0; n < max; n++) {
    const v = String(n).padStart(2, '0');
    opts += `<option value="${v}" ${cur === v ? 'selected' : ''}>${v}</option>`;
  }
  return `<select class="inv-input inv-time-select" onchange="window._app.updateEventTime(${i},'${field}','${part}',this.value)">${opts}</select>`;
}

export function updateEventTime(i, field, part, value) {
  const cur = state.events[i];
  const [curH, curM] = (cur[field] || '').split(':');
  const h = part === 'h' ? value : (curH || '00');
  const m = part === 'm' ? value : (curM || '00');
  cur[field] = (h && m) ? `${h}:${m}` : null;
}

export function removeEvent(i) {
  state.events.splice(i, 1);
  renderEvents();
}

export async function saveEvents() {
  const msg = document.getElementById('msg-inv-acara');
  if (!invitationId) { showMsg(msg, 'error', 'Data undangan belum dimuat.'); return; }
  try {
    await supabaseClient.from('events').delete().eq('invitation_id', invitationId);
    if (state.events.length) {
      const { error } = await supabaseClient.from('events').insert(
        state.events.map((e, i) => ({ ...e, invitation_id: invitationId, sort_order: i }))
      );
      if (error) throw new Error(error.message);
    }
    showMsg(msg, 'success', '✓ Jadwal acara tersimpan.');
    showToast('✓ Acara diperbarui');
  } catch (e) {
    showMsg(msg, 'error', 'Gagal menyimpan: ' + e.message);
  }
}

// ── KADO (bank_accounts) ──────────────────────────────────────

export function renderBankAccounts() {
  const wrap = document.getElementById('inv-bank-repeater');
  if (!wrap) return;
  if (!state.bankAccounts.length) {
    wrap.innerHTML = '<div class="state-box">Belum ada rekening. Klik "Tambah Rekening" di bawah.</div>';
    return;
  }
  wrap.innerHTML = state.bankAccounts.map((b, i) => {
    const isQris = b.type === 'qris';
    // Catatan: untuk tipe QRIS, kolom account_number dipakai menyimpan URL gambar QRIS
    // (tidak perlu migrasi kolom baru — account_number tidak dipakai untuk teks di mode ini)
    const qrisUrl = isQris ? (b.account_number || '') : '';
    return `
    <div class="inv-repeater-item">
      <div class="inv-repeater-head">
        <div class="inv-repeater-title">${b.bank_name || (isQris ? 'QRIS Baru' : 'Rekening Baru')}</div>
        <button class="inv-repeater-del" onclick="window._app.removeBankAccount(${i})">✕</button>
      </div>
      <div class="inv-repeater-body">
        <div class="fg"><label>Tipe</label>
          <select class="inv-input" onchange="window._app.state.bankAccounts[${i}].type=this.value;window._app.renderBankAccounts()">
            <option value="bank"    ${b.type === 'bank'    ? 'selected' : ''}>Bank</option>
            <option value="qris"    ${b.type === 'qris'    ? 'selected' : ''}>QRIS</option>
            <option value="ewallet" ${b.type === 'ewallet' ? 'selected' : ''}>E-Wallet</option>
          </select>
        </div>
        <div class="fg"><label>${isQris ? 'Label (opsional)' : 'Nama Bank'}</label>
          <input class="inv-input" value="${escAttr(b.bank_name)}" placeholder="${isQris ? 'misal: QRIS BCA' : ''}"
            oninput="window._app.state.bankAccounts[${i}].bank_name=this.value;
              document.querySelectorAll('#inv-bank-repeater .inv-repeater-title')[${i}].textContent=this.value||'${isQris ? 'QRIS Baru' : 'Rekening Baru'}'">
        </div>
        ${isQris ? `
        <div class="fg span2">
          <label>Gambar QRIS</label>
          <div class="inv-qris-upload" onclick="document.getElementById('inv-qris-input-${i}').click()">
            ${qrisUrl
              ? `<img src="${qrisUrl}" class="inv-qris-preview">`
              : `<div class="inv-qris-placeholder">Klik untuk upload gambar QRIS</div>`}
          </div>
          <input type="file" id="inv-qris-input-${i}" accept="image/jpeg,image/png,image/webp" style="display:none"
            onchange="window._app.uploadQrisImage(${i}, this.files[0])">
        </div>` : `
        <div class="fg"><label>Nomor Rekening</label>
          <input class="inv-input" value="${escAttr(b.account_number)}"
            oninput="window._app.state.bankAccounts[${i}].account_number=this.value">
        </div>
        <div class="fg"><label>Atas Nama</label>
          <input class="inv-input" value="${escAttr(b.account_name)}"
            oninput="window._app.state.bankAccounts[${i}].account_name=this.value">
        </div>`}
      </div>
    </div>
  `;
  }).join('');
}

export async function uploadQrisImage(i, file) {
  if (!file || !invitationId) return;
  const msg = document.getElementById('msg-inv-kado');
  try {
    const ext  = file.name.split('.').pop();
    const path = `qris/${invitationId}/${Date.now()}.${ext}`;
    const { error } = await supabaseClient.storage
      .from('gallery-photos')
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw new Error(error.message);
    const { data: urlData } = supabaseClient.storage.from('gallery-photos').getPublicUrl(path);
    state.bankAccounts[i].account_number = urlData.publicUrl;
    state.bankAccounts[i].account_name   = ''; // tidak dipakai untuk QRIS
    renderBankAccounts();
    showToast('✓ Gambar QRIS diupload — klik "Simpan Kado" untuk menyimpan');
  } catch (e) {
    showMsg(msg, 'error', 'Gagal upload QRIS: ' + e.message);
  }
}

export function addBankAccount() {
  state.bankAccounts.push({ type: 'bank', bank_name: '', account_number: '', account_name: '' });
  renderBankAccounts();
}

export function removeBankAccount(i) {
  state.bankAccounts.splice(i, 1);
  renderBankAccounts();
}

export async function saveBankAccounts() {
  const msg = document.getElementById('msg-inv-kado');
  if (!invitationId) { showMsg(msg, 'error', 'Data undangan belum dimuat.'); return; }
  try {
    await supabaseClient.from('bank_accounts').delete().eq('invitation_id', invitationId);
    if (state.bankAccounts.length) {
      const { error } = await supabaseClient.from('bank_accounts').insert(
        state.bankAccounts.map((b, i) => ({ ...b, invitation_id: invitationId, sort_order: i }))
      );
      if (error) throw new Error(error.message);
    }
    showMsg(msg, 'success', '✓ Info kado tersimpan.');
    showToast('✓ Kado diperbarui');
  } catch (e) {
    showMsg(msg, 'error', 'Gagal menyimpan: ' + e.message);
  }
}

// ── LOVE STORY ────────────────────────────────────────────────

export function renderLoveStories() {
  const wrap = document.getElementById('inv-lovestory-repeater');
  if (!wrap) return;
  if (!state.loveStories.length) {
    wrap.innerHTML = '<div class="state-box">Belum ada momen. Klik "Tambah Momen" di bawah.</div>';
    return;
  }
  wrap.innerHTML = state.loveStories.map((s, i) => {
    // Inisialisasi _month/_year sekali dari event_date (kalau belum ada)
    if (s._month === undefined || s._year === undefined) {
      const [y, m] = (s.event_date || '').split('-');
      s._year  = y || '';
      s._month = m || '';
    }
    const bulanOpts = ['01','02','03','04','05','06','07','08','09','10','11','12']
      .map((m, idx) => `<option value="${m}" ${s._month === m ? 'selected' : ''}>${MONTH_NAMES[idx]}</option>`).join('');
    return `
    <div class="inv-repeater-item">
      <div class="inv-repeater-head">
        <div class="inv-repeater-title">${s.title || 'Momen Baru'}</div>
        <button class="inv-repeater-del" onclick="window._app.removeLoveStory(${i})">✕</button>
      </div>
      <div class="inv-repeater-body">
        <div class="fg"><label>Bulan</label>
          <select class="inv-input" onchange="window._app.updateLoveStoryDate(${i}, this.value, null)">
            <option value="">— Pilih Bulan —</option>
            ${bulanOpts}
          </select>
        </div>
        <div class="fg"><label>Tahun</label>
          <input class="inv-input" type="number" min="1900" max="2100" placeholder="2026" value="${s._year || ''}"
            oninput="window._app.updateLoveStoryDate(${i}, null, this.value)">
        </div>
        <div class="fg span2"><label>Judul Momen</label>
          <input class="inv-input" value="${escAttr(s.title)}"
            oninput="window._app.state.loveStories[${i}].title=this.value;
              document.querySelectorAll('#inv-lovestory-repeater .inv-repeater-title')[${i}].textContent=this.value||'Momen Baru'">
        </div>
        <div class="fg span2"><label>Deskripsi</label>
          <textarea class="inv-input" rows="3"
            oninput="window._app.state.loveStories[${i}].description=this.value">${escHtml(s.description)}</textarea>
        </div>
      </div>
    </div>
  `;
  }).join('');
}

const MONTH_NAMES = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

export function updateLoveStoryDate(i, bulan, tahun) {
  const cur = state.loveStories[i];
  if (bulan !== null) cur._month = bulan;
  if (tahun !== null) cur._year  = tahun;
  // event_date final hanya dihitung ulang di saat Simpan (saveLoveStories),
  // supaya state Bulan/Tahun tidak pernah hilang meski salah satu masih kosong.
}

export function addLoveStory() {
  state.loveStories.push({ event_date: '', title: '', description: '' });
  renderLoveStories();
}

export function removeLoveStory(i) {
  state.loveStories.splice(i, 1);
  renderLoveStories();
}

export async function saveLoveStories() {
  const msg = document.getElementById('msg-inv-lovestory');
  if (!invitationId) { showMsg(msg, 'error', 'Data undangan belum dimuat.'); return; }
  try {
    const payload = state.loveStories.map((s, i) => ({
      invitation_id: invitationId,
      event_date:    (s._year && s._month) ? `${String(s._year).padStart(4, '0')}-${s._month}-01` : null,
      title:         s.title || '',
      description:   s.description || '',
      sort_order:    i
    }));
    await supabaseClient.from('love_stories').delete().eq('invitation_id', invitationId);
    if (payload.length) {
      const { error } = await supabaseClient.from('love_stories').insert(payload);
      if (error) throw new Error(error.message);
    }
    showMsg(msg, 'success', '✓ Love story tersimpan.');
    showToast('✓ Love story diperbarui');
  } catch (e) {
    showMsg(msg, 'error', 'Gagal menyimpan: ' + e.message);
  }
}

// ── GALERI ────────────────────────────────────────────────────

export function renderGallery() {
  const wrap     = document.getElementById('inv-gallery-grid');
  const countLbl = document.getElementById('inv-gallery-count');
  const hint     = document.getElementById('inv-gallery-hint');
  if (!wrap) return;

  if (countLbl) countLbl.textContent = `${galleryState.length} foto · maks 30`;
  if (hint) hint.style.display = galleryState.length ? 'none' : 'block';

  wrap.innerHTML = galleryState.map((g, i) => `
    <div class="inv-gallery-item">
      <img src="${g.url}" loading="lazy">
      <div class="inv-gallery-overlay">
        <button class="inv-gallery-btn-cover ${g.is_cover ? 'is-cover' : ''}" onclick="event.stopPropagation();window._app.setCoverPhoto(${i})">
          ${g.is_cover ? '★ Cover' : '☆ Cover'}
        </button>
        <button class="inv-gallery-btn-del" onclick="event.stopPropagation();window._app.removeGalleryPhoto(${i})">✕</button>
      </div>
      ${g.is_cover ? '<div class="inv-gallery-cover-badge">COVER</div>' : ''}
    </div>
  `).join('');
}

export function setCoverPhoto(i) {
  galleryState.forEach((g, idx) => g.is_cover = (idx === i));
  renderGallery();
  saveGallery();
}

export async function removeGalleryPhoto(i) {
  if (!confirm('Hapus foto ini?')) return;
  galleryState.splice(i, 1);
  renderGallery();
  await saveGallery();
}

export async function uploadGalleryPhotos(files) {
  const msg = document.getElementById('msg-inv-galeri');
  if (!invitationId) { showMsg(msg, 'error', 'Data undangan belum dimuat.'); return; }
  if (!files || !files.length) return;

  const maxPhotos = 30;
  if (galleryState.length + files.length > maxPhotos) {
    showMsg(msg, 'error', `Maksimal ${maxPhotos} foto. Sudah ada ${galleryState.length} foto.`);
    return;
  }

  for (const file of files) {
    const ext  = file.name.split('.').pop();
    const path = `${invitationId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabaseClient.storage
      .from('gallery-photos')
      .upload(path, file, { upsert: false, contentType: file.type });
    if (error) { console.error('Gagal upload:', file.name, error.message); continue; }
    const { data: urlData } = supabaseClient.storage.from('gallery-photos').getPublicUrl(path);
    galleryState.push({
      url: urlData.publicUrl, caption: '',
      is_cover: galleryState.length === 0,
      sort_order: galleryState.length
    });
  }

  renderGallery();
  await saveGallery();
  showToast('✓ Foto galeri diupload');
}

export async function saveGallery() {
  if (!invitationId) return;
  try {
    await supabaseClient.from('galleries').delete().eq('invitation_id', invitationId);
    if (galleryState.length) {
      await supabaseClient.from('galleries').insert(
        galleryState.map((g, i) => ({
          invitation_id: invitationId,
          file_url:      g.url,
          caption:       g.caption || '',
          is_cover:      g.is_cover,
          sort_order:    i
        }))
      );
    }
  } catch (e) {
    console.error('[saveGallery] gagal:', e.message);
  }
}

// ── Save Music URL ──────────────────────────────────────────────

function isYouTubeUrl(url) {
  return /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)/.test(url);
}

function extractYouTubeId(url) {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&?#]+)/);
  return m ? m[1] : null;
}

function updateMusicPreview() {
  const input = document.getElementById('music_url');
  const wrap  = document.getElementById('music-preview-wrap');
  const container = document.getElementById('music-preview-container');
  const url = input ? input.value.trim() : '';
  if (!url) { wrap.style.display = 'none'; container.innerHTML = ''; return; }
  wrap.style.display = 'block';
  if (isYouTubeUrl(url)) {
    const vid = extractYouTubeId(url);
    container.innerHTML = vid
      ? `<iframe width="100%" height="160" src="https://www.youtube.com/embed/${vid}?enablejsapi=1" frameborder="0" allow="autoplay; encrypted-media" style="border-radius:8px"></iframe>`
      : '<div style="color:var(--danger);font-size:12px">YouTube URL tidak valid</div>';
  } else {
    container.innerHTML = `<audio controls style="width:100%;height:40px;border-radius:8px"><source src="${escAttr(url)}" type="audio/mpeg"></audio>`;
  }
}

export async function saveMusicUrl() {
  const msg = document.getElementById('msg-inv-music');
  if (!invitationId) { showMsg(msg, 'error', 'Data undangan belum dimuat.'); return; }
  const url = document.getElementById('music_url').value.trim();
  try {
    const { error } = await supabaseClient
      .from('invitations')
      .update({ music_url: url || null })
      .eq('id', invitationId);
    if (error) throw new Error(error.message);
    showMsg(msg, 'success', '✓ Music tersimpan.');
    showToast('✓ Music diperbarui');
  } catch (e) {
    showMsg(msg, 'error', 'Gagal menyimpan: ' + e.message);
  }
}

// ── Helper ────────────────────────────────────────────────────

function escAttr(str) {
  return String(str ?? '').replace(/"/g, '&quot;');
}
function escHtml(str) {
  return String(str ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
