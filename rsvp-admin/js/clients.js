// ================================================================
// clients.js — Client CRUD: list, add, edit, filter, table render
// ================================================================

import { state } from './state.js'
import { SB_URL, authHeaders } from './api.js'
import { showToast, showMsg, copyText, exportClient } from './utils.js'
import { doLogout } from './auth.js'

// ── Load all data ─────────────────────────────────────────────
export async function loadData() {
  document.getElementById('client-table').innerHTML =
    '<div class="state-box"><div class="spinner"></div>Memuat...</div>'
  try {
    const [r1, r2] = await Promise.all([
      fetch(`${SB_URL}/rest/v1/clients?select=*&order=created_at.desc`, { headers: authHeaders() }),
      fetch(`${SB_URL}/rest/v1/rsvp_tamu?select=*`, { headers: authHeaders() })
    ])
    if (r1.status === 401) { doLogout(); return }
    const newClients = await r1.json()
    const newRsvp    = await r2.json()
    if (!Array.isArray(newClients)) throw new Error('Gagal memuat data')
    state.clients = newClients
    state.rsvpAll = Array.isArray(newRsvp) ? newRsvp : []
    updateStats()
    renderTable()
  } catch (e) {
    document.getElementById('client-table').innerHTML =
      `<div class="state-box">Error: ${e.message}</div>`
  }
}

// ── Stats ─────────────────────────────────────────────────────
export function updateStats() {
  document.getElementById('s-client').textContent = state.clients.length
  document.getElementById('s-rsvp').textContent   = state.rsvpAll.length
  document.getElementById('s-hadir').textContent  =
    state.rsvpAll.filter(r => r.kehadiran === 'Hadir').length
}

// ── Render table ──────────────────────────────────────────────
export function renderTable() {
  if (!state.clients.length) {
    document.getElementById('client-table').innerHTML =
      '<div class="state-box">Belum ada client.</div>'
    return
  }
  let html = `<table><thead><tr>
    <th>#</th><th>Nama Acara</th><th>Paket</th><th>Token Login</th><th>PIN Scanner</th>
    <th>UUID Client</th><th>URL Undangan</th><th>RSVP</th><th>Hadir</th><th>Tamu</th><th>Dibuat</th><th>Aksi</th>
  </tr></thead><tbody>`
  state.clients.forEach((c, i) => {
    const cRsvp  = state.rsvpAll.filter(r => r.client_id === c.id)
    const cHadir = cRsvp.filter(r => r.kehadiran === 'Hadir').length
    const tgl    = new Date(c.created_at).toLocaleDateString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric'
    })
    html += `<tr>
      <td style="color:var(--text-muted);font-size:11px">${i + 1}</td>
      <td><strong style="font-weight:500">${c.nama_acara}</strong></td>
      <td>
        <span class="chip badge-${c.paket || 'lite'}" style="text-transform:capitalize">${c.paket || 'lite'}</span>
        <div style="font-size:10px;color:var(--text-muted);margin-top:3px">
          ${c.max_tamu || 100} tamu · ${c.max_wa || 50} WA ·
          <span style="color:${c.wa_mode === 'client' ? 'var(--info)' : 'var(--success)'};font-size:9px">
            ${c.wa_mode === 'client' ? 'WA Client' : 'WA Admin'}
          </span>
        </div>
      </td>
      <td>
        <div class="token-box">
          <span class="token-text">${c.token}</span>
          <button class="copy-btn" onclick="copyText('${c.token}',this)">⎘</button>
        </div>
      </td>
      <td>
        ${c.pin_scanner
          ? `<div class="token-box"><span class="token-text" style="letter-spacing:3px">${c.pin_scanner}</span><button class="copy-btn" onclick="copyText('${c.pin_scanner}',this)">⎘</button></div>`
          : '<span style="color:var(--text-muted);font-size:11px">—</span>'}
      </td>
      <td>
        <div class="uuid-box" title="${c.id}">
          <span class="uuid-text">${c.id}</span>
          <button class="copy-btn" onclick="copyText('${c.id}',this)">⎘</button>
        </div>
      </td>
      <td>
        ${c.base_url
          ? `<div class="uuid-box" title="${c.base_url}" style="max-width:180px"><span class="uuid-text">${c.base_url}</span><button class="copy-btn" onclick="copyText('${c.base_url}',this)">⎘</button></div>`
          : '<span style="color:var(--text-muted);font-size:11px">—</span>'}
      </td>
      <td><span class="chip chip-gold">${cRsvp.length} data</span></td>
      <td style="font-size:12px;color:var(--text-muted)"><span style="font-weight:500">${cRsvp.length}</span> / ${c.max_tamu || 100}</td>
      <td><span class="chip chip-green">${cHadir} hadir</span></td>
      <td style="color:var(--text-muted);font-size:12px;white-space:nowrap">${tgl}</td>
      <td style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="btn btn-sm btn-outline" onclick="openDetail('${c.id}','${c.nama_acara.replace(/'/g, "\\'")}')">Detail</button>
        <button class="btn btn-sm" style="background:var(--info-bg);color:var(--info);border:1px solid var(--info-b);border-radius:50px" onclick="openEditClient('${c.id}')">✎ Edit</button>
        <button class="btn btn-sm" style="background:var(--primary-gl);color:var(--primary);border:1px solid rgba(128,0,32,0.25);border-radius:50px" onclick="openInvitation('${c.id}','${c.nama_acara.replace(/'/g, "\\'")}')">📋 Undangan</button>
        <button class="btn btn-sm btn-gold" onclick="exportClient('${c.id}','${c.nama_acara.replace(/'/g, "\\'")}')">↓ CSV</button>
      </td>
    </tr>`
  })
  html += '</tbody></table>'
  document.getElementById('client-table').innerHTML = html
}

// ── Filter ────────────────────────────────────────────────────
export function filterClients() {
  const q = document.getElementById('search-client')?.value.toLowerCase() || ''
  if (!q) { renderTable(); return }
  const backup = state.clients.slice()
  state.clients = backup.filter(c => c.nama_acara.toLowerCase().includes(q))
  renderTable()
  state.clients = backup
}

// ── Add client ────────────────────────────────────────────────
export async function tambahClient() {
  const nama     = document.getElementById('inp-nama').value.trim()
  const token    = document.getElementById('inp-token').value.trim().toUpperCase()
  const url      = document.getElementById('inp-url').value.trim()
  const pin      = document.getElementById('inp-pin').value.trim()
  const paket    = document.getElementById('inp-paket').value
  const waMode   = document.getElementById('inp-wa-mode').value
  const waNomor  = (document.getElementById('inp-wa-nomor')?.value || '').trim()
  const waApiKey = (document.getElementById('inp-wa-apikey')?.value || '').trim()
  const maxTamu  = paket === 'lite' ? 100 : paket === 'pro' ? 250 : 500
  const maxWa    = paket === 'lite' ? 50  : paket === 'pro' ? 100 : 300
  const msg      = document.getElementById('msg-client')
  if (!nama || !token) { showMsg(msg, 'error', 'Nama acara dan token wajib diisi!'); return }
  if (!url) { showMsg(msg, 'error', 'URL halaman undangan wajib diisi!'); return }
  if (!pin || pin.length !== 6) { showMsg(msg, 'error', 'PIN Scanner harus 6 digit angka!'); return }
  try {
    const pkgRes = await fetch(`${SB_URL}/rest/v1/packages?name=ilike.${paket}&select=id`, { headers: authHeaders() })
    const pkgRows = pkgRes.ok ? await pkgRes.json() : []
    const packageId = pkgRows[0]?.id || null

    const res = await fetch(`${SB_URL}/rest/v1/clients`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Prefer': 'return=minimal' },
      body: JSON.stringify({
        nama_acara: nama, token, base_url: url, pin_scanner: pin,
        paket, package_id: packageId,
        max_tamu: maxTamu, max_wa: maxWa, wa_mode: waMode,
        wa_nomor: waNomor || null, wa_api_key: waApiKey || null
      })
    })
    if (res.ok || res.status === 201) {
      showMsg(msg, 'success', `✓ Client "${nama}" berhasil ditambahkan! Token: ${token}`)
      ;['inp-nama','inp-token','inp-url','inp-pin','inp-wa-nomor','inp-wa-apikey'].forEach(id => {
        const el = document.getElementById(id)
        if (el) el.value = ''
      })
      document.getElementById('inp-paket').value = 'lite'
      setWaMode('admin')
      loadData()
    } else {
      const e = await res.json()
      throw new Error(e.message || 'Gagal menyimpan')
    }
  } catch (e) {
    showMsg(msg, 'error', '✗ Error: ' + e.message)
  }
}

// ── Generate token / PIN ──────────────────────────────────────
export function generateToken() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  document.getElementById('inp-token').value =
    Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  document.getElementById('inp-pin').value =
    Array.from({ length: 6 }, () => Math.floor(Math.random() * 10)).join('')
}

// ── Edit client modal ─────────────────────────────────────────
export function openEditClient(id) {
  const c = state.clients.find(x => x.id === id)
  if (!c) return
  document.getElementById('ec-id').value      = c.id
  document.getElementById('ec-nama').value     = c.nama_acara || ''
  document.getElementById('ec-url').value      = c.base_url || ''
  document.getElementById('ec-token').value    = c.token || ''
  document.getElementById('ec-pin').value      = c.pin_scanner || ''
  document.getElementById('ec-paket').value    = c.paket || 'lite'
  document.getElementById('ec-max-tamu').value = c.max_tamu || 100
  document.getElementById('ec-max-wa').value   = c.max_wa || 50
  setEcWaMode(c.wa_mode || 'admin')
  document.getElementById('ec-wa-nomor').value  = c.wa_nomor || ''
  document.getElementById('ec-wa-apikey').value = c.wa_api_key || ''
  document.getElementById('modal-edit-client').classList.add('show')
}

export function setEcWaMode(mode) {
  document.getElementById('ec-wa-mode').value = mode
  document.getElementById('ec-wa-admin').classList.toggle('active', mode === 'admin')
  document.getElementById('ec-wa-client').classList.toggle('active', mode === 'client')
  document.getElementById('ec-wa-fields').style.display = mode === 'client' ? 'block' : 'none'
  const nomorInp  = document.getElementById('ec-wa-nomor')
  const apikeyInp = document.getElementById('ec-wa-apikey')
  const disabled  = mode === 'admin'
  nomorInp.disabled  = apikeyInp.disabled = disabled
  nomorInp.style.opacity  = apikeyInp.style.opacity = disabled ? '0.5' : '1'
  nomorInp.style.cursor   = apikeyInp.style.cursor  = disabled ? 'not-allowed' : ''
}

export function ecUpdateMaxFromPaket() {
  const p = document.getElementById('ec-paket').value
  document.getElementById('ec-max-tamu').value = p === 'lite' ? 100 : p === 'pro' ? 250 : 500
  document.getElementById('ec-max-wa').value   = p === 'lite' ? 50  : p === 'pro' ? 100 : 300
}

export async function simpanEditClient() {
  const id       = document.getElementById('ec-id').value
  const nama     = document.getElementById('ec-nama').value.trim()
  const url      = document.getElementById('ec-url').value.trim()
  const paket    = document.getElementById('ec-paket').value
  const maxTamu  = parseInt(document.getElementById('ec-max-tamu').value)
  const maxWa    = parseInt(document.getElementById('ec-max-wa').value)
  const waMode   = document.getElementById('ec-wa-mode').value
  const waNomor  = document.getElementById('ec-wa-nomor').value.trim()
  const waKey    = document.getElementById('ec-wa-apikey').value.trim()
  const token    = document.getElementById('ec-token').value.trim()
  const pin      = document.getElementById('ec-pin').value.trim()
  if (!nama || !token) { showToast('Nama dan token wajib diisi!'); return }
  try {
    const payload = {
      nama_acara: nama, base_url: url, token, pin_scanner: pin,
      paket, max_tamu: maxTamu, max_wa: maxWa, wa_mode: waMode
    }
    if (waMode === 'client') {
      payload.wa_nomor   = waNomor || null
      payload.wa_api_key = waKey || null
    }

    const pkgRes = await fetch(`${SB_URL}/rest/v1/packages?name=ilike.${paket}&select=id`, { headers: authHeaders() })
    const pkgRows = pkgRes.ok ? await pkgRes.json() : []
    const packageId = pkgRows[0]?.id || null
    if (packageId) payload.package_id = packageId

    const res = await fetch(`${SB_URL}/rest/v1/clients?id=eq.${id}`, {
      method: 'PATCH', headers: authHeaders(), body: JSON.stringify(payload)
    })
    if (res.ok) {
      if (packageId) {
        await fetch(`${SB_URL}/rest/v1/invitations?client_id=eq.${id}`, {
          method: 'PATCH', headers: authHeaders(),
          body: JSON.stringify({ package_id: packageId })
        })
      }
      closeModal('modal-edit-client')
      showToast('✓ Data client berhasil diperbarui')
      loadData()
    } else {
      throw new Error('Gagal menyimpan')
    }
  } catch (e) {
    showToast('Error: ' + e.message)
  }
}

// ── WA mode toggle (add form) ─────────────────────────────────
export function setWaMode(mode) {
  document.getElementById('inp-wa-mode').value = mode
  document.getElementById('wa-mode-admin').classList.toggle('active', mode === 'admin')
  document.getElementById('wa-mode-client').classList.toggle('active', mode === 'client')
  document.getElementById('wa-client-fields').style.display = mode === 'client' ? 'block' : 'none'
}

// ── Modal helper (shared) ─────────────────────────────────────
export function closeModal(id) {
  if (id) {
    document.getElementById(id).classList.remove('show')
  } else {
    document.getElementById('modal-delete').classList.remove('show')
  }
}
