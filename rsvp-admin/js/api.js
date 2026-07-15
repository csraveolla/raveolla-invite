// ================================================================
// api.js — Constants, auth headers, generic fetch helpers
// ================================================================

import { state } from './state.js'

const E = window.__ENV || {}
export const SB_URL        = E.SUPABASE_URL  || ''
export const SB_KEY        = E.SUPABASE_KEY  || ''
export const PUBLIC_DOMAIN = E.PUBLIC_DOMAIN || ''
export const FONNTE_API    = E.FONNTE_API    || ''
export const SESSION_KEY   = 'rsvp_admin_session'

export function authHeaders() {
  return {
    'apikey': SB_KEY,
    'Authorization': `Bearer ${state.accessToken}`,
    'Content-Type': 'application/json'
  }
}

export async function upsertSetting(id, value) {
  const res = await fetch(`${SB_URL}/rest/v1/admin_settings`, {
    method: 'POST',
    headers: {
      'apikey': SB_KEY,
      'Authorization': `Bearer ${state.accessToken}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates,return=minimal'
    },
    body: JSON.stringify({ id, value })
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`HTTP ${res.status}: ${err}`)
  }
}
