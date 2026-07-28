// ================================================================
// rsvp-widget.js — RSVP Form + QR Code + Komentar
// Widget terpisah dari invitation-loader.js
// Dipanggil setelah event 'nikahin:loaded' di-dispatch
// ================================================================

;(function() {
  'use strict'

  const SB_URL  = window.__ENV?.SUPABASE_URL  || ''
  const SB_KEY  = window.__ENV?.SUPABASE_KEY  || ''
  const SB_HDR  = {
    'apikey': SB_KEY,
    'Authorization': `Bearer ${SB_KEY}`,
    'Content-Type': 'application/json',
  }

  // ── STATE ──────────────────────────────────────────────────────
  let _clientId      = null
  let _invitationId  = null
  let _guestId       = null
  let _guestName     = 'Tamu Undangan'
  let _rsvpData      = null
  let _qrToken       = null
  let _selectedStatus = 'Hadir'

  // ── HELPERS ────────────────────────────────────────────────────
  function escHtml(s) {
    return String(s || '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
  }

  function $(id) { return document.getElementById(id) }

  async function sbFetch(path, params) {
    const res = await fetch(`${SB_URL}/rest/v1/${path}${params}`, { headers: SB_HDR })
    if (!res.ok) throw new Error(`Supabase error: ${res.status}`)
    return res.json()
  }

  async function sbPost(path, body, returnJson) {
    const opts = {
      method: 'POST',
      headers: { ...SB_HDR, 'Prefer': returnJson ? 'return=representation' : 'return=minimal' },
      body: JSON.stringify(body)
    }
    const res = await fetch(`${SB_URL}/rest/v1/${path}`, opts)
    if (!res.ok) throw new Error(`Supabase error: ${res.status}`)
    return returnJson ? res.json() : true
  }

  function generateToken() {
    const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    return Array.from({length:10}, () => c[Math.floor(Math.random()*c.length)]).join('')
  }

  function showEl(id) { const el = $(id); if (el) el.style.display = '' }
  function hideEl(id) { const el = $(id); if (el) el.style.display = 'none' }
  function showBlock(id) { const el = $(id); if (el) el.style.display = 'block' }
  function showFlex(id) { const el = $(id); if (el) el.style.display = 'flex' }

  // ── LOADING ────────────────────────────────────────────────────
  function showLoading() { showBlock('rsvpLoading'); hideEl('rsvpFormBody'); hideEl('rsvpDone'); hideEl('qrScreen') }
  function hideLoading() { hideEl('rsvpLoading') }

  // ── KEPADA BANNER ──────────────────────────────────────────────
  function showKepadaBanner(nama) {
    const el = $('kepadaNama')
    if (el) el.textContent = nama
    showFlex('kepadaBanner')
  }

  // ── PRE-FILL FORM ──────────────────────────────────────────────
  function prefillForm(nama) {
    const fields = ['rsvpName', 'komentarNama']
    fields.forEach(id => {
      const el = $(id)
      if (!el) return
      el.value = nama
      el.readOnly = true
      el.style.opacity = '0.7'
      el.style.cursor = 'default'
    })
  }

  // ── SHOW FORM / DONE / QR ─────────────────────────────────────
  function showForm() {
    hideEl('rsvpLoading')
    showBlock('rsvpFormBody')
    hideEl('rsvpDone')
    hideEl('qrScreen')
  }

  function showRsvpDone(status) {
    hideEl('rsvpLoading')
    hideEl('rsvpFormBody')
    showBlock('rsvpDone')
    hideEl('qrScreen')

    const statusEl = $('rsvpDoneStatus')
    if (statusEl) {
      statusEl.textContent = status === 'Hadir'
        ? '✓ Anda konfirmasi akan hadir'
        : '✓ Anda konfirmasi tidak hadir'
    }
  }

  // ── QR CODE ────────────────────────────────────────────────────
  window.RsvpWidget = window.RsvpWidget || {}

  RsvpWidget.showQR = function() {
    const token = _qrToken || _rsvpData?.qr_token
    if (!token) return

    hideEl('rsvpDone')
    showBlock('qrScreen')

    const namaEl = $('qrNamaVal')
    if (namaEl) namaEl.textContent = _guestName

    const tokenEl = $('qrTokenVal')
    if (tokenEl) tokenEl.textContent = token

    const qrEl = $('qrCode')
    if (qrEl && !qrEl.innerHTML && typeof QRCode !== 'undefined') {
      new QRCode(qrEl, {
        text: token,
        width: 200,
        height: 200,
        colorDark: '#1A1614',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
      })
    }
  }

  RsvpWidget.saveQR = function() {
    const canvas = document.querySelector('#qrCode canvas')
    if (!canvas) { alert('QR belum siap'); return }

    const nama  = $('qrNamaVal')?.textContent || _guestName
    const token = $('qrTokenVal')?.textContent || ''
    const pad = 20
    const nc = document.createElement('canvas')
    nc.width  = canvas.width  + pad * 2
    nc.height = canvas.height + pad * 2 + 56
    const ctx = nc.getContext('2d')

    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, nc.width, nc.height)
    ctx.drawImage(canvas, pad, pad)

    ctx.textAlign = 'center'
    ctx.fillStyle = '#C9A96E'
    ctx.font = '11px serif'
    ctx.fillText('✦ Tiket Kehadiran ✦', nc.width/2, canvas.height + pad + 18)

    ctx.fillStyle = '#1A1614'
    ctx.font = 'bold 14px sans-serif'
    ctx.fillText(nama, nc.width/2, canvas.height + pad + 36)

    ctx.fillStyle = '#6B5E52'
    ctx.font = '11px monospace'
    ctx.fillText(token, nc.width/2, canvas.height + pad + 52)

    const a = document.createElement('a')
    a.href = nc.toDataURL('image/png')
    a.download = `QR_RSVP_${nama.replace(/\s+/g,'_')}.png`
    a.click()
  }

  // ── SELECT STATUS ──────────────────────────────────────────────
  RsvpWidget.selectStatus = function(el, status) {
    document.querySelectorAll('.radio-option').forEach(o => o.classList.remove('selected'))
    el.classList.add('selected')
    _selectedStatus = status

    const jumlahGroup = $('jumlahGroup')
    if (jumlahGroup) {
      jumlahGroup.style.display = status === 'Tidak Hadir' ? 'none' : 'block'
    }
  }

  // ── SUBMIT RSVP ────────────────────────────────────────────────
  RsvpWidget.submitRSVP = async function() {
    const name   = $('rsvpName')?.value?.trim()
    const status = _selectedStatus
    const phone  = $('rsvpTelpon')?.value?.trim() || ''
    const wishes = $('rsvpWishes')?.value?.trim() || ''
    const errEl  = $('rsvpError')
    const btn    = $('rsvpSubmitBtn')

    if (!name)   { if (errEl) errEl.textContent = 'Nama wajib diisi.'; return }
    if (!status) { if (errEl) errEl.textContent = 'Pilih status kehadiran.'; return }
    if (errEl)   errEl.textContent = ''

    if (btn) { btn.disabled = true; btn.textContent = 'Mengirim...' }

    _qrToken = generateToken()

    try {
      const payload = {
        client_id: _clientId,
        tamu_id:   _guestId,
        nama:      name,
        kehadiran: status,
        telpon:    phone,
        pesan:     wishes,
        qr_token:  _qrToken,
        status_hadir: false
      }

      const data = await sbPost('rsvp_tamu', payload, true)
      _rsvpData = Array.isArray(data) ? data[0] : data

      showRsvpDone(status)
      RsvpWidget.showQR()
    } catch(e) {
      if (errEl) errEl.textContent = 'Gagal mengirim, coba lagi.'
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Kirim' }
    }
  }

  // ── KOMENTAR ───────────────────────────────────────────────────
  async function loadKomentar() {
    const list = $('ucapanList')
    if (!list || !_clientId) return

    try {
      const data = await sbFetch('komentar',
        `?client_id=eq.${_clientId}&order=created_at.desc&limit=30&select=nama,isi,created_at`)
      renderKomentar(data)
    } catch(e) {
      list.innerHTML = '<p style="text-align:center;opacity:.5;font-size:13px">Gagal memuat ucapan.</p>'
    }
  }

  function renderKomentar(list) {
    const el = $('ucapanList')
    if (!el) return

    if (!list.length) {
      el.innerHTML = '<p style="text-align:center;opacity:.5;font-size:13px">Belum ada ucapan. Jadilah yang pertama!</p>'
      return
    }

    el.innerHTML = list.map(k => {
      const time = new Date(k.created_at).toLocaleDateString('id-ID',
        { day:'2-digit', month:'long', year:'numeric' })
      return `
        <div class="ucapan-item fade-in-up-dreamy">
          <p class="ucapan-name">${escHtml(k.nama)}</p>
          <p class="ucapan-text">"${escHtml(k.isi)}"</p>
          <p class="ucapan-time" style="font-size:10px;opacity:.5;margin-top:4px">${time}</p>
        </div>`
    }).join('')
  }

  RsvpWidget.submitKomentar = async function() {
    const nama = $('komentarNama')?.value?.trim()
    const isi  = $('komentarIsi')?.value?.trim()
    const btn  = $('komentarBtn')
    const errEl = $('komentarError')

    if (!nama || !isi) {
      if (errEl) errEl.textContent = 'Nama dan ucapan wajib diisi.'
      return
    }
    if (errEl) errEl.textContent = ''

    if (btn) { btn.disabled = true; btn.textContent = 'Mengirim...' }

    try {
      await sbPost('komentar', {
        client_id: _clientId,
        nama:      nama,
        isi:       isi,
      })

      $('komentarIsi').value = ''
      if (btn) btn.textContent = '✓ Terkirim!'
      loadKomentar()
      setTimeout(() => { if (btn) { btn.disabled = false; btn.textContent = 'Kirim Ucapan' } }, 2000)
    } catch(e) {
      if (errEl) errEl.textContent = 'Gagal mengirim.'
      if (btn) { btn.disabled = false; btn.textContent = 'Kirim Ucapan' }
    }
  }

  // ── INIT ───────────────────────────────────────────────────────
  async function init() {
    _clientId     = window._nikahinClientId
    _invitationId = window._nikahinInvitationId
    _guestId      = window._guestId
    _guestName    = window._guestName || 'Tamu Undangan'

    console.log('[rsvp-widget] init:', { _clientId, _guestId, _guestName })

    if (_guestId) {
      showLoading()

      try {
        const [tamuRows, rsvpRows] = await Promise.all([
          sbFetch('tamu_undangan', `?id=eq.${encodeURIComponent(_guestId)}&select=nama`),
          sbFetch('rsvp_tamu', `?tamu_id=eq.${encodeURIComponent(_guestId)}&select=*`)
        ])

        if (tamuRows?.length && tamuRows[0].nama) {
          _guestName = tamuRows[0].nama
          showKepadaBanner(_guestName)
          prefillForm(_guestName)

          // Broadcast nama ke elemen lain
          document.dispatchEvent(new CustomEvent('tamuLoaded', { detail: { nama: _guestName } }))
        }

        // Cek sudah RSVP
        if (rsvpRows?.length) {
          _rsvpData = rsvpRows[0]
          _qrToken  = _rsvpData.qr_token
          showRsvpDone(_rsvpData.kehadiran)
          hideLoading()
          loadKomentar()
          return
        }
      } catch(e) {
        console.error('[rsvp-widget] error resolving tamu:', e)
      }

      hideLoading()
    }

    showForm()
    loadKomentar()
  }

  // ── LISTEN FOR LOADER ──────────────────────────────────────────
  document.addEventListener('nikahin:loaded', () => {
    console.log('[rsvp-widget] nikahin:loaded received, initializing...')
    init()
  })

  // ── FALLBACK: if event already fired before widget loaded ──────
  if (window._nikahinClientId) {
    console.log('[rsvp-widget] loader already done, init now')
    init()
  }

})()
