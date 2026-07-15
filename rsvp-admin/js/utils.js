// ================================================================
// utils.js — Pure helpers: toast, msg, clipboard, escape, etc.
// ================================================================

import { state } from './state.js'
import { SB_URL, SB_KEY, authHeaders } from './api.js'

// ── Toast ─────────────────────────────────────────────────────
export function showToast(text) {
  const t = document.getElementById('toast')
  if (!t) return
  t.textContent = text
  t.classList.add('show')
  setTimeout(() => t.classList.remove('show'), 2500)
}

// ── Inline message ────────────────────────────────────────────
export function showMsg(el, type, text) {
  if (!el) return
  el.className = 'msg ' + type
  el.textContent = text
  el.style.display = 'block'
  setTimeout(() => { el.style.display = 'none' }, 6000)
}

// ── Invitation inline message ─────────────────────────────────
export function invMsg(el, type, text) {
  if (!el) return
  el.className = 'msg ' + type
  el.textContent = text
  el.style.display = 'block'
  if (type === 'success') setTimeout(() => { el.style.display = 'none' }, 4000)
}

// ── Clipboard ─────────────────────────────────────────────────
export function copyText(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = '✓'
    btn.classList.add('copied')
    showToast('Berhasil disalin!')
    setTimeout(() => {
      btn.textContent = '⎘'
      btn.classList.remove('copied')
    }, 2000)
  })
}

// ── Escape helpers ────────────────────────────────────────────
export function esc(s) {
  return String(s ?? '').replace(/"/g, '&quot;')
}

export function escH(s) {
  return String(s ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ── Toggle API key visibility ─────────────────────────────────
export function toggleApiKey(id) {
  const el = document.getElementById(id)
  if (!el) return
  el.type = el.type === 'password' ? 'text' : 'password'
}

// ── Dark mode ─────────────────────────────────────────────────
export function toggleTheme() {
  const isDark = document.body.getAttribute('data-theme') === 'dark'
  document.body.setAttribute('data-theme', isDark ? '' : 'dark')
  localStorage.setItem('rsvp_admin_theme', isDark ? 'light' : 'dark')
}

export function initDarkMode() {
  const saved = localStorage.getItem('rsvp_admin_theme')
  if (saved === 'dark') document.body.setAttribute('data-theme', 'dark')
}

// ── Export CSV per client ─────────────────────────────────────
export function exportClient(clientId, nama) {
  const data = state.rsvpAll.filter(r => r.client_id === clientId)
  if (!data.length) { alert('Belum ada data RSVP untuk client ini.'); return }
  const headers = ['No','Pos','Nama','Telpon','Kehadiran','Pesan','Waktu']
  const rows = data.map((d, i) => [
    i + 1, d.pos_id, d.nama, d.telpon, d.kehadiran,
    (d.pesan || '').replace(/,/g, ';'),
    new Date(d.created_at).toLocaleString('id-ID')
  ])
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
  const a = document.createElement('a')
  a.href = window.URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }))
  a.download = `RSVP_${nama.replace(/\s+/g, '_')}.csv`
  a.click()
}
