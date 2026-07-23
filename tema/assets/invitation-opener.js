/* ================================================================
   INVITATION OPENER — Shared component untuk semua tema undangan

   Handle scroll lock, audio play, cover dismiss, content reveal.

   Cara pakai:
     1. Load invitation-opener.js SETELAH audio-player.js
     2. Panggil InvitationOpener.init(options) dari tema
     3. Tombol .btn-open otomatis ter-attach ke open()

   Options:
     coverSelector  — CSS selector cover element (default: '#cover')
     mainSelector   — CSS selector main content (opsional)
     mainOpenClass  — Class untuk reveal main content (default: 'open')
     revealDelay    — Delay sebelum main content ditampilkan (ms, default: 0)
     onReveal       — Callback(coverEl) untuk cover animation
     onReady        — Callback() setelah konten terbuka

   Auto-attach: mencari .btn-open atau [onclick*="openInvitation"]
   ================================================================ */
window.InvitationOpener = (function () {
  'use strict'

  var opts = {}
  var opened = false

  var defaults = {
    coverSelector: '#cover',
    mainSelector: null,
    mainOpenClass: 'open',
    revealDelay: 0,
    onReveal: function (cover) { cover.style.display = 'none' },
    onReady: function () {}
  }

  function lockScroll() {
    document.body.style.overflow = 'hidden'
  }

  function unlockScroll() {
    document.body.style.overflow = ''
  }

  function open() {
    if (opened) return
    opened = true

    if (window.AudioPlayer) window.AudioPlayer.play()

    unlockScroll()

    var cover = document.querySelector(opts.coverSelector)
    if (cover && opts.onReveal) opts.onReveal(cover)

    if (opts.mainSelector) {
      var main = document.querySelector(opts.mainSelector)
      if (main) {
        setTimeout(function () {
          main.classList.add(opts.mainOpenClass)
        }, opts.revealDelay)
      }
    }

    if (window.AudioPlayer) {
      setTimeout(function () { window.AudioPlayer.showButton() }, opts.revealDelay)
    }

    if (opts.onReady) {
      setTimeout(function () { opts.onReady() }, opts.revealDelay)
    }
  }

  function init(options) {
    opts = {}
    for (var k in defaults) {
      if (options && options.hasOwnProperty(k)) opts[k] = options[k]
      else opts[k] = defaults[k]
    }

    lockScroll()

    var btn = document.querySelector('.btn-open')
      || document.querySelector('[onclick*="openInvitation"]')
    if (btn) {
      btn.removeAttribute('onclick')
      btn.addEventListener('click', open)
    }

    window.openInvitation = open
  }

  return { init: init, open: open }
})()
