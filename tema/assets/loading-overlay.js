/* ================================================================
   LOADING OVERLAY — Shared component untuk semua tema undangan

   Membuat overlay loading secara dinamis dengan config per tema.
   Flow: "Nikahinkita" zoom-in → fade-out → inisial zoom-in → slide-down

   Cara pakai:
     1. Load loading-overlay.js sebelum invitation-loader.js
     2. Panggil LoadingOverlay.init(config) dari tema
     3. invitation-loader.js akan memanggil LoadingOverlay.dismiss() saat data siap

   Config:
     bg            — Background overlay (default: '#0D0D0D')
     brand         — Teks brand (default: 'Nikahinkita')
     brandColor    — Warna brand (default: '#C9A96E')
     brandFont     — Font brand (default: "'Cormorant Garamond', serif")
     brandSize     — Ukuran brand (default: '2rem')
     brandWeight   — Weight brand (default: '300')
     ornamentColor — Warna ornament (default: 'rgba(201,169,110,0.4)')
     initialsColor — Warna inisial (default: sama dengan brandColor)
     initialsFont  — Font inisial (default: sama dengan brandFont)
     ampColor      — Warna ampersand (default: 'rgba(201,169,110,0.6)')
     ornament      — Karakter ornament (default: '✦')
   ================================================================ */
window.LoadingOverlay = (function () {
  'use strict'

  var config = {}
  var overlay = null
  var startTime = 0

  var defaults = {
    bg: '#0D0D0D',
    brand: 'Nikahinkita',
    brandColor: '#C9A96E',
    brandFont: "'Cormorant Garamond', serif",
    brandSize: '2rem',
    brandWeight: '300',
    ornamentColor: 'rgba(201,169,110,0.4)',
    initialsColor: null,
    initialsFont: null,
    ampColor: null,
    ornament: '✦'
  }

  function injectCSS() {
    if (document.getElementById('loadingOverlayCSS')) return
    var s = document.createElement('style')
    s.id = 'loadingOverlayCSS'
    s.textContent = [
      '#loadingOverlay { transition: none; }',
      '#loadingOverlay.slide-away {',
      '  transform: translateY(100%);',
      '  opacity: 0;',
      '  pointer-events: none;',
      '  transition: transform 0.8s cubic-bezier(0.4,0,0.2,1), opacity 0.6s ease;',
      '}',
      '.loading-center {',
      '  position: relative;',
      '  width: 300px;',
      '  height: 80px;',
      '}',
      '.loading-center > * {',
      '  position: absolute;',
      '  inset: 0;',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '}',
      '.loading-brand {',
      '  animation: loadingZoomIn 1s cubic-bezier(0.16,1,0.3,1) both;',
      '}',
      '.loading-brand.hide {',
      '  opacity: 0;',
      '  transform: scale(0.95);',
      '  pointer-events: none;',
      '  visibility: hidden;',
      '  transition: opacity 0.35s ease, transform 0.35s ease, visibility 0s 0.35s;',
      '}',
      '.loading-ornament {',
      '  animation: loadingFadeIn 0.8s ease 0.2s both;',
      '}',
      '.loading-initials {',
      '  opacity: 0;',
      '}',
      '.loading-initials.show {',
      '  opacity: 1;',
      '  animation: loadingZoomIn 1s cubic-bezier(0.16,1,0.3,1) both;',
      '}',
      '@keyframes loadingZoomIn {',
      '  from { opacity: 0; transform: scale(0.5); }',
      '  to   { opacity: 1; transform: scale(1); }',
      '}',
      '@keyframes loadingFadeIn {',
      '  from { opacity: 0; }',
      '  to   { opacity: 1; }',
      '}'
    ].join('\n')
    document.head.appendChild(s)
  }

  function createOverlay() {
    var ico = config.ornament
    var sp = '&nbsp;&nbsp;'
    var ornamentHtml = ico + sp + ico + sp + ico

    var brandStyle = [
      'font-family:' + config.brandFont,
      'font-size:' + config.brandSize,
      'font-weight:' + config.brandWeight,
      'letter-spacing:0.15em',
      'color:' + config.brandColor
    ].join(';')

    var iColor = config.initialsColor || config.brandColor
    var iFont = config.initialsFont || config.brandFont
    var aColor = config.ampColor || config.brandColor.replace(/[\d.]+\)$/, '0.6)')
      || 'rgba(201,169,110,0.6)'

    var initialsStyle = [
      'font-family:' + iFont,
      'font-size:3.5rem',
      'font-weight:300',
      'letter-spacing:0.1em',
      'color:' + iColor
    ].join(';')

    var ampStyle = [
      'font-family:' + iFont,
      'font-size:2rem',
      'font-style:italic',
      'color:' + aColor,
      'margin:0 12px'
    ].join(';')

    var ornamentStyle = [
      'font-size:0.65rem',
      'letter-spacing:0.5em',
      'color:' + config.ornamentColor
    ].join(';')

    var html = '<div id="loadingOverlay" style="position:fixed;inset:0;z-index:10000;display:flex;flex-direction:column;align-items:center;justify-content:center;background:' + config.bg + ';">'
      + '<div class="loading-ornament" style="' + ornamentStyle + ';margin-bottom:24px;">' + ornamentHtml + '</div>'
      + '<div class="loading-center">'
      +   '<div class="loading-brand" style="' + brandStyle + ';">' + escHtml(config.brand) + '</div>'
      +   '<div class="loading-initials">'
      +     '<span class="li-bride" style="' + initialsStyle + ';"></span>'
      +     '<span class="li-amp" style="' + ampStyle + ';">&amp;</span>'
      +     '<span class="li-groom" style="' + initialsStyle + ';"></span>'
      +   '</div>'
      + '</div>'
      + '<div class="loading-ornament" style="' + ornamentStyle + ';margin-top:24px;">' + ornamentHtml + '</div>'
      + '</div>'

    document.body.insertAdjacentHTML('afterbegin', html)
    overlay = document.getElementById('loadingOverlay')
    startTime = Date.now()
  }

  function escHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  }

  function fillInitials() {
    if (!overlay) return
    var brideEl = document.querySelector('.name-bride')
    var groomEl = document.querySelector('.name-groom')
    var b = (brideEl?.textContent || '')[0] || ''
    var g = (groomEl?.textContent || '')[0] || ''
    var liBride = overlay.querySelector('.li-bride')
    var liGroom = overlay.querySelector('.li-groom')

    if (b && g && b !== '\u2014' && g !== '\u2014') {
      if (liBride) liBride.textContent = b
      if (liGroom) liGroom.textContent = g
    } else {
      if (liBride) liBride.style.display = 'none'
      if (liGroom) liGroom.style.display = 'none'
      var liAmp = overlay.querySelector('.li-amp')
      if (liAmp) { liAmp.style.fontSize = '3rem'; liAmp.style.opacity = '1' }
    }
  }

  // ── PUBLIC ──────────────────────────────────────────────────────

  function init(options) {
    config = {}
    for (var k in defaults) {
      config[k] = (options && options.hasOwnProperty(k)) ? options[k] : defaults[k]
    }
    injectCSS()
    createOverlay()
  }

  function dismiss(callback) {
    if (!overlay) { if (callback) callback(); return }

    var done = false
    function finish() {
      if (done) return
      done = true
      if (overlay) { overlay.remove(); overlay = null }
      if (callback) callback()
    }

    var elapsed = Date.now() - startTime
    var waitBrand = Math.max(0, 1000 - elapsed)

    setTimeout(function () {
      var brand = overlay.querySelector('.loading-brand')
      if (brand) brand.classList.add('hide')

      setTimeout(function () {
        fillInitials()
        var initials = overlay.querySelector('.loading-initials')
        if (initials) initials.classList.add('show')

        setTimeout(function () {
          overlay.classList.add('slide-away')
          overlay.addEventListener('transitionend', finish, { once: true })
          setTimeout(finish, 1200)
        }, 1000)
      }, 400)
    }, waitBrand)
  }

  return { init: init, dismiss: dismiss }
})()
