// ================================================================
// auth.js — Login, logout, session check
// ================================================================

import { state } from './state.js'
import { SB_URL, SB_KEY, SESSION_KEY } from './api.js'
import { loadData } from './clients.js'

export function checkSession() {
  try {
    const saved = localStorage.getItem(SESSION_KEY)
    if (!saved) return
    const session = JSON.parse(saved)
    if (!session.access_token || !session.expires_at) return
    if (Date.now() > session.expires_at) {
      localStorage.removeItem(SESSION_KEY)
      return
    }
    state.accessToken = session.access_token
    document.getElementById('admin-email').textContent        = session.email
    document.getElementById('login-screen').style.display     = 'none'
    document.getElementById('dashboard-screen').style.display = 'block'
    loadData()
  } catch (e) {
    localStorage.removeItem(SESSION_KEY)
  }
}

export async function doLogin() {
  const email    = document.getElementById('login-email').value.trim()
  const password = document.getElementById('login-password').value
  const btn      = document.getElementById('login-btn')
  const msg      = document.getElementById('login-msg')
  if (!email || !password) return
  btn.disabled = true
  btn.textContent = 'Memverifikasi...'
  msg.style.display = 'none'
  try {
    const res  = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SB_KEY },
      body: JSON.stringify({ email, password })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error_description || data.msg || 'Email atau password salah')
    state.accessToken = data.access_token
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      access_token: data.access_token,
      email,
      expires_at: Date.now() + (data.expires_in * 1000)
    }))
    document.getElementById('admin-email').textContent        = email
    document.getElementById('login-screen').style.display     = 'none'
    document.getElementById('dashboard-screen').style.display = 'block'
    loadData()
  } catch (e) {
    msg.className   = 'login-msg error'
    msg.textContent = '✗ ' + e.message
    msg.style.display = 'block'
    btn.disabled    = false
    btn.textContent = 'Masuk →'
  }
}

export function doLogout() {
  state.accessToken = null
  state.clients = []
  state.rsvpAll = []
  localStorage.removeItem(SESSION_KEY)
  document.getElementById('login-screen').style.display     = 'flex'
  document.getElementById('dashboard-screen').style.display = 'none'
  document.getElementById('login-email').value       = ''
  document.getElementById('login-password').value     = ''
  document.getElementById('login-btn').disabled       = false
  document.getElementById('login-btn').textContent    = 'Masuk →'
  document.getElementById('login-msg').style.display  = 'none'
}
