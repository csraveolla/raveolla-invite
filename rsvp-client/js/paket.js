// ============================================================
// paket.js — Paket Gate, Kuota WA, Media Preview
// ============================================================
import { SB, H } from './config.js';
import { showToast } from './utils.js';
import { clientData, paketFitur } from './auth.js';
import { initSupabaseClient, supabaseClient } from './realtime.js';

// ── Paket Gate — sembunyikan/kunci fitur sesuai paket ────────

export function applyPaketGates() {
  const paket = clientData.paket || 'lite';
  const pcfg  = { lite: 'Lite', pro: 'Pro', premium: 'Premium' };

  document.getElementById('paket-badge-wrap').innerHTML =
    `<span class="paket-badge ${paket}">${pcfg[paket] || paket}</span>`;
  document.getElementById('paket-info-text').textContent =
    `Mode WA: ${clientData.wa_mode === 'client' ? '👤 dari nomor sendiri' : '📱 dari nomor admin'} · Max ${paketFitur.max_tamu} tamu`;

  updateWaQuota();

  // Realtime kuota — subscribe changes ke tabel clients
  initSupabaseClient();
  if (window._kuotaRealtimeChannel) {
    supabaseClient.removeChannel(window._kuotaRealtimeChannel);
  }
  window._kuotaRealtimeChannel = supabaseClient
    .channel('kuota-wa-' + clientData.id)
    .on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'clients',
      filter: `id=eq.${clientData.id}`
    }, (payload) => {
      if (payload.new) {
        clientData.wa_terkirim = payload.new.wa_terkirim ?? clientData.wa_terkirim;
        if (payload.new.max_wa) clientData.max_wa = payload.new.max_wa;
        updateWaQuota();
      }
    })
    .subscribe();

  renderMediaPreview();

  // Tab komentar
  const tabKom = document.getElementById('tab-komentar-btn');
  if (!paketFitur.komentar) {
    tabKom.classList.add('locked');
    tabKom.innerHTML = 'Komentar 🔒';
    tabKom.onclick = () => showToast('Fitur Komentar tersedia di paket Pro/Premium');
  }

  // Tab kirim
  const tabK = document.getElementById('tab-kirim-btn');
  if (!paketFitur.kirim_tab) tabK.innerHTML = '📤 Kirim Pesan 🔒';

  // Jadwal (Premium only)
  const jadwalLock = document.getElementById('jadwal-premium-lock');
  if (jadwalLock) jadwalLock.style.display = paketFitur.jadwal ? 'none' : 'inline';

  // Reminder items (Premium only)
  [
    { id: 'rem-rsvp-item',   badgeId: 'rem-rsvp-badge'   },
    { id: 'rem-hadir-item',  badgeId: 'rem-hadir-badge'  },
    { id: 'rem-ucapan-item', badgeId: 'rem-ucapan-badge' },
  ].forEach(({ id, badgeId }) => {
    const item  = document.getElementById(id);
    const badge = document.getElementById(badgeId);
    if (!item || !badge) return;
    if (!paketFitur.reminder) {
      item.classList.add('locked-item');
      badge.textContent = '🔒 Premium';
    } else {
      item.classList.remove('locked-item');
      badge.textContent = 'Premium';
    }
  });

  // Kirim tab gate
  document.getElementById('kirim-content').style.display = paketFitur.kirim_tab ? 'block' : 'none';
  document.getElementById('kirim-gate').style.display    = paketFitur.kirim_tab ? 'none'  : 'block';

  // WA mode info
  if (clientData.wa_mode === 'client') {
    const nomor = clientData.wa_nomor;
    document.getElementById('kirim-mode-info').textContent =
      nomor
        ? `📤 Otomatis dengan nomor client : ${nomor}`
        : `📤 Otomatis dengan nomor client : (nomor belum di-setting, hubungi admin)`;
    if (!clientData.wa_api_key)
      setTimeout(() => showToast('⚠ API Key Fonnte client belum diset. Hubungi admin.'), 1500);
  } else {
    document.getElementById('kirim-mode-info').textContent = '📤 Memeriksa setting admin...';
    fetch(`${SB}/rest/v1/admin_settings?id=eq.admin_apikey&select=value`, { headers: H })
      .then(async r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(rows => {
        const hasKey = rows?.[0]?.value;
        document.getElementById('kirim-mode-info').textContent = hasKey
          ? `📤 Otomatis dengan nomor admin`
          : '⚠ API Key admin belum diset — buka panel admin → Setting';
        if (!hasKey)
          setTimeout(() => showToast('⚠ API Key Fonnte admin belum diset di panel admin.'), 1500);
      })
      .catch(e => {
        const ls = JSON.parse(localStorage.getItem('rsvp_admin_setting') || '{}');
        const hasKey = ls.adminApiKey;
        document.getElementById('kirim-mode-info').textContent = hasKey
          ? `📤 Otomatis dengan nomor admin (localStorage)`
          : `⚠ Gagal baca setting: ${e.message}`;
      });
  }
}

// ── Kuota WA ──────────────────────────────────────────────────

export function updateWaQuota() {
  const terkirim = clientData.wa_terkirim || 0;
  const maxWa    = clientData.max_wa || paketFitur.max_wa || 50;
  const sisa     = Math.max(0, maxWa - terkirim);
  const pct      = maxWa > 0 ? Math.round((sisa / maxWa) * 100) : 0;

  document.getElementById('wa-quota-text').textContent = `${sisa} sisa / ${maxWa}`;
  const bar = document.getElementById('wa-quota-bar');
  if (bar) {
    bar.style.width = pct + '%';
    bar.style.background = pct > 50 ? 'var(--primary)' : pct > 20 ? 'var(--warning)' : 'var(--danger)';
  }
  const dotEl = document.querySelector('.kuota-dot');
  if (dotEl) dotEl.style.background = pct > 20 ? 'var(--success)' : 'var(--danger)';
}

export async function incrWaQuota(jumlah) {
  try {
    const res = await fetch(`${SB}/rest/v1/rpc/increment_wa_terkirim`, {
      method: 'POST',
      headers: { ...H, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_client_id: clientData.id, p_jumlah: jumlah })
    });
    if (!res.ok) throw new Error(`RPC gagal: ${res.status}`);
  } catch (e) {
    console.warn('incrWaQuota RPC gagal, fallback PATCH:', e.message);
    try {
      const cur  = await fetch(`${SB}/rest/v1/clients?id=eq.${clientData.id}&select=wa_terkirim`, { headers: H });
      const rows = await cur.json();
      const nowVal = rows?.[0]?.wa_terkirim || clientData.wa_terkirim || 0;
      await fetch(`${SB}/rest/v1/clients?id=eq.${clientData.id}`, {
        method: 'PATCH', headers: H,
        body: JSON.stringify({ wa_terkirim: nowVal + jumlah })
      });
    } catch (e2) {
      console.warn('incrWaQuota PATCH juga gagal:', e2.message);
    }
  }
  try {
    const res  = await fetch(`${SB}/rest/v1/clients?id=eq.${clientData.id}&select=wa_terkirim`, { headers: H });
    const rows = await res.json();
    if (rows?.[0]) { clientData.wa_terkirim = rows[0].wa_terkirim; updateWaQuota(); }
  } catch (e) {
    clientData.wa_terkirim = (clientData.wa_terkirim || 0) + jumlah;
    updateWaQuota();
  }
}

export async function cekKuotaWa(jumlahMauKirim) {
  try {
    const res  = await fetch(`${SB}/rest/v1/clients?id=eq.${clientData.id}&select=wa_terkirim,max_wa`, { headers: H });
    const rows = await res.json();
    if (rows?.[0]) {
      clientData.wa_terkirim = rows[0].wa_terkirim ?? clientData.wa_terkirim;
      if (rows[0].max_wa) clientData.max_wa = rows[0].max_wa;
    }
  } catch (e) { /* gunakan nilai lokal */ }

  const terkirim = clientData.wa_terkirim || 0;
  const maxWa    = clientData.max_wa || paketFitur.max_wa || 50;
  const sisa     = maxWa - terkirim;
  updateWaQuota();
  if (sisa <= 0) { showToast('\u26D4 Kuota WA habis! Hubungi admin untuk upgrade paket.'); return 0; }
  if (jumlahMauKirim > sisa) {
    showToast(`⚠ Hanya ${sisa} WA tersisa dari ${jumlahMauKirim} yang dipilih. Mengirim ${sisa} dulu.`);
    return sisa;
  }
  return jumlahMauKirim;
}

// ── Media Preview ─────────────────────────────────────────────

export function renderMediaPreview() {
  const isPro     = clientData.paket === 'pro' || clientData.paket === 'premium';
  const mediaUrl  = clientData.wa_media_url;
  const mediaNama = clientData.wa_media_nama;
  const previewWrap = document.getElementById('media-preview-wrap');
  const noneWrap    = document.getElementById('media-none-wrap');
  if (!previewWrap) return;
  if (!isPro) { previewWrap.style.display = 'none'; noneWrap.style.display = 'none'; return; }
  if (mediaUrl) {
    previewWrap.style.display = 'block';
    noneWrap.style.display    = 'none';
    const ext  = mediaUrl.split('.').pop().toLowerCase().split('?')[0];
    const icon = ['jpg','jpeg','png','gif','bmp','webp'].includes(ext) ? '🖼'
               : ext === 'pdf' ? '📄'
               : ['mp4','3gp'].includes(ext) ? '🎬' : '📎';
    document.getElementById('media-preview-thumb').textContent = icon;
    document.getElementById('media-preview-nama').textContent  = mediaNama || 'File Media';
    document.getElementById('media-preview-url').href          = mediaUrl;
  } else {
    previewWrap.style.display = 'none';
    noneWrap.style.display    = 'block';
  }
}
