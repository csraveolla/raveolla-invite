// ================================================================
// detail.js — Detail RSVP view per client
// ================================================================

import { state } from './state.js'
import { SB_URL, authHeaders } from './api.js'
import { showToast } from './utils.js'
import { doLogout } from './auth.js'

// ── Navigation ────────────────────────────────────────────────
export function openDetail(clientId, namaAcara) {
  state.currentClientId = clientId
  document.getElementById('detail-acara').textContent         = namaAcara
  document.getElementById('dashboard-screen').style.display   = 'none'
  document.getElementById('detail-screen').style.display      = 'block'
  loadDetail(clientId)
}

export function backToMain() {
  document.getElementById('detail-screen').style.display    = 'none'
  document.getElementById('dashboard-screen').style.display = 'block'
  state.currentClientId = null
}

// ── Load detail data ──────────────────────────────────────────
export async function loadDetail(clientId) {
  document.getElementById('detail-table').innerHTML =
    '<div class="state-box"><div class="spinner"></div>Memuat...</div>'
  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/rsvp_tamu?client_id=eq.${clientId}&select=*&order=created_at.desc`,
      { headers: authHeaders() }
    )
    if (res.status === 401) { doLogout(); return }
    const data = await res.json()
    if (!Array.isArray(data)) throw new Error('Gagal memuat')
    state.currentDetailData = data
    document.getElementById('ds-total').textContent   = data.length
    document.getElementById('ds-hadir').textContent   = data.filter(d => d.kehadiran === 'Hadir').length
    document.getElementById('ds-tidak').textContent   = data.filter(d => d.kehadiran === 'Tidak Hadir').length
    document.getElementById('ds-checkin').textContent = data.filter(d => d.status_hadir === true).length
    renderDetailTable()
  } catch (e) {
    document.getElementById('detail-table').innerHTML =
      `<div class="state-box">Error: ${e.message}</div>`
  }
}

// ── Filter ────────────────────────────────────────────────────
export function filterDetail() {
  const cari      = (document.getElementById('f-detail-cari')?.value || '').toLowerCase()
  const kehadiran = document.getElementById('f-detail-kehadiran')?.value || ''
  const checkin   = document.getElementById('f-detail-checkin')?.value || ''
  const filtered = state.currentDetailData.filter(d => {
    if (cari && !d.nama?.toLowerCase().includes(cari) && !(d.telpon || '').includes(cari)) return false
    if (kehadiran && d.kehadiran !== kehadiran) return false
    if (checkin === 'sudah' && !d.status_hadir) return false
    if (checkin === 'belum' && d.status_hadir)  return false
    return true
  })
  state.filteredDetailData = filtered
  _renderDetail(filtered)
}

// ── Render ────────────────────────────────────────────────────
export function renderDetailTable() {
  state.filteredDetailData = [...state.currentDetailData]
  _renderDetail(state.currentDetailData)
}

function _renderDetail(data) {
  if (!state.currentDetailData.length) {
    document.getElementById('detail-table').innerHTML =
      '<div class="state-box">Belum ada data RSVP.</div>'
    return
  }
  if (!data.length) {
    document.getElementById('detail-table').innerHTML =
      '<div class="state-box">Tidak ada data sesuai filter.</div>'
    return
  }
  let html = `<table><thead><tr>
    <th>#</th><th>Pos</th><th>Nama</th><th>Telpon</th><th>RSVP</th>
    <th>Check-in</th><th>Waktu Check-in</th><th>Waktu RSVP</th><th>Aksi</th>
  </tr></thead><tbody>`
  data.forEach((d, i) => {
    const rsvpClass    = d.kehadiran === 'Hadir' ? 'chip-green' : 'chip-red'
    const checkinChip  = d.status_hadir
      ? '<span class="chip chip-green">✓ Hadir</span>'
      : '<span class="chip chip-grey">Belum</span>'
    const waktuCheckin = d.waktu_hadir
      ? new Date(d.waktu_hadir).toLocaleString('id-ID', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })
      : '—'
    const waktuRsvp = new Date(d.created_at).toLocaleString('id-ID', {
      day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'
    })
    html += `<tr>
      <td style="color:var(--text-muted);font-size:11px">${i + 1}</td>
      <td><span style="font-family:monospace;font-size:11px;color:var(--text-muted)">${d.pos_id || '—'}</span></td>
      <td><strong style="font-weight:500">${d.nama || '—'}</strong></td>
      <td style="font-family:monospace;font-size:12px">${d.telpon || '—'}</td>
      <td><span class="chip ${rsvpClass}">${d.kehadiran || '—'}</span></td>
      <td>${checkinChip}</td>
      <td style="font-size:12px;color:var(--text-muted)">${waktuCheckin}</td>
      <td style="font-size:12px;color:var(--text-muted)">${waktuRsvp}</td>
      <td><button class="btn btn-sm btn-danger" onclick="openDeleteModal('${d.id}','${(d.nama || '').replace(/'/g, "\\'")}')">Hapus</button></td>
    </tr>`
  })
  html += '</tbody></table>'
  document.getElementById('detail-table').innerHTML = html
}

// ── Export CSV ────────────────────────────────────────────────
export function exportDetailCSV() {
  if (!state.currentDetailData.length) { alert('Tidak ada data.'); return }
  const headers = ['No','Pos','Nama','Telpon','RSVP','Check-in','Waktu Check-in','Waktu RSVP']
  const rows = state.currentDetailData.map((d, i) => [
    i + 1, d.pos_id, d.nama, d.telpon, d.kehadiran,
    d.status_hadir ? 'Hadir' : 'Belum',
    d.waktu_hadir ? new Date(d.waktu_hadir).toLocaleString('id-ID') : '',
    new Date(d.created_at).toLocaleString('id-ID')
  ])
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
  const a = document.createElement('a')
  a.href = window.URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }))
  a.download = `RSVP_Detail_${document.getElementById('detail-acara').textContent.replace(/\s+/g, '_')}.csv`
  a.click()
}
