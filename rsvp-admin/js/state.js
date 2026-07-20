// ================================================================
// state.js — Shared mutable state
// All mutable values live in a single object so all importers
// always see the current value (ES module live binding to the
// object reference stays stable; property reads are always fresh).
// ================================================================

export const state = {
  accessToken: null,
  clients: [],
  rsvpAll: [],
  currentClientId: null,
  currentDetailData: [],
  filteredDetailData: [],
  deleteTargetId: null
}

// ── Invitation editor state (object reference — always live) ──
export const INV = {
  clientId: null,
  invId: null,
  events: [],
  banks: [],
  loves: [],
  gallery: [],
  section_styles: null
}

export const INV_MONTHS = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember'
]

export const INV_FIELDS = [
  'bride_name','bride_nickname','bride_father','bride_mother','bride_instagram',
  'groom_name','groom_nickname','groom_father','groom_mother','groom_instagram',
  'quote','hashtag'
]
