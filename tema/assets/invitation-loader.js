// ================================================================
// invitation-loader.js — Data Loader untuk Semua Tema Undangan
// Mengambil data dari Supabase berdasarkan slug di URL,
// lalu mengisi elemen HTML tema dengan data nyata.
//
// Style system: CSS class-based via style-presets.css
//   - Preset: style-gold, style-navy, style-blush, style-sage, style-ivory, style-rose
//   - Font: font-playfair, font-cormorant, font-greatvibes, font-poppins, font-lato
//   - Override: CSS custom properties (--override-bg, --override-text, --override-accent, etc.)
// ================================================================

;(function() {
  'use strict'

  // ── CONFIG ─────────────────────────────────────────────────────
  const SUPABASE_URL  = window.__ENV?.SUPABASE_URL || ''
  const SUPABASE_ANON = window.__ENV?.SUPABASE_KEY || ''

  // ── STYLE SYSTEM CONSTANTS ─────────────────────────────────────
  const STYLE_CLASSES = ['style-gold','style-navy','style-blush','style-sage','style-ivory','style-rose','style-custom']
  const FONT_CLASSES  = ['font-playfair','font-cormorant','font-greatvibes','font-poppins','font-lato']

  const OVERRIDE_MAP = {
    bg_color:     '--override-bg',
    text_color:   '--override-text',
    accent_color: '--override-accent',
    border:       '--override-border',
    border_radius:'--override-radius',
    box_shadow:   '--override-shadow',
    font_family:  '--override-font',
    bg_image:     '--override-bg-image',
  }

  // Old preset names → new CSS class (backward compatibility)
  const OLD_PRESET_MAP = {
    gold: 'style-gold', navy: 'style-navy', blush: 'style-blush',
    sage: 'style-sage', ivory: 'style-ivory', rose: 'style-rose', custom: 'style-custom'
  }

  // ── APPLY STYLE TO ELEMENT ─────────────────────────────────────
  // Handles both old format (object with preset/values) and new format (string class or {preset, overrides})
  function applyStyleToElement(el, styleData) {
    if (!el) return

    // Cleanup existing style classes
    STYLE_CLASSES.forEach(cls => el.classList.remove(cls))
    FONT_CLASSES.forEach(cls => el.classList.remove(cls))

    // Reset custom properties
    Object.values(OVERRIDE_MAP).forEach(prop => el.style.removeProperty(prop))

    if (!styleData) return

    let cssClass = ''
    let fontClass = ''
    let overrides = {}

    if (typeof styleData === 'string') {
      // New format: "style-gold" or "font-playfair"
      if (STYLE_CLASSES.includes(styleData)) {
        cssClass = styleData
      } else if (FONT_CLASSES.includes(styleData)) {
        fontClass = styleData
      } else {
        cssClass = styleData
      }
    } else if (typeof styleData === 'object') {
      const preset = styleData.preset || ''

      // Detect old vs new format
      if (preset.startsWith('style-')) {
        // New format: { preset: "style-gold", overrides: {...} }
        cssClass = preset
        overrides = styleData.overrides || {}
      } else if (OLD_PRESET_MAP[preset]) {
        // Old format: { preset: "gold", bg_color: "...", text_color: "...", ... }
        cssClass = OLD_PRESET_MAP[preset]
        // Extract overrides from flat object (skip 'preset' key)
        overrides = {}
        for (const [k, v] of Object.entries(styleData)) {
          if (k !== 'preset' && v && OVERRIDE_MAP[k]) {
            overrides[k] = v
          }
        }
      } else if (styleData.cssClass) {
        cssClass = styleData.cssClass
        overrides = styleData.overrides || {}
      }
    }

    // Apply classes
    if (cssClass) el.classList.add(cssClass)

    // Apply font class from overrides or direct font_family value
    if (overrides.font_family && FONT_CLASSES.includes(overrides.font_family)) {
      el.classList.add(overrides.font_family)
    }

    // Apply overrides as CSS custom properties
    for (const [key, prop] of Object.entries(OVERRIDE_MAP)) {
      if (overrides[key]) {
        if (key === 'bg_image') {
          el.style.setProperty(prop, `url('${overrides[key]}')`)
        } else {
          el.style.setProperty(prop, overrides[key])
        }
      }
    }
  }

  // ── AMBIL SLUG DARI URL PATH ────────────────────────────────────
  function getSlug() {
    console.log('[invitation] pathname:', window.location.pathname)
    console.log('[invitation] href:', window.location.href)
    const qs = new URLSearchParams(window.location.search).get('slug')
    if (qs) { console.log('[invitation] slug from query:', qs); return qs }
    const segments = window.location.pathname
      .replace(/\/$/, '')
      .split('/')
      .filter(Boolean)
    console.log('[invitation] segments:', segments)
    return segments.pop() || null
  }

  // ── AMBIL NAMA TAMU DARI QUERY STRING ──────────────────────────
  let _guestName = 'Tamu Undangan'
  let _guestId   = null

  function getGuestId() {
    return new URLSearchParams(window.location.search).get('tamu') || null
  }

  function getGuestNameLocal() {
    return new URLSearchParams(window.location.search).get('to') || 'Tamu Undangan'
  }

  async function resolveGuestName() {
    _guestId = getGuestId()
    console.log('[nikahin] tamu ID dari URL:', _guestId)
    
    if (_guestId) {
      try {
        const rows = await sbFetch('tamu_undangan', `?id=eq.${encodeURIComponent(_guestId)}&select=nama`)
        console.log('[nikahin] hasil query tamu_undangan:', rows)
        
        if (rows && rows.length && rows[0].nama) {
          _guestName = rows[0].nama
          console.log('[nikahin] nama tamu ditemukan:', _guestName)
          
          fetch(`${SUPABASE_URL}/rest/v1/tamu_undangan?id=eq.${encodeURIComponent(_guestId)}`, {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_ANON,
              'Authorization': `Bearer ${SUPABASE_ANON}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status_buka: true })
          }).catch(err => console.warn('[nikahin] gagal update status_buka:', err))
          
          return
        } else {
          console.warn('[nikahin] tamu tidak ditemukan atau nama kosong untuk ID:', _guestId)
        }
      } catch (e) {
        console.error('[nikahin] error fetch tamu:', e.message || e)
      }
    }
    
    _guestName = getGuestNameLocal()
    console.log('[nikahin] menggunakan fallback guest name:', _guestName)
  }

  // ── SUPABASE FETCH HELPER ───────────────────────────────────────
  async function sbFetch(path, params = '') {
    const url = `${SUPABASE_URL}/rest/v1/${path}${params}`
    console.log('[nikahin] sbFetch:', url)
    
    const res = await fetch(url, {
      headers: {
        'apikey': SUPABASE_ANON,
        'Authorization': `Bearer ${SUPABASE_ANON}`,
        'Content-Type': 'application/json',
      }
    })
    
    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      console.error('[nikahin] sbFetch error:', res.status, errText)
      throw new Error(`Supabase error: ${res.status}`)
    }
    
    return res.json()
  }

  async function sbPost(path, body) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON,
        'Authorization': `Bearer ${SUPABASE_ANON}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(body)
    })
    return res.ok
  }

  // ── DECLARATIVE DATA BINDING ────────────────────────────────────
  // Resolves nested object path: "events.0.event_name" → data.events[0].event_name
  function resolvePath(obj, path) {
    return path.split('.').reduce((o, k) => (o != null ? o[k] : undefined), obj)
  }

  function applyDataBindings(data) {
    // Text content: data-bind="field_name"
    document.querySelectorAll('[data-bind]').forEach(el => {
      const field = el.getAttribute('data-bind')
      const value = resolvePath(data, field)
      if (value == null || value === '') return

      let display = String(value)
      const format = el.getAttribute('data-format')
      if (format === 'uppercase') display = display.toUpperCase()
      else if (format === 'lowercase') display = display.toLowerCase()
      else if (format === 'capitalize') {
        display = display.replace(/\b\w/g, c => c.toUpperCase())
      }

      el.textContent = display
    })

    // Src: data-bind-src="photo_url"
    document.querySelectorAll('[data-bind-src]').forEach(el => {
      const value = resolvePath(data, el.getAttribute('data-bind-src'))
      if (value) el.setAttribute('src', value)
    })

    // Href: data-bind-href="instagram_url"
    document.querySelectorAll('[data-bind-href]').forEach(el => {
      const value = resolvePath(data, el.getAttribute('data-bind-href'))
      if (value) el.setAttribute('href', value)
    })

    // Alt: data-bind-alt="alt_text"
    document.querySelectorAll('[data-bind-alt]').forEach(el => {
      const value = resolvePath(data, el.getAttribute('data-bind-alt'))
      if (value) el.setAttribute('alt', value)
    })

    // Placeholder: data-bind-placeholder="field"
    document.querySelectorAll('[data-bind-placeholder]').forEach(el => {
      const value = resolvePath(data, el.getAttribute('data-bind-placeholder'))
      if (value) el.setAttribute('placeholder', String(value))
    })
  }

  // ── HELPERS ─────────────────────────────────────────────────────
  function setText(selector, value, all = false) {
    if (!value) return
    const els = all
      ? document.querySelectorAll(selector)
      : [document.querySelector(selector)]
    els.forEach(el => { if (el) el.textContent = value })
  }

  function setHtml(selector, value) {
    if (!value) return
    const el = document.querySelector(selector)
    if (el) el.innerHTML = value
  }

  function setAttr(selector, attr, value) {
    if (!value) return
    const el = document.querySelector(selector)
    if (el) el.setAttribute(attr, value)
  }

  function setSrc(selector, value) { setAttr(selector, 'src', value) }
  function setHref(selector, value) { setAttr(selector, 'href', value) }

  function escHtml(str) {
    return String(str || '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
  }

  // ── FORMAT TANGGAL & WAKTU ──────────────────────────────────────
  function formatTanggal(dateStr) {
    if (!dateStr) return ''
    const d = new Date(dateStr + 'T00:00:00')
    const hari  = ['Ahad','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu']
    const bulan = ['Januari','Februari','Maret','April','Mei','Juni',
                   'Juli','Agustus','September','Oktober','November','Desember']
    return `${hari[d.getDay()]}, ${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`
  }

  function formatJam(timeStr) {
    if (!timeStr) return ''
    return timeStr.slice(0, 5).replace(':', '.') + ' WIB'
  }

  // ── FILL COVER ──────────────────────────────────────────────────
  function fillCover(inv) {
    setText('.name-bride',  inv.bride_nickname)
    setText('.name-groom',  inv.groom_nickname)
    document.title = `Undangan ${inv.bride_nickname} & ${inv.groom_nickname}`

    const coverDate = document.getElementById('coverDate')
    if (coverDate) {
      const tgl = window._nikahinTanggalAcara || ''
      if (tgl) {
        const d = new Date(tgl + 'T00:00:00')
        const formatted = d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        coverDate.textContent = formatted
      }
    }

    const initials = document.getElementById('miniGalleryInitials')
    if (initials) {
      const b = (inv.bride_nickname || '—')[0].toUpperCase()
      const g = (inv.groom_nickname || '—')[0].toUpperCase()
      initials.textContent = `${b} & ${g}`
    }

    setText('.backcover-bride', inv.bride_nickname)
    setText('.backcover-groom', inv.groom_nickname)
  }

  // ── FILL PROFIL MEMPELAI ────────────────────────────────────────
  function fillProfiles(inv) {
    // Mempelai Wanita
    setText('.profile-bride-nickname', inv.bride_nickname)
    setText('.profile-bride-name',     inv.bride_name)
    setHtml('.profile-bride-parents',  buildParents(inv.bride_father, inv.bride_mother))
    if (inv.bride_photo_url) setSrc('.profile-bride-photo', inv.bride_photo_url)
    if (inv.bride_instagram) setHref('.profile-bride-ig', `https://instagram.com/${inv.bride_instagram.replace('@','')}`)
    setText('.profile-bride-ig-text', inv.bride_instagram)

    // Mempelai Pria
    setText('.profile-groom-nickname', inv.groom_nickname)
    setText('.profile-groom-name',     inv.groom_name)
    setHtml('.profile-groom-parents',  buildParents(inv.groom_father, inv.groom_mother))
    if (inv.groom_photo_url) setSrc('.profile-groom-photo', inv.groom_photo_url)
    if (inv.groom_instagram) setHref('.profile-groom-ig', `https://instagram.com/${inv.groom_instagram.replace('@','')}`)
    setText('.profile-groom-ig-text', inv.groom_instagram)

    // Apply profile card styles
    const profileCs = window._nikahinSectionStyles?.profile
    if (profileCs) {
      // Sakina uses .profile-card, Arafa uses .couple-card
      const profileCards = document.querySelectorAll('.profile-card, .couple-card')
      profileCards.forEach(card => applyStyleToElement(card, profileCs))
    }
  }

  function buildParents(ayah, ibu) {
    const parts = []
    if (ayah) parts.push(`<strong>Bapak ${escHtml(ayah)}</strong>`)
    if (ibu)  parts.push(`<strong>Ibu ${escHtml(ibu)}</strong>`)
    return parts.length ? `Putra/i dari<br>${parts.join('<br>&amp; ')}` : ''
  }

  // ── FILL ACARA (EVENTS) ─────────────────────────────────────────
  function fillEvents(events) {
    const container = document.getElementById('eventCardsContainer')
    if (!container || !events.length) return

    const isSakina = container.classList.contains('event-cards')
    const cardClass = isSakina ? 'event-card orbitTiltReveal' : 'event-item orbit-tilt-reveal-dreamy'

    container.innerHTML = events.map((ev, i) => {
      const cs = ev.custom_style

      return `
      <div class="${cardClass}" data-event-idx="${i}">
        <p class="event-type">Prosesi ${i + 1}</p>
        <h3 class="event-name">${escHtml(ev.event_name)}</h3>
        <p class="event-time">${formatJam(ev.start_time)}${ev.end_time ? ' — ' + formatJam(ev.end_time) : ''}</p>
        <p class="event-date-text">${formatTanggal(ev.event_date)}</p>
        <p class="event-loc">${escHtml(ev.location_name)}<br><small>${escHtml(ev.address)}</small></p>
        ${ev.maps_url ? `<a href="${escHtml(ev.maps_url)}" target="_blank" rel="noopener" class="btn-maps">⌖ &nbsp; Buka Peta</a>` : ''}
        ${ev.livestream_url ? `<a href="${escHtml(ev.livestream_url)}" target="_blank" rel="noopener" class="btn-maps" style="margin-top:6px">▶ &nbsp; Live Stream</a>` : ''}
      </div>`
    }).join('')

    // Apply per-event styles
    const cards = container.querySelectorAll('[data-event-idx]')
    cards.forEach((card, i) => {
      if (events[i]?.custom_style) {
        applyStyleToElement(card, events[i].custom_style)
      }
    })
  }

  // ── FILL GALERI ─────────────────────────────────────────────────
  function fillGallery(galleries) {
    const container = document.getElementById('galleryContainer')
    if (!container || !galleries.length) return

    const cs = window._nikahinSectionStyles?.gallery
    applyStyleToElement(container, cs)

    container.innerHTML = galleries.map((g, i) => `
      <div class="${i % 3 === 0 ? 'tall reveal-up' : 'reveal'}">
        <img class="gallery-img" 
             src="${escHtml(g.file_url)}" 
             alt="${escHtml(g.caption || '')}" 
             loading="lazy">
      </div>
    `).join('')
  }

  // ── FILL BACKGROUND SLIDES (cover) ──────────────────────────────
  function fillSlides(galleries) {
    const coverPhotos = galleries.filter(g => g.is_cover).slice(0, 1)
      .concat(galleries.filter(g => !g.is_cover)).slice(0, 3)

    const gradient = 'linear-gradient(180deg, rgba(0,0,0,.3) 0%, rgba(10,8,6,.6) 50%, rgba(16,14,10,.85) 100%)'

    const slideIds = ['slide0', 'slide1', 'slide2']
    coverPhotos.forEach((g, i) => {
      const slide = document.getElementById(slideIds[i])
      if (slide && g.file_url) {
        slide.style.backgroundImage = `${gradient}, url('${g.file_url}')`
        slide.style.backgroundSize = 'cover'
        slide.style.backgroundPosition = 'center top'
      }
    })
  }

  // ── FILL MINI GALLERY CAROUSEL (cover) ──────────────────────────
  function fillMiniGallery(galleries) {
    const track = document.getElementById('miniGalleryTrack')
    if (!track || !galleries.length) return

    const photos = galleries.slice(0, 4)
    if (!photos.length) return

    const items = photos.map(g => `
      <div class="mini-gallery-item">
        <img src="${escHtml(g.file_url)}" alt="${escHtml(g.caption || '')}" loading="lazy">
      </div>
    `).join('')
    const duplicates = photos.map(g => `
      <div class="mini-gallery-item" aria-hidden="true">
        <img src="${escHtml(g.file_url)}" alt="" loading="lazy">
      </div>
    `).join('')

    track.innerHTML = items + duplicates
  }

  // ── FILL MUSIK ──────────────────────────────────────────────────
  function isYouTubeUrl(url) {
    return /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)/.test(url)
  }
  function extractYouTubeId(url) {
    const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&?#]+)/)
    return m ? m[1] : null
  }
  function fillMusic(inv) {
    if (!inv.music_url) return
    if (isYouTubeUrl(inv.music_url)) {
      const vid = extractYouTubeId(inv.music_url)
      if (!vid) return
      window._nikahinMusicMode = 'youtube'
      window._nikahinYouTubeId = vid
      function tryInit() {
        if (window.YT && window.YT.Player) {
          if (typeof initYouTubePlayer === 'function') initYouTubePlayer(vid)
          else {
            window.ytPlayer = new YT.Player('ytMusicPlayer', {
              videoId: vid,
              playerVars: { autoplay: 0, loop: 1, playlist: vid, controls: 0, modestbranding: 1 },
              events: { onReady: function(e) { e.target.setVolume(40); if (typeof musicMode !== 'undefined') musicMode = 'youtube'; } }
            })
          }
        } else { setTimeout(tryInit, 200) }
      }
      tryInit()
    } else {
      window._nikahinMusicMode = 'audio'
      const audio = document.getElementById('bgMusic')
      if (!audio) return
      let source = audio.querySelector('source')
      if (!source) { source = document.createElement('source'); audio.appendChild(source) }
      source.src  = inv.music_url
      source.type = 'audio/mpeg'
      audio.load()
    }
  }

  // ── FILL QUOTE & HASHTAG ────────────────────────────────────────
  function fillQuoteHashtag(inv) {
    if (inv.quote)   setText('.footer-quote', inv.quote)
    if (inv.hashtag) setText('.footer-hashtag', inv.hashtag)

    const cs = window._nikahinSectionStyles?.quote_footer
    if (cs) {
      // Apply to footer section (Sakina: .footer-section, Arafa: .quotes-section / .footer-section)
      const footerSections = document.querySelectorAll('.footer-section, .quotes-section')
      footerSections.forEach(el => applyStyleToElement(el, cs))
    }
  }

  // ── FILL KADO DIGITAL (BANK ACCOUNTS) ──────────────────────────
  function fillKado(accounts) {
    const container = document.getElementById('kadoContainer')
    if (!container || !accounts.length) return

    const cs = window._nikahinSectionStyles?.kado
    applyStyleToElement(container, cs)

    container.innerHTML = accounts.map(a => {
      if (a.type === 'qris' && a.account_number) return `
        <div class="gift-card">
          <div class="gift-bank-logo">QRIS</div>
          <div>
            <p class="gift-bank-name">QRIS</p>
            <img src="${escHtml(a.account_number)}" alt="QRIS" style="width:160px;margin:8px 0;display:block;border-radius:8px">
            <p class="gift-account-name">${escHtml(a.account_name || '')}</p>
          </div>
        </div>`

      return `
        <div class="gift-card">
          <div class="gift-bank-logo">${escHtml((a.bank_name || a.type || '').substring(0, 6))}</div>
          <div>
            <p class="gift-bank-name">${escHtml(a.bank_name || a.type)}</p>
            <p class="gift-account-num" id="kado-${a.id}">${escHtml(a.account_number || '')}</p>
            <p class="gift-account-name">${escHtml(a.account_name || '')}</p>
          </div>
          <button class="btn-copy" onclick="window._nikahinCopy('kado-${a.id}')">⧉</button>
        </div>`
    }).join('')
  }

  // ── FORMAT BULAN-TAHUN (buat love story) ──────────────────────
  function formatBulanTahun(dateStr) {
    if (!dateStr) return ''
    const d = new Date(dateStr + 'T00:00:00')
    const bulan = ['Januari','Februari','Maret','April','Mei','Juni',
                   'Juli','Agustus','September','Oktober','November','Desember']
    return `${bulan[d.getMonth()]} ${d.getFullYear()}`
  }

  // ── FILL LOVE STORY ─────────────────────────────────────────────
  function fillLoveStory(stories) {
    const container = document.querySelector('.timeline')
    if (!container || !stories.length) return

    const cs = window._nikahinSectionStyles?.love_story
    applyStyleToElement(container, cs)

    container.innerHTML = stories.map(s => `
      <div class="timeline-item fadeIn-Up">
        <p class="timeline-date">${escHtml(formatBulanTahun(s.event_date))}</p>
        <h3 class="timeline-title">${escHtml(s.title || '')}</h3>
        <p class="timeline-text">${escHtml(s.description || '')}</p>
        ${s.photo_url ? `<img src="${escHtml(s.photo_url)}" alt="${escHtml(s.title || '')}" class="timeline-photo" loading="lazy">` : ''}
      </div>
    `).join('')
  }

  // ── COUNTDOWN ───────────────────────────────────────────────────
  function startCountdown(events) {
    if (!events.length) return
    const first = events[0]
    if (!first.event_date) return

    const jam = (first.start_time || '08:00:00').slice(0, 5)
    const target = new Date(`${first.event_date}T${jam}:00`)

    if (isNaN(target.getTime())) {
      console.error('[nikahin] Tanggal acara tidak valid:', first.event_date, first.start_time)
      return
    }

    window._nikahinCountdownTarget = target

    const cs = window._nikahinSectionStyles?.countdown
    if (cs) {
      const cdEl = document.querySelector('.countdown') || document.querySelector('#countdown') || document.querySelector('.countdown-row')
      if (cdEl) applyStyleToElement(cdEl, cs)
    }

    function tick() {
      const diff = target - new Date()
      const d = diff <= 0 ? 0 : Math.floor(diff / 86400000)
      const h = diff <= 0 ? 0 : Math.floor((diff % 86400000) / 3600000)
      const m = diff <= 0 ? 0 : Math.floor((diff % 3600000)  / 60000)
      const s = diff <= 0 ? 0 : Math.floor((diff % 60000)    / 1000)

      const trySet = (ids, val) => {
        ids.forEach(id => {
          const el = document.getElementById(id)
          if (el) el.textContent = String(val).padStart(2,'0')
        })
      }

      if (document.getElementById('cd-j')) {
        trySet(['cd-h'], d)
        trySet(['cd-j'], h)
      } else {
        trySet(['cd-d'], d)
        trySet(['cd-h'], h)
      }
      trySet(['cd-m'], m)
      trySet(['cd-s'], s)
    }
    tick()
    setInterval(tick, 1000)
  }

  // ── RSVP ────────────────────────────────────────────────────────
  window.submitRSVP = async function() {
    const invId = window._nikahinInvitationId
    const clientId = window._nikahinClientId
    if (!invId) return

    const name     = document.getElementById('rsvpName')?.value?.trim()
    const status   = window._rsvpStatus || document.querySelector('.rsvp-status.selected')?.dataset?.status
    const phone    = document.getElementById('rsvpPhone')?.value?.trim() || ''
    const wishes   = document.getElementById('rsvpWishes')?.value?.trim() || ''
    const errEl    = document.getElementById('rsvpError')
    const btn      = document.getElementById('rsvpSubmitBtn')

    if (!name)   { if (errEl) errEl.textContent = 'Nama wajib diisi.'; return }
    if (!status) { if (errEl) errEl.textContent = 'Pilih status kehadiran.'; return }
    if (errEl)   errEl.textContent = ''

    if (btn) { btn.disabled = true; btn.textContent = 'Mengirim...' }

    const ok = await sbPost('rsvp_tamu', {
      client_id: clientId,
      nama:      name,
      kehadiran: status,
      telpon:    phone,
      pesan:     wishes,
    })

    if (btn) { btn.disabled = false; btn.textContent = 'Kirim' }

    if (ok) {
      const formEl = document.getElementById('rsvpForm')
      if (formEl) formEl.innerHTML = `
        <div style="text-align:center;padding:32px 0">
          <div style="font-size:32px;margin-bottom:12px">✓</div>
          <p style="font-weight:600;color:#C9A96E">Terima kasih, ${escHtml(name)}!</p>
          <p style="font-size:14px;opacity:.7;margin-top:6px">RSVP kamu telah kami terima.</p>
        </div>`
      loadUcapan(window._nikahinClientId)
    } else {
      if (errEl) errEl.textContent = 'Gagal mengirim, coba lagi.'
    }
  }

  // ── LOAD & RENDER UCAPAN ────────────────────────────────────────
  async function loadUcapan(clientId) {
    const list = document.getElementById('ucapanList')
    if (!list) return

    const data = await sbFetch('rsvp_tamu',
      `?client_id=eq.${clientId}&pesan=neq.&order=created_at.desc&limit=20&select=nama,pesan,kehadiran,created_at`
    ).catch(() => [])

    if (!data.length) {
      list.innerHTML = '<p style="text-align:center;opacity:.5;font-size:13px">Belum ada ucapan.</p>'
      return
    }

    list.innerHTML = data.map(r => `
      <div class="ucapan-item">
        <div class="ucapan-header">
          <span class="ucapan-name">${escHtml(r.nama)}</span>
          <span class="ucapan-badge ${r.kehadiran === 'Hadir' ? 'hadir' : r.kehadiran === 'Tidak Hadir' ? 'tidak' : 'ragu'}">
            ${r.kehadiran === 'Hadir' ? '✓ Hadir' : r.kehadiran === 'Tidak Hadir' ? '✗ Tidak Hadir' : '? Ragu-ragu'}
          </span>
        </div>
        <p class="ucapan-text">${escHtml(r.pesan)}</p>
      </div>
    `).join('')
  }

  // ── COPY HELPER ─────────────────────────────────────────────────
  window._nikahinCopy = function(elId) {
    const el = document.getElementById(elId)
    if (!el) return
    navigator.clipboard.writeText(el.textContent)
      .then(() => alert('Tersalin!'))
      .catch(() => {})
  }

  // ── LOG VIEW ────────────────────────────────────────────────────
  async function logView(invId) {
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_view_count`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON,
        'Authorization': `Bearer ${SUPABASE_ANON}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inv_id: invId })
    }).catch(() => {})
  }

  // ── MAIN: LOAD SEMUA DATA ───────────────────────────────────────
  async function loadInvitation() {
    console.log('[nikahin] SUPABASE_URL:', SUPABASE_URL ? '✓ ada' : '✗ kosong')
    console.log('[nikahin] SUPABASE_ANON:', SUPABASE_ANON ? '✓ ada' : '✗ kosong')
    
    const slug = getSlug()
    console.log('[nikahin] slug:', slug)
    if (!slug) { console.warn('[nikahin] Slug tidak ditemukan di URL'); return }

    const invitations = await sbFetch('invitations',
      `?slug=eq.${encodeURIComponent(slug)}&is_published=eq.true&select=*`
    ).catch(err => { console.error('[nikahin] fetch error:', err); return [] })

    console.log('[nikahin] invitations:', invitations)

    if (!invitations.length) {
      const all = await sbFetch('invitations',
        `?slug=eq.${encodeURIComponent(slug)}&select=id,slug,is_published,is_active,expired_at`
      ).catch(() => [])
      console.log('[nikahin] debug (tanpa filter):', all)
    }

    if (!invitations.length) {
      document.body.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;height:100vh;
                    font-family:sans-serif;text-align:center;background:#0f0f0f;color:#888">
          <div>
            <p style="font-size:48px;margin-bottom:16px">🔒</p>
            <p style="font-size:18px;color:#ccc">Undangan tidak ditemukan</p>
            <p style="font-size:13px;margin-top:8px">Link mungkin sudah tidak aktif atau salah.</p>
          </div>
        </div>`
      return
    }

    const inv = invitations[0]
    window._nikahinInvitationId = inv.id
    window._nikahinClientId = inv.client_id
    window._nikahinSectionStyles = inv.section_styles || {}

    await resolveGuestName()
    setText('#guestNameDisplay', _guestName)

    const [events, galleries, accounts, stories, clients] = await Promise.all([
      sbFetch('events',        `?invitation_id=eq.${inv.id}&order=sort_order`).catch(() => []),
      sbFetch('galleries',     `?invitation_id=eq.${inv.id}&order=sort_order`).catch(() => []),
      sbFetch('bank_accounts', `?invitation_id=eq.${inv.id}&order=sort_order`).catch(() => []),
      sbFetch('love_stories',  `?invitation_id=eq.${inv.id}&order=sort_order`).catch(() => []),
      sbFetch('clients',       `?id=eq.${inv.client_id}&select=tanggal_acara`).catch(() => []),
    ])

    if (clients && clients.length && clients[0].tanggal_acara) {
      window._nikahinTanggalAcara = clients[0].tanggal_acara
    }

    fillCover(inv)
    fillProfiles(inv)
    fillEvents(events)
    fillGallery(galleries)
    fillMiniGallery(galleries)
    fillSlides(galleries)
    fillMusic(inv)
    fillQuoteHashtag(inv)
    fillKado(accounts)
    fillLoveStory(stories)
    startCountdown(events)

    // ── Declarative data binding ──
    const firstEvent = events[0] || {}
    const bindData = {
      ...inv,
      guest_name: _guestName,
      event_date_formatted: firstEvent.event_date ? formatTanggal(firstEvent.event_date) : '',
      event_date: firstEvent.event_date || '',
      event_time: firstEvent.start_time ? formatJam(firstEvent.start_time) : '',
      bride_initial: (inv.bride_nickname || '')[0]?.toUpperCase() || '',
      groom_initial: (inv.groom_nickname || '')[0]?.toUpperCase() || '',
      bride_groom_initials: `${(inv.bride_nickname || '')[0] || ''} & ${(inv.groom_nickname || '')[0] || ''}`,
    }
    applyDataBindings(bindData)

    await loadUcapan(inv.client_id)
    logView(inv.id)

    document.dispatchEvent(new CustomEvent('nikahin:loaded', { detail: { inv, events, galleries } }))
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadInvitation)
  } else {
    loadInvitation()
  }

})()
