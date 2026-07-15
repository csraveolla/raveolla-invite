// ================================================================
// settings.js — Admin settings, WA config, provider, test WA
// ================================================================

import { state } from './state.js'
import { SB_URL, SB_KEY, FONNTE_API, authHeaders, upsertSetting } from './api.js'
import { showToast, showMsg, toggleApiKey } from './utils.js'
import { loadData } from './clients.js'

// ── Tab switching ─────────────────────────────────────────────
export function switchAdminTab(tab) {
  document.querySelectorAll('.admin-tab').forEach((t, i) =>
    t.classList.toggle('active', ['clients', 'setting'][i] === tab)
  )
  document.getElementById('tab-clients').style.display = tab === 'clients' ? 'block' : 'none'
  document.getElementById('tab-setting').style.display  = tab === 'setting'  ? 'block' : 'none'
  if (tab === 'setting') { loadSettingData(); renderWaClientTable() }
}

// ── Load settings from DB ─────────────────────────────────────
export async function loadSettingData() {
  try {
    const res = await fetch(`${SB_URL}/rest/v1/admin_settings?select=id,value`, { headers: authHeaders() })
    if (!res.ok) return
    const rows = await res.json()
    if (!Array.isArray(rows)) return
    const get = key => (rows.find(r => r.id === key) || {}).value || ''
    const nomor    = get('admin_nomor')
    const apiKey   = get('admin_apikey')
    const provider = get('provider')
    const customUrl = get('custom_url')
    if (nomor)    document.getElementById('set-admin-nomor').value  = nomor
    if (apiKey)   document.getElementById('set-admin-apikey').value = apiKey
    if (provider) document.getElementById('set-provider').value     = provider
    if (customUrl) document.getElementById('set-custom-url').value  = customUrl
    toggleCustomUrl()
  } catch (e) { /* silent */ }
}

// ── Save admin WA config ──────────────────────────────────────
export async function simpanSettingAdmin() {
  const nomor  = document.getElementById('set-admin-nomor').value.trim()
  const apiKey = document.getElementById('set-admin-apikey').value.trim()
  const msg    = document.getElementById('msg-setting-admin')
  if (!nomor || !apiKey) { showMsg(msg, 'error', 'Nomor dan API Key wajib diisi!'); return }
  showMsg(msg, 'success', 'Menyimpan...')
  try {
    await upsertSetting('admin_nomor', nomor)
    await upsertSetting('admin_apikey', apiKey)
    showMsg(msg, 'success', '✓ Setting admin tersimpan!')
  } catch (e) {
    showMsg(msg, 'error', 'Gagal simpan: ' + e.message)
  }
}

// ── Save provider ─────────────────────────────────────────────
export async function simpanProvider() {
  const provider  = document.getElementById('set-provider').value
  const customUrl = document.getElementById('set-custom-url').value.trim()
  const msg       = document.getElementById('msg-setting-provider')
  try {
    await Promise.all([
      upsertSetting('provider', provider),
      upsertSetting('custom_url', customUrl)
    ])
    showMsg(msg, 'success', '✓ Provider tersimpan: ' + provider)
  } catch (e) {
    showMsg(msg, 'error', 'Gagal simpan: ' + e.message)
  }
}

// ── Toggle custom URL field ───────────────────────────────────
export function toggleCustomUrl() {
  const v = document.getElementById('set-provider')?.value
  const w = document.getElementById('set-custom-url-wrap')
  if (w) w.style.display = v === 'waha' ? 'block' : 'none'
}

// ── Test WA ───────────────────────────────────────────────────
export async function testWA(mode) {
  const result = document.getElementById('test-admin-result')
  result.textContent = 'Menyiapkan...'
  result.className   = 'test-result'
  result.style.display = 'block'
  try {
    let nomor  = document.getElementById('set-admin-nomor')?.value.trim()
    let apiKey = document.getElementById('set-admin-apikey')?.value.trim()
    if (!nomor || !apiKey) {
      result.textContent = 'Memuat setting dari database...'
      const res = await fetch(
        `${SB_URL}/rest/v1/admin_settings?select=id,value&id=in.(admin_nomor,admin_apikey)`,
        { headers: authHeaders() }
      )
      const rows = res.ok ? await res.json() : []
      const get  = key => (Array.isArray(rows) ? rows.find(r => r.id === key) || {} : {}).value || ''
      nomor  = nomor  || get('admin_nomor')
      apiKey = apiKey || get('admin_apikey')
    }
    if (!nomor || !apiKey) {
      result.textContent = '✗ Isi nomor WA dan API key Fonnte terlebih dahulu, lalu klik Simpan.'
      result.className = 'test-result err'
      return
    }
    result.textContent = `Mengirim test WA ke ${nomor}...`
    const fres = await fetch(FONNTE_API, {
      method: 'POST',
      headers: { 'Authorization': apiKey },
      body: new URLSearchParams({
        target: nomor,
        message: 'Test koneksi dari RSVP Admin ✓\nJika menerima pesan ini, konfigurasi WA berhasil!',
        countryCode: '62'
      })
    })
    const data = await fres.json()
    if (data.status) {
      result.textContent = '✓ Test berhasil! WA terkirim ke ' + nomor
      result.className = 'test-result ok'
    } else {
      throw new Error(data.reason || data.message || JSON.stringify(data))
    }
  } catch (e) {
    result.textContent = '✗ Gagal: ' + e.message
    result.className = 'test-result err'
  }
}

// ── WA client table ───────────────────────────────────────────
export function renderWaClientTable() {
  const wrap = document.getElementById('wa-client-table')
  if (!state.clients.length) { wrap.innerHTML = '<div class="state-box">Belum ada client.</div>'; return }
  let html = `<table style="min-width:900px"><thead><tr>
    <th>Nama Acara</th><th>Paket</th><th>Mode WA</th><th>Nomor WA</th><th>API Key</th><th>Media URL</th><th>Aksi</th>
  </tr></thead><tbody>`
  state.clients.forEach(c => {
    const isPro = c.paket === 'pro' || c.paket === 'premium'
    const mediaCell = isPro
      ? (c.wa_media_url
          ? `<span style="font-size:11px;color:var(--success)">📎 ${c.wa_media_url.slice(0,30)}...</span>`
          : '<span style="font-size:11px;color:var(--text-muted)">Belum diset</span>')
      : '<span style="font-size:11px;color:var(--text-muted);font-style:italic">Lite</span>'
    html += `<tr>
      <td><strong style="font-weight:500">${c.nama_acara}</strong></td>
      <td><span class="chip badge-${c.paket || 'lite'}" style="text-transform:capitalize">${c.paket || 'lite'}</span></td>
      <td>
        <div class="wa-mode-wrap" style="width:160px">
          <button class="wa-mode-btn ${c.wa_mode !== 'client' ? 'active' : ''}" onclick="updateWaMode('${c.id}','admin',this)">Admin</button>
          <button class="wa-mode-btn ${c.wa_mode === 'client' ? 'active' : ''}" onclick="updateWaMode('${c.id}','client',this)">Client</button>
        </div>
      </td>
      <td style="font-family:monospace;font-size:11px">${c.wa_nomor || '<span style="color:var(--text-muted)">—</span>'}</td>
      <td style="font-size:11px;color:var(--text-muted)">${c.wa_api_key ? '••••••••' : '—'}</td>
      <td>${mediaCell}</td>
      <td><button class="btn btn-outline btn-sm" onclick="openEditWaModal('${c.id}')">Edit</button></td>
    </tr>`
  })
  html += '</tbody></table>'
  wrap.innerHTML = html
}

export async function updateWaMode(clientId, mode, btn) {
  try {
    await fetch(`${SB_URL}/rest/v1/clients?id=eq.${clientId}`, {
      method: 'PATCH', headers: authHeaders(),
      body: JSON.stringify({ wa_mode: mode })
    })
    btn.closest('tr').querySelectorAll('.wa-mode-btn').forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    showToast('✓ Mode WA diperbarui')
    loadData()
  } catch (e) {
    showToast('Error: ' + e.message)
  }
}

// ── Edit WA modal ─────────────────────────────────────────────
export function openEditWaModal(clientId) {
  const c = state.clients.find(x => x.id === clientId)
  if (!c) return
  const isPro   = c.paket === 'pro' || c.paket === 'premium'
  const isAdmin = (c.wa_mode || 'admin') === 'admin'
  document.getElementById('ewm-id').value = clientId
  document.getElementById('ewm-nama').textContent = c.nama_acara
  const nomorEl   = document.getElementById('ewm-nomor')
  const apikeyEl  = document.getElementById('ewm-apikey')
  const toggleEl  = document.getElementById('ewm-apikey-toggle')
  const noticeEl  = document.getElementById('ewm-admin-mode-notice')
  nomorEl.value   = c.wa_nomor || ''
  apikeyEl.value  = c.wa_api_key || ''
  if (isAdmin) {
    nomorEl.readOnly  = apikeyEl.readOnly = true
    nomorEl.style.opacity  = apikeyEl.style.opacity = '0.5'
    if (toggleEl) toggleEl.style.display = 'none'
    noticeEl.style.display = 'block'
  } else {
    nomorEl.readOnly  = apikeyEl.readOnly = false
    nomorEl.style.opacity  = apikeyEl.style.opacity = '1'
    if (toggleEl) toggleEl.style.display = ''
    noticeEl.style.display = 'none'
  }
  const mediaWrap = document.getElementById('ewm-media-wrap')
  if (isPro) {
    mediaWrap.style.display = 'block'
    document.getElementById('ewm-media-url').value  = c.wa_media_url || ''
    document.getElementById('ewm-media-nama').value = c.wa_media_nama || ''
  } else {
    mediaWrap.style.display = 'none'
  }
  document.getElementById('modal-wa-client').classList.add('show')
}

export async function simpanWaClient() {
  const clientId = document.getElementById('ewm-id').value
  const c        = state.clients.find(x => x.id === clientId)
  const isPro    = c && (c.paket === 'pro' || c.paket === 'premium')
  const nomor    = document.getElementById('ewm-nomor').value.trim()
  const apiKey   = document.getElementById('ewm-apikey').value.trim()
  const mediaUrl  = isPro ? document.getElementById('ewm-media-url').value.trim() : null
  const mediaNama = isPro ? document.getElementById('ewm-media-nama').value.trim() : null
  const payload = { wa_nomor: nomor || null, wa_api_key: apiKey || null }
  if (isPro) { payload.wa_media_url = mediaUrl || null; payload.wa_media_nama = mediaNama || null }
  try {
    await fetch(`${SB_URL}/rest/v1/clients?id=eq.${clientId}`, {
      method: 'PATCH', headers: authHeaders(), body: JSON.stringify(payload)
    })
    showToast('✓ Konfigurasi WA & media disimpan')
    closeModal('modal-wa-client')
    loadData()
  } catch (e) {
    showToast('Error: ' + e.message)
  }
}

export function previewMedia() {
  const url = document.getElementById('ewm-media-url').value.trim()
  if (!url) { showToast('Isi URL media dulu'); return }
  window.open(url, '_blank')
}

// ── Modal close helper ────────────────────────────────────────
function closeModal(id) {
  document.getElementById(id)?.classList.remove('show')
}
