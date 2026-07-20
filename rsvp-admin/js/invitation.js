// ================================================================
// invitation.js — Data Undangan editor (all sub-tabs)
// Style system: CSS class-based via style-presets.css
// ================================================================

import { state, INV, INV_MONTHS, INV_FIELDS } from './state.js'
import { SB_URL, SB_KEY, authHeaders } from './api.js'
import { showToast, invMsg, esc, escH } from './utils.js'
import { STYLE_PRESETS, FONT_OPTIONS, ALL_STYLE_CLASSES, ALL_FONT_CLASSES, SECTION_LABELS } from '../../tema/assets/event-presets.js'

// ── Navigation ────────────────────────────────────────────────

export async function openInvitation(clientId, nama) {
  INV.clientId = clientId
  document.getElementById('inv-acara-nama').textContent = nama
  document.getElementById('dashboard-screen').style.display  = 'none'
  document.getElementById('detail-screen').style.display     = 'none'
  document.getElementById('invitation-screen').style.display = 'block'
  document.getElementById('inv-loading').style.display  = 'block'
  document.getElementById('inv-notfound').style.display = 'none'
  document.getElementById('inv-wrap').style.display     = 'none'
  await loadInvData(clientId)
}

export function backFromInvitation() {
  document.getElementById('invitation-screen').style.display = 'none'
  document.getElementById('dashboard-screen').style.display  = 'block'
}

export function switchInvTab(btn, name) {
  document.querySelectorAll('.inv-subtab').forEach(el => el.classList.remove('active'))
  document.querySelectorAll('.inv-subtab-content').forEach(el => el.classList.remove('active'))
  btn.classList.add('active')
  document.getElementById('inv-sub-' + name).classList.add('active')
}

// ── Load Data ────────────────────────────────────────────────

export async function loadInvData(clientId) {
  try {
    const res  = await fetch(
      `${SB_URL}/rest/v1/invitations?client_id=eq.${clientId}&select=*`,
      { headers: authHeaders() }
    )
    if (!res.ok) throw new Error('HTTP ' + res.status)
    const rows = await res.json()

    document.getElementById('inv-loading').style.display = 'none'

    if (!rows.length) {
      const cRes  = await fetch(`${SB_URL}/rest/v1/clients?id=eq.${clientId}&select=base_url`, { headers: authHeaders() })
      const cRows = cRes.ok ? await cRes.json() : []
      const slug  = (cRows[0]?.base_url || '').split('/').filter(Boolean).pop() || ''
      const slugEl = document.getElementById('inv-create-slug')
      slugEl.value = slug
      slugEl.readOnly = true
      document.getElementById('inv-notfound').style.display = 'block'
      return
    }

    const inv = rows[0]
    INV.invId = inv.id

    const cRes  = await fetch(`${SB_URL}/rest/v1/clients?id=eq.${clientId}&select=token,pin_scanner,package_id,tanggal_acara`, { headers: authHeaders() })
    const cRows = cRes.ok ? await cRes.json() : []
    const clientData = cRows[0] || {}

    await loadInvMeta(inv)
    fillInvSettings(inv, clientData)
    fillInvMempelai(inv, clientData)

    const [evR, bnR, lvR, gaR] = await Promise.all([
      fetch(`${SB_URL}/rest/v1/events?invitation_id=eq.${inv.id}&select=*&order=sort_order`, { headers: authHeaders() }),
      fetch(`${SB_URL}/rest/v1/bank_accounts?invitation_id=eq.${inv.id}&select=*&order=sort_order`, { headers: authHeaders() }),
      fetch(`${SB_URL}/rest/v1/love_stories?invitation_id=eq.${inv.id}&select=*&order=sort_order`, { headers: authHeaders() }),
      fetch(`${SB_URL}/rest/v1/galleries?invitation_id=eq.${inv.id}&select=*&order=sort_order`, { headers: authHeaders() })
    ])

    INV.events  = evR.ok ? await evR.json() : []
    INV.banks   = bnR.ok ? await bnR.json() : []
    INV.loves   = (lvR.ok ? await lvR.json() : []).map(s => {
      const [y, m] = (s.event_date || '').split('-')
      return { ...s, _y: y || '', _m: m || '' }
    })
    INV.gallery = (gaR.ok ? await gaR.json() : []).map(g => ({
      url: g.file_url, caption: g.caption || '', is_cover: g.is_cover
    }))
    INV.section_styles = inv.section_styles || {}

    renderInvEvents()
    renderInvBanks()
    renderInvLoves()
    renderInvGallery()
    renderAllSectionStyles()
    document.getElementById('inv-wrap').style.display = 'block'
  } catch (e) {
    document.getElementById('inv-loading').innerHTML =
      '<div class="state-box">Gagal memuat: ' + e.message + '</div>'
  }
}

async function loadInvMeta(inv) {
  const [thR, pkR] = await Promise.all([
    fetch(`${SB_URL}/rest/v1/themes?is_active=eq.true&select=id,name&order=sort_order`, { headers: authHeaders() }),
    fetch(`${SB_URL}/rest/v1/packages?is_active=eq.true&select=id,name&order=sort_order`, { headers: authHeaders() })
  ])
  const themes = thR.ok ? await thR.json() : []
  const pkgs   = pkR.ok ? await pkR.json() : []

  document.getElementById('inv-theme-sel').innerHTML =
    '<option value="">— Pilih Tema —</option>' +
    themes.map(t => `<option value="${t.id}" ${t.id === inv.theme_id ? 'selected' : ''}>${t.name}</option>`).join('')

  document.getElementById('inv-package-sel').innerHTML =
    '<option value="">— Pilih Paket —</option>' +
    pkgs.map(p => `<option value="${p.id}" ${p.id === inv.package_id ? 'selected' : ''}>${p.name}</option>`).join('')
}

// ── Pengaturan ───────────────────────────────────────────────

function fillInvSettings(inv, clientData) {
  document.getElementById('inv-slug').value               = inv.slug || ''
  document.getElementById('inv-expired').value             = (inv.expired_at || '').slice(0, 10)
  document.getElementById('inv-token-display').textContent = clientData?.token || '—'
  document.getElementById('inv-pin-display').textContent   = clientData?.pin_scanner || '—'

  const toggle = document.getElementById('inv-pub-toggle')
  if (toggle) toggle.classList.toggle('is-on', !!inv.is_published)

  const pkgSel = document.getElementById('inv-package-sel')
  if (pkgSel && clientData?.package_id) {
    pkgSel.value = clientData.package_id
  }
}

export function togglePublish() {
  const toggle = document.getElementById('inv-pub-toggle')
  if (toggle) toggle.classList.toggle('is-on')
}

export async function saveInvSettings() {
  const msg  = document.getElementById('msg-inv-pengaturan')
  const toggle = document.getElementById('inv-pub-toggle')
  const payload = {
    theme_id:     document.getElementById('inv-theme-sel').value   || null,
    expired_at:   document.getElementById('inv-expired').value     || null,
    is_published: toggle ? toggle.classList.contains('is-on') : false
  }
  try {
    const res = await fetch(`${SB_URL}/rest/v1/invitations?id=eq.${INV.invId}`, {
      method: 'PATCH', headers: authHeaders(), body: JSON.stringify(payload)
    })
    if (!res.ok) throw new Error(await res.text())
    invMsg(msg, 'success', '✓ Pengaturan tersimpan.')
  } catch (e) {
    invMsg(msg, 'error', 'Gagal: ' + e.message)
  }
}

export async function createBlankInvitation() {
  const slug = document.getElementById('inv-create-slug').value.trim()
  const msg  = document.getElementById('msg-inv-create')
  if (!slug) { invMsg(msg, 'error', 'Slug wajib diisi.'); return }
  try {
    const chk  = await fetch(`${SB_URL}/rest/v1/invitations?slug=eq.${slug}&select=id`, { headers: authHeaders() })
    const rows = await chk.json()
    if (rows.length) { invMsg(msg, 'error', 'Slug sudah dipakai.'); return }

    const res = await fetch(`${SB_URL}/rest/v1/invitations`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Prefer': 'return=representation' },
      body: JSON.stringify({
        client_id:    INV.clientId,
        slug,
        is_published: false
      })
    })
    if (!res.ok) throw new Error(await res.text())
    await loadInvData(INV.clientId)
  } catch (e) {
    invMsg(msg, 'error', 'Gagal: ' + e.message)
  }
}

// ── Mempelai ─────────────────────────────────────────────────

function fillInvMempelai(inv, clientData) {
  INV_FIELDS.forEach(f => {
    const el = document.getElementById('inv-' + f)
    if (el) el.value = inv[f] || ''
  })
  const tglEl = document.getElementById('inv-tanggal_acara')
  if (tglEl) tglEl.value = clientData?.tanggal_acara || ''
  setInvPhoto('bride', inv.bride_photo_url)
  setInvPhoto('groom', inv.groom_photo_url)
}

function setInvPhoto(p, url) {
  const el  = document.getElementById('inv-' + p + '-preview')
  const lbl = document.getElementById('inv-' + p + '-lbl')
  if (!el) return
  if (url) {
    el.style.backgroundImage = `url('${url}')`
    el.style.backgroundSize  = 'cover'
    el.textContent = ''
    if (lbl) lbl.textContent = 'Ganti Foto'
  } else {
    el.style.backgroundImage = ''
    el.textContent = p === 'bride' ? 'A' : 'B'
    if (lbl) lbl.textContent = 'Pilih Foto'
  }
}

export async function uploadInvPhoto(person, file) {
  if (!file || !INV.invId) return
  const lbl = document.getElementById('inv-' + person + '-lbl')
  if (lbl) lbl.textContent = 'Mengupload...'
  try {
    const ext   = file.name.split('.').pop()
    const path  = `${INV.invId}/${person}-${Date.now()}.${ext}`
    const upRes = await fetch(`${SB_URL}/storage/v1/object/profile-photos/${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${state.accessToken}`,
        'apikey': SB_KEY,
        'Content-Type': file.type
      },
      body: file
    })
    if (!upRes.ok) throw new Error('Upload gagal')
    const url = `${SB_URL}/storage/v1/object/public/profile-photos/${path}`
    setInvPhoto(person, url)
    await fetch(`${SB_URL}/rest/v1/invitations?id=eq.${INV.invId}`, {
      method: 'PATCH', headers: authHeaders(),
      body: JSON.stringify({ [person + '_photo_url']: url })
    })
    showToast('✓ Foto diperbarui')
  } catch (e) {
    showToast('Gagal: ' + e.message)
    if (lbl) lbl.textContent = 'Ganti Foto'
  }
}

export async function saveInvMempelai() {
  const msg = document.getElementById('msg-inv-mempelai')
  const tglEl = document.getElementById('inv-tanggal_acara')
  if (!tglEl?.value) { invMsg(msg, 'error', '⚠️ Tanggal Pernikahan wajib diisi.'); return }

  const p = {}
  INV_FIELDS.forEach(f => {
    const el = document.getElementById('inv-' + f)
    if (el) p[f] = el.value || null
  })
  try {
    const res = await fetch(`${SB_URL}/rest/v1/invitations?id=eq.${INV.invId}`, {
      method: 'PATCH', headers: authHeaders(), body: JSON.stringify(p)
    })
    if (!res.ok) throw new Error(await res.text())

    await fetch(`${SB_URL}/rest/v1/clients?id=eq.${INV.clientId}`, {
      method: 'PATCH', headers: authHeaders(),
      body: JSON.stringify({ tanggal_acara: tglEl.value || null })
    })

    invMsg(msg, 'success', '✓ Data mempelai tersimpan.')
  } catch (e) {
    invMsg(msg, 'error', 'Gagal: ' + e.message)
  }
}

// ── Acara ────────────────────────────────────────────────────

export function renderInvEvents() {
  const w = document.getElementById('inv-events-wrap')
  if (!INV.events.length) { w.innerHTML = '<div class="state-box">Belum ada acara.</div>'; return }
  w.innerHTML = INV.events.map((ev, i) => {
    const cs = ev.custom_style || {}
    const currentPreset = normalizePreset(cs)
    const currentOverrides = normalizeOverrides(cs)
    return `
    <div class="inv-repeater-item">
      <div class="inv-repeater-head">
        <div class="inv-repeater-title">${ev.event_name || 'Acara Baru'}</div>
        <button class="inv-repeater-del" onclick="INV.events.splice(${i},1);renderInvEvents()">✕</button>
      </div>
      <div class="inv-repeater-body">
        <div><label>Nama Acara</label>
          <input type="text" value="${esc(ev.event_name)}"
            oninput="INV.events[${i}].event_name=this.value;this.closest('.inv-repeater-item').querySelector('.inv-repeater-title').textContent=this.value||'Acara Baru'">
        </div>
        <div><label>Tanggal</label>
          <input type="date" value="${ev.event_date || ''}" oninput="INV.events[${i}].event_date=this.value">
        </div>
        <div><label>Jam Mulai (24 jam)</label>
          <div class="inv-time-pair">
            ${tSel(i,'start_time','h',ev.start_time)}<span class="inv-time-sep">:</span>${tSel(i,'start_time','m',ev.start_time)}
          </div>
        </div>
        <div><label>Jam Selesai (24 jam)</label>
          <div class="inv-time-pair">
            ${tSel(i,'end_time','h',ev.end_time)}<span class="inv-time-sep">:</span>${tSel(i,'end_time','m',ev.end_time)}
          </div>
        </div>
        <div class="span2"><label>Nama Venue</label>
          <input type="text" value="${esc(ev.location_name)}" oninput="INV.events[${i}].location_name=this.value">
        </div>
        <div class="span2"><label>Alamat</label>
          <input type="text" value="${esc(ev.address)}" oninput="INV.events[${i}].address=this.value">
        </div>
        <div class="span2"><label>Link Google Maps</label>
          <input type="text" value="${esc(ev.maps_url)}" oninput="INV.events[${i}].maps_url=this.value">
        </div>
        <div class="span2"><label>Link Livestream (opsional)</label>
          <input type="text" value="${esc(ev.livestream_url)}" oninput="INV.events[${i}].livestream_url=this.value">
        </div>
        ${renderEventStyleUI(i, currentPreset, currentOverrides)}
      </div>
    </div>`
  }).join('')
}

function renderEventStyleUI(i, currentPreset, currentOverrides) {
  const presetOpts = Object.entries(STYLE_PRESETS).map(([k, v]) =>
    `<option value="${k}" ${currentPreset === k ? 'selected' : ''}>${v.label}</option>`
  ).join('')
  const fontOpts = FONT_OPTIONS.map(f =>
    `<option value="${f.value}" ${currentOverrides.font_class === f.value ? 'selected' : ''}>${f.label}</option>`
  ).join('')

  return `
    <div class="span2" style="border-top:1px dashed rgba(255,255,255,.15);padding-top:12px;margin-top:4px">
      <label style="color:var(--gold);letter-spacing:.1em;font-size:11px">🎨 STYLE EVENT</label>
    </div>
    <div><label>Preset</label>
      <select onchange="INV.events[${i}].custom_style=applyEventPreset(${i},this.value);renderInvEvents()">
        <option value="">— Default Tema —</option>
        ${presetOpts}
      </select>
    </div>
    <div><label>Font</label>
      <select onchange="INV.events[${i}].custom_style=applyEventFont(${i},this.value);renderInvEvents()">
        <option value="">— Default Tema —</option>
        ${fontOpts}
      </select>
    </div>
    <details style="grid-column:span 2;margin-top:8px">
      <summary style="cursor:pointer;font-size:11px;color:var(--gold);letter-spacing:.05em">⚙ Custom Override</summary>
      <div style="padding:8px 0;display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div><label>Background</label>
          <input type="text" value="${esc(currentOverrides.bg_color || '')}" placeholder="rgba(...) atau #hex"
            oninput="INV.events[${i}].custom_style=applyEventOverride(${i},'bg_color',this.value)">
        </div>
        <div><label>Text Color</label>
          <input type="text" value="${esc(currentOverrides.text_color || '')}" placeholder="#hex"
            oninput="INV.events[${i}].custom_style=applyEventOverride(${i},'text_color',this.value)">
        </div>
        <div><label>Accent Color</label>
          <input type="text" value="${esc(currentOverrides.accent_color || '')}" placeholder="#hex"
            oninput="INV.events[${i}].custom_style=applyEventOverride(${i},'accent_color',this.value)">
        </div>
        <div><label>Border</label>
          <input type="text" value="${esc(currentOverrides.border || '')}" placeholder="1px solid #c9a96e"
            oninput="INV.events[${i}].custom_style=applyEventOverride(${i},'border',this.value)">
        </div>
        <div><label>Border Radius</label>
          <input type="text" value="${esc(currentOverrides.border_radius || '')}" placeholder="0px"
            oninput="INV.events[${i}].custom_style=applyEventOverride(${i},'border_radius',this.value)">
        </div>
        <div><label>Box Shadow</label>
          <input type="text" value="${esc(currentOverrides.box_shadow || '')}" placeholder="0 4px 20px rgba(0,0,0,0.3)"
            oninput="INV.events[${i}].custom_style=applyEventOverride(${i},'box_shadow',this.value)">
        </div>
      </div>
    </details>
  `
}

function tSel(i, field, part, val) {
  const [h, m] = (val || '').split(':')
  const cur = part === 'h' ? h : m
  const max = part === 'h' ? 24 : 60
  let o = '<option value="">--</option>'
  for (let n = 0; n < max; n++) {
    const v = String(n).padStart(2, '0')
    o += `<option value="${v}" ${cur === v ? 'selected' : ''}>${v}</option>`
  }
  return `<select class="inv-time-select" onchange="tUpd(${i},'${field}','${part}',this.value)">${o}</select>`
}

export function tUpd(i, field, part, value) {
  const [h, m] = (INV.events[i][field] || '').split(':')
  INV.events[i][field] = (part === 'h' ? value : (h || '00')) + ':' + (part === 'm' ? value : (m || '00'))
}

export function addInvEvent() {
  INV.events.push({
    event_name: '', event_date: '', start_time: '', end_time: '',
    location_name: '', address: '', maps_url: '', livestream_url: '',
    custom_style: null
  })
  renderInvEvents()
}

// ── STYLE HELPERS (class-based) ──────────────────────────────

function normalizePreset(cs) {
  if (!cs) return ''
  if (typeof cs === 'string') {
    // Old: "gold", "navy" etc. → convert
    if (STYLE_PRESETS[cs]) return cs
    // Already new format class name
    const found = Object.entries(STYLE_PRESETS).find(([k, v]) => v.cssClass === cs)
    return found ? found[0] : ''
  }
  if (typeof cs === 'object') {
    const p = cs.preset || ''
    if (STYLE_PRESETS[p]) return p
    // Old format with flat values: { preset: "gold", bg_color: ... }
    if (['gold','navy','blush','sage','ivory','rose','custom'].includes(p)) return p
  }
  return ''
}

function normalizeOverrides(cs) {
  if (!cs) return {}
  if (typeof cs === 'string') return {}
  if (typeof cs === 'object') {
    // New format: { preset: "...", overrides: { ... } }
    if (cs.overrides) return cs.overrides
    // Old format: { preset: "gold", bg_color: "...", text_color: "...", ... }
    const result = {}
    for (const [k, v] of Object.entries(cs)) {
      if (k !== 'preset' && k !== 'label' && v) result[k] = v
    }
    // Map old font_family to font_class
    if (result.font_family) {
      const fontCls = FONT_OPTIONS.find(f => f.value === result.font_class || f.label?.toLowerCase().includes(result.font_family?.toLowerCase()))
      if (fontCls) result.font_class = fontCls.value
      delete result.font_family
    }
    return result
  }
  return {}
}

export function applyEventPreset(i, presetKey) {
  if (!presetKey) return null
  const currentOverrides = normalizeOverrides(INV.events[i].custom_style)
  const cssClass = STYLE_PRESETS[presetKey]?.cssClass || ''
  if (!cssClass) return Object.keys(currentOverrides).length ? { preset: presetKey, overrides: currentOverrides } : null
  if (Object.keys(currentOverrides).length) {
    return { preset: presetKey, overrides: currentOverrides }
  }
  return { preset: presetKey }
}

export function applyEventFont(i, fontClass) {
  const cs = INV.events[i].custom_style || {}
  const overrides = normalizeOverrides(cs)
  const preset = normalizePreset(cs)
  if (fontClass) overrides.font_class = fontClass
  else delete overrides.font_class
  return preset ? { preset, overrides } : (Object.keys(overrides).length ? { overrides } : null)
}

export function applyEventOverride(i, key, value) {
  const cs = INV.events[i].custom_style || {}
  const preset = normalizePreset(cs)
  const overrides = normalizeOverrides(cs)
  if (value) overrides[key] = value
  else delete overrides[key]
  return preset ? { preset, overrides } : (Object.keys(overrides).length ? { overrides } : null)
}

// ── SECTION STYLES ──────────────────────────────────────────

function renderAllSectionStyles() {
  const containers = {
    gallery:      'inv-style-gallery',
    love_story:   'inv-style-lovestory',
    kado:         'inv-style-kado',
    countdown:    'inv-style-countdown',
    quote_footer: 'inv-style-quote-footer',
    profile:      'inv-style-profile',
  }
  for (const [key, id] of Object.entries(containers)) {
    const el = document.getElementById(id)
    if (el) {
      el.innerHTML = renderSectionStyleBox(key)
    }
  }
}

function renderSectionStyleBox(sectionKey) {
  const cs = (INV.section_styles || {})[sectionKey] || {}
  const currentPreset = normalizePreset(cs)
  const currentOverrides = normalizeOverrides(cs)

  const presetOpts = Object.entries(STYLE_PRESETS).map(([k, v]) =>
    `<option value="${k}" ${currentPreset === k ? 'selected' : ''}>${v.label}</option>`
  ).join('')
  const fontOpts = FONT_OPTIONS.map(f =>
    `<option value="${f.value}" ${currentOverrides.font_class === f.value ? 'selected' : ''}>${f.label}</option>`
  ).join('')

  const label = SECTION_LABELS[sectionKey] || sectionKey.toUpperCase()

  return `
    <div style="border-top:1px dashed rgba(255,255,255,.12);padding-top:12px;margin-top:12px">
      <label style="color:var(--gold);letter-spacing:.1em;font-size:11px">🎨 STYLE ${label.toUpperCase()}</label>
    </div>
    <div><label>Preset</label>
      <select onchange="applySectionPreset('${sectionKey}',this.value)">
        <option value="">— Default Tema —</option>
        ${presetOpts}
      </select>
    </div>
    <div><label>Font</label>
      <select onchange="applySectionFont('${sectionKey}',this.value)">
        <option value="">— Default Tema —</option>
        ${fontOpts}
      </select>
    </div>
    <details style="margin-top:8px">
      <summary style="cursor:pointer;font-size:11px;color:var(--gold);letter-spacing:.05em">⚙ Custom Override</summary>
      <div style="padding:8px 0;display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div><label>Background</label>
          <input type="text" value="${esc(currentOverrides.bg_color || '')}" placeholder="rgba(...) atau #hex"
            oninput="applySectionOverride('${sectionKey}','bg_color',this.value)">
        </div>
        <div><label>Text Color</label>
          <input type="text" value="${esc(currentOverrides.text_color || '')}" placeholder="#hex"
            oninput="applySectionOverride('${sectionKey}','text_color',this.value)">
        </div>
        <div><label>Accent Color</label>
          <input type="text" value="${esc(currentOverrides.accent_color || '')}" placeholder="#hex"
            oninput="applySectionOverride('${sectionKey}','accent_color',this.value)">
        </div>
        <div><label>Border</label>
          <input type="text" value="${esc(currentOverrides.border || '')}" placeholder="1px solid #c9a96e"
            oninput="applySectionOverride('${sectionKey}','border',this.value)">
        </div>
        <div><label>Border Radius</label>
          <input type="text" value="${esc(currentOverrides.border_radius || '')}" placeholder="0px"
            oninput="applySectionOverride('${sectionKey}','border_radius',this.value)">
        </div>
        <div><label>Box Shadow</label>
          <input type="text" value="${esc(currentOverrides.box_shadow || '')}" placeholder="0 4px 20px rgba(0,0,0,0.3)"
            oninput="applySectionOverride('${sectionKey}','box_shadow',this.value)">
        </div>
      </div>
    </details>
  `
}

export function applySectionPreset(sectionKey, presetKey) {
  INV.section_styles = INV.section_styles || {}
  const currentOverrides = normalizeOverrides(INV.section_styles[sectionKey])
  if (!presetKey) {
    INV.section_styles[sectionKey] = Object.keys(currentOverrides).length ? { overrides: currentOverrides } : null
    return
  }
  if (Object.keys(currentOverrides).length) {
    INV.section_styles[sectionKey] = { preset: presetKey, overrides: currentOverrides }
  } else {
    INV.section_styles[sectionKey] = { preset: presetKey }
  }
  renderAllSectionStyles()
}

export function applySectionFont(sectionKey, fontClass) {
  INV.section_styles = INV.section_styles || {}
  const cs = INV.section_styles[sectionKey] || {}
  const preset = normalizePreset(cs)
  const overrides = normalizeOverrides(cs)
  if (fontClass) overrides.font_class = fontClass
  else delete overrides.font_class
  INV.section_styles[sectionKey] = preset ? { preset, overrides } : (Object.keys(overrides).length ? { overrides } : null)
  renderAllSectionStyles()
}

export function applySectionOverride(sectionKey, key, value) {
  INV.section_styles = INV.section_styles || {}
  const cs = INV.section_styles[sectionKey] || {}
  const preset = normalizePreset(cs)
  const overrides = normalizeOverrides(cs)
  if (value) overrides[key] = value
  else delete overrides[key]
  INV.section_styles[sectionKey] = preset ? { preset, overrides } : (Object.keys(overrides).length ? { overrides } : null)
}

export async function saveSectionStyles() {
  const msg = document.getElementById('msg-inv-section-styles')
  try {
    const res = await fetch(`${SB_URL}/rest/v1/invitations?id=eq.${INV.invId}`, {
      method: 'PATCH', headers: authHeaders(),
      body: JSON.stringify({ section_styles: INV.section_styles || null })
    })
    if (!res.ok) throw new Error(await res.text())
    invMsg(msg, 'success', '✓ Style section tersimpan.')
  } catch (e) {
    invMsg(msg, 'error', 'Gagal: ' + e.message)
  }
}

export async function saveInvEvents() {
  const msg = document.getElementById('msg-inv-acara')
  try {
    await fetch(`${SB_URL}/rest/v1/events?invitation_id=eq.${INV.invId}`, {
      method: 'DELETE', headers: authHeaders()
    })
    if (INV.events.length) {
      const res = await fetch(`${SB_URL}/rest/v1/events`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify(INV.events.map((e, i) => ({
          ...e, invitation_id: INV.invId, sort_order: i
        })))
      })
      if (!res.ok) throw new Error(await res.text())
    }
    invMsg(msg, 'success', '✓ Acara tersimpan.')
  } catch (e) {
    invMsg(msg, 'error', 'Gagal: ' + e.message)
  }
}

// ── Kado (bank_accounts) ────────────────────────────────────

export function renderInvBanks() {
  const w = document.getElementById('inv-bank-wrap')
  if (!INV.banks.length) { w.innerHTML = '<div class="state-box">Belum ada rekening.</div>'; return }
  w.innerHTML = INV.banks.map((b, i) => {
    const isQ = b.type === 'qris'
    return `
    <div class="inv-repeater-item">
      <div class="inv-repeater-head">
        <div class="inv-repeater-title">${b.bank_name || (isQ ? 'QRIS' : 'Rekening Baru')}</div>
        <button class="inv-repeater-del" onclick="INV.banks.splice(${i},1);renderInvBanks()">✕</button>
      </div>
      <div class="inv-repeater-body">
        <div><label>Tipe</label>
          <select onchange="INV.banks[${i}].type=this.value;renderInvBanks()">
            <option value="bank" ${b.type === 'bank' ? 'selected' : ''}>Bank</option>
            <option value="qris" ${b.type === 'qris' ? 'selected' : ''}>QRIS</option>
            <option value="ewallet" ${b.type === 'ewallet' ? 'selected' : ''}>E-Wallet</option>
          </select>
        </div>
        <div><label>${isQ ? 'Label' : 'Nama Bank'}</label>
          <input type="text" value="${esc(b.bank_name)}"
            oninput="INV.banks[${i}].bank_name=this.value;this.closest('.inv-repeater-item').querySelector('.inv-repeater-title').textContent=this.value||'${isQ ? 'QRIS' : 'Rekening Baru'}'">
        </div>
        ${isQ ? `
        <div class="span2"><label>Gambar QRIS</label>
          <div class="inv-qris-upload" onclick="document.getElementById('inv-qris-${i}').click()">
            ${b.account_number ? `<img src="${b.account_number}" class="inv-qris-preview">` : '<div class="inv-qris-placeholder">Klik untuk upload gambar QRIS</div>'}
          </div>
          <input type="file" id="inv-qris-${i}" accept="image/*" style="display:none" onchange="uploadInvQris(${i},this.files[0])">
        </div>` : `
        <div><label>Nomor Rekening</label>
          <input type="text" value="${esc(b.account_number)}" oninput="INV.banks[${i}].account_number=this.value">
        </div>
        <div><label>Atas Nama</label>
          <input type="text" value="${esc(b.account_name)}" oninput="INV.banks[${i}].account_name=this.value">
        </div>`}
      </div>
    </div>`
  }).join('')
}

export async function uploadInvQris(i, file) {
  if (!file) return
  try {
    const path = `qris/${INV.invId}/${Date.now()}.${file.name.split('.').pop()}`
    const res  = await fetch(`${SB_URL}/storage/v1/object/gallery-photos/${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${state.accessToken}`,
        'apikey': SB_KEY,
        'Content-Type': file.type
      },
      body: file
    })
    if (!res.ok) throw new Error('Upload gagal')
    INV.banks[i].account_number = `${SB_URL}/storage/v1/object/public/gallery-photos/${path}`
    INV.banks[i].account_name   = ''
    renderInvBanks()
    showToast('✓ QRIS diupload — klik Simpan Kado')
  } catch (e) {
    showToast('Error: ' + e.message)
  }
}

export function addInvBank() {
  INV.banks.push({ type: 'bank', bank_name: '', account_number: '', account_name: '' })
  renderInvBanks()
}

export async function saveInvBank() {
  const msg = document.getElementById('msg-inv-kado')
  try {
    await fetch(`${SB_URL}/rest/v1/bank_accounts?invitation_id=eq.${INV.invId}`, {
      method: 'DELETE', headers: authHeaders()
    })
    if (INV.banks.length) {
      const res = await fetch(`${SB_URL}/rest/v1/bank_accounts`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify(INV.banks.map((b, i) => ({
          ...b, invitation_id: INV.invId, sort_order: i
        })))
      })
      if (!res.ok) throw new Error(await res.text())
    }
    invMsg(msg, 'success', '✓ Kado tersimpan.')
  } catch (e) {
    invMsg(msg, 'error', 'Gagal: ' + e.message)
  }
}

// ── Love Story ───────────────────────────────────────────────

export function renderInvLoves() {
  const w = document.getElementById('inv-love-wrap')
  if (!INV.loves.length) { w.innerHTML = '<div class="state-box">Belum ada momen.</div>'; return }
  w.innerHTML = INV.loves.map((s, i) => {
    const opts = INV_MONTHS.map((n, idx) => {
      const v = String(idx + 1).padStart(2, '0')
      return `<option value="${v}" ${s._m === v ? 'selected' : ''}>${n}</option>`
    }).join('')
    return `
    <div class="inv-repeater-item">
      <div class="inv-repeater-head">
        <div class="inv-repeater-title">${s.title || 'Momen Baru'}</div>
        <button class="inv-repeater-del" onclick="INV.loves.splice(${i},1);renderInvLoves()">✕</button>
      </div>
      <div class="inv-repeater-body">
        <div><label>Bulan</label>
          <select onchange="INV.loves[${i}]._m=this.value">
            <option value="">— Pilih Bulan —</option>${opts}
          </select>
        </div>
        <div><label>Tahun</label>
          <input type="number" min="1900" max="2100" value="${s._y || ''}" oninput="INV.loves[${i}]._y=this.value">
        </div>
        <div class="span2"><label>Judul Momen</label>
          <input type="text" value="${esc(s.title)}"
            oninput="INV.loves[${i}].title=this.value;this.closest('.inv-repeater-item').querySelector('.inv-repeater-title').textContent=this.value||'Momen Baru'">
        </div>
        <div class="span2"><label>Deskripsi</label>
          <textarea rows="3" oninput="INV.loves[${i}].description=this.value">${escH(s.description)}</textarea>
        </div>
      </div>
    </div>`
  }).join('')
}

export function addInvLove() {
  INV.loves.push({ _y: '', _m: '', title: '', description: '' })
  renderInvLoves()
}

export async function saveInvLove() {
  const msg = document.getElementById('msg-inv-lovestory')
  try {
    const payload = INV.loves.map((s, i) => ({
      invitation_id: INV.invId,
      event_date: (s._y && s._m) ? `${String(s._y).padStart(4, '0')}-${s._m}-01` : null,
      title: s.title || '',
      description: s.description || '',
      sort_order: i
    }))
    await fetch(`${SB_URL}/rest/v1/love_stories?invitation_id=eq.${INV.invId}`, {
      method: 'DELETE', headers: authHeaders()
    })
    if (payload.length) {
      const res = await fetch(`${SB_URL}/rest/v1/love_stories`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error(await res.text())
    }
    invMsg(msg, 'success', '✓ Love story tersimpan.')
  } catch (e) {
    invMsg(msg, 'error', 'Gagal: ' + e.message)
  }
}

// ── Galeri ───────────────────────────────────────────────────

export function renderInvGallery() {
  const grid  = document.getElementById('inv-gal-grid')
  const count = document.getElementById('inv-gal-count')
  const hint  = document.getElementById('inv-gal-hint')
  count.textContent = `${INV.gallery.length} foto · maks 30`
  hint.style.display = INV.gallery.length ? 'none' : 'block'
  grid.innerHTML = INV.gallery.map((g, i) => `
    <div class="inv-gallery-item">
      <img src="${g.url}" loading="lazy">
      <div class="inv-gallery-overlay">
        <button class="inv-gallery-btn-cover ${g.is_cover ? 'is-cover' : ''}"
          onclick="event.stopPropagation();INV.gallery.forEach((x,j)=>x.is_cover=j===${i});renderInvGallery();saveInvGallery()">
          ${g.is_cover ? '★ Cover' : '☆ Cover'}
        </button>
        <button class="inv-gallery-btn-del"
          onclick="event.stopPropagation();if(confirm('Hapus foto?')){INV.gallery.splice(${i},1);renderInvGallery();saveInvGallery()}">✕</button>
      </div>
      ${g.is_cover ? '<div class="inv-gallery-cover-badge">COVER</div>' : ''}
    </div>`).join('')
}

export async function uploadInvGallery(files) {
  const msg = document.getElementById('msg-inv-galeri')
  if (!files || !files.length) return
  if (INV.gallery.length + files.length > 30) {
    invMsg(msg, 'error', `Maks 30 foto. Sudah ada ${INV.gallery.length}.`)
    return
  }
  for (const file of files) {
    try {
      const path = `${INV.invId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${file.name.split('.').pop()}`
      const res  = await fetch(`${SB_URL}/storage/v1/object/gallery-photos/${path}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${state.accessToken}`,
          'apikey': SB_KEY,
          'Content-Type': file.type
        },
        body: file
      })
      if (!res.ok) { console.error('Upload gagal:', file.name); continue }
      INV.gallery.push({
        url: `${SB_URL}/storage/v1/object/public/gallery-photos/${path}`,
        caption: '',
        is_cover: INV.gallery.length === 0
      })
    } catch (e) {
      console.error(e)
    }
  }
  renderInvGallery()
  await saveInvGallery()
  showToast('✓ Foto diupload')
}

export async function saveInvGallery() {
  try {
    await fetch(`${SB_URL}/rest/v1/galleries?invitation_id=eq.${INV.invId}`, {
      method: 'DELETE', headers: authHeaders()
    })
    if (INV.gallery.length) {
      await fetch(`${SB_URL}/rest/v1/galleries`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify(INV.gallery.map((g, i) => ({
          invitation_id: INV.invId,
          file_url: g.url,
          caption: g.caption || '',
          is_cover: g.is_cover,
          sort_order: i
        })))
      })
    }
  } catch (e) {
    console.error('[saveInvGallery]', e.message)
  }
}
