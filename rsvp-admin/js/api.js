// ================================================================
// api.js — Constants, auth headers, generic fetch helpers
// ================================================================

import { state } from './state.js'
import { SB_URL, SB_KEY, PUBLIC_DOMAIN, FONNTE_API } from './env.js'

export { SB_URL, SB_KEY, PUBLIC_DOMAIN, FONNTE_API }
export const SESSION_KEY = 'rsvp_admin_session'

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
