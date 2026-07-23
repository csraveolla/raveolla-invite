// ================================================================
// main.js — Entry Point
// Import semua module, jalankan session check, expose ke window.*
// supaya onclick="..." di HTML tetap berfungsi.
// ================================================================

import { state, INV } from './state.js'
import { SB_URL, authHeaders } from './api.js'

// ── Auth ──────────────────────────────────────────────────────
import { checkSession, doLogin, doLogout } from './auth.js'

// ── Clients ───────────────────────────────────────────────────
import {
  loadData, renderTable, filterClients,
  tambahClient, generateToken,
  openEditClient, simpanEditClient,
  setEcWaMode, ecUpdateMaxFromPaket,
  setWaMode, closeModal
} from './clients.js'

// ── Detail ────────────────────────────────────────────────────
import {
  openDetail, backToMain, loadDetail,
  filterDetail, renderDetailTable, exportDetailCSV
} from './detail.js'

// ── Settings ──────────────────────────────────────────────────
import {
  switchAdminTab, simpanSettingAdmin, simpanProvider,
  toggleCustomUrl, testWA,
  renderWaClientTable, updateWaMode,
  openEditWaModal, simpanWaClient, previewMedia
} from './settings.js'

// ── Invitation ────────────────────────────────────────────────
import {
  openInvitation, backFromInvitation, switchInvTab,
  saveInvSettings, createBlankInvitation, togglePublish,
  uploadInvPhoto, saveInvMempelai,
  renderInvEvents, tUpd, addInvEvent, saveInvEvents,
  renderInvBanks, uploadInvQris, addInvBank, saveInvBank,
  renderInvLoves, addInvLove, saveInvLove,
  renderInvGallery, uploadInvGallery, saveInvGallery
} from './invitation.js'

// ── Utils ─────────────────────────────────────────────────────
import {
  showToast, showMsg, invMsg,
  copyText, esc, escH,
  toggleApiKey, toggleTheme, initDarkMode,
  exportClient
} from './utils.js'

// ================================================================
// Expose semua ke window supaya onclick="..." di HTML berfungsi
// ================================================================

// Auth
window.doLogin  = doLogin
window.doLogout = doLogout

// Clients
window.loadData       = loadData
window.renderTable    = renderTable
window.filterClients  = filterClients
window.tambahClient   = tambahClient
window.generateToken  = generateToken
window.openEditClient = openEditClient
window.simpanEditClient = simpanEditClient
window.setEcWaMode    = setEcWaMode
window.ecUpdateMaxFromPaket = ecUpdateMaxFromPaket
window.setWaMode      = setWaMode

// Detail
window.openDetail      = openDetail
window.backToMain      = backToMain
window.loadDetail      = loadDetail
window.filterDetail    = filterDetail
window.renderDetailTable = renderDetailTable
window.exportDetailCSV = exportDetailCSV

// Settings
window.switchAdminTab      = switchAdminTab
window.simpanSettingAdmin  = simpanSettingAdmin
window.simpanProvider      = simpanProvider
window.toggleCustomUrl     = toggleCustomUrl
window.testWA              = testWA
window.renderWaClientTable = renderWaClientTable
window.updateWaMode        = updateWaMode
window.openEditWaModal     = openEditWaModal
window.simpanWaClient      = simpanWaClient
window.previewMedia        = previewMedia

// Invitation
window.openInvitation       = openInvitation
window.backFromInvitation   = backFromInvitation
window.switchInvTab         = switchInvTab
window.saveInvSettings      = saveInvSettings
window.togglePublish        = togglePublish
window.createBlankInvitation = createBlankInvitation
window.uploadInvPhoto       = uploadInvPhoto
window.saveInvMempelai      = saveInvMempelai
window.renderInvEvents      = renderInvEvents
window.tUpd                 = tUpd
window.addInvEvent          = addInvEvent
window.saveInvEvents        = saveInvEvents
window.renderInvBanks       = renderInvBanks
window.uploadInvQris        = uploadInvQris
window.addInvBank           = addInvBank
window.saveInvBank          = saveInvBank
window.renderInvLoves       = renderInvLoves
window.addInvLove           = addInvLove
window.saveInvLove          = saveInvLove
window.renderInvGallery     = renderInvGallery
window.uploadInvGallery     = uploadInvGallery
window.saveInvGallery       = saveInvGallery

// Utils
window.showToast    = showToast
window.showMsg      = showMsg
window.copyText     = copyText
window.toggleApiKey = toggleApiKey
window.toggleTheme  = toggleTheme
window.exportClient = exportClient
window.openDeleteModal = openDeleteModal
window.closeModal   = closeModal
window.confirmDelete = confirmDelete

// INV object — inline handlers mutate this directly (e.g. INV.events.splice(...))
window.INV = INV

// ================================================================
// Delete modal
// ================================================================

function openDeleteModal(id, nama) {
  state.deleteTargetId = id
  document.getElementById('modal-msg').textContent =
    `Data tamu "${nama}" akan dihapus permanen.`
  document.getElementById('modal-delete').classList.add('show')
}

async function confirmDelete() {
  if (!state.deleteTargetId) return
  closeModal()
  try {
    const res = await fetch(`${SB_URL}/rest/v1/rsvp_tamu?id=eq.${state.deleteTargetId}`, {
      method: 'DELETE', headers: authHeaders()
    })
    if (res.ok) {
      showToast('Data berhasil dihapus')
      loadDetail(state.currentClientId)
    } else {
      throw new Error('Gagal menghapus')
    }
  } catch (e) {
    showToast('Error: ' + e.message)
  }
}

// ================================================================
// Init
// ================================================================
initDarkMode()
checkSession()

window.addEventListener('load', () => {
  if (typeof feather !== 'undefined') feather.replace()
})
