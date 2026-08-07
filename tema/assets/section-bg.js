// ================================================================
// section-bg.js — Section Background Engine (bg-sec-*)
// Engine deklaratif: scan element ber-class bg-sec-* lalu
// meng-inject layer background (gradient/slideshow/video).
//
// Class didukung:
//   bg-sec-grad-1 → gradient (layer .section-bg-layer-grad)
//   bg-sec-anim-1 → slideshow crossfade + Ken Burns
//                     sumber: data-bg-images="u1,u2,u3" > galeri undangan
//   bg-sec-video  → video bg dari data-bg-video="URL"
//
// Atribut opsional:
//   data-bg-images="url1,url2,url3"   override gambar slideshow
//   data-bg-video="https://...mp4"    sumber video
//   data-bg-image="url"               poster video
//   data-bg-overlay="rgba(0,0,0,.45)" overlay di atas bg
// ================================================================

;(function() {
  'use strict'

  const NS  = 'bgsec'
  const log = (...a) => console.log(`[${NS}]`, ...a)
  const warn = (...a) => console.warn(`[${NS}]`, ...a)

  const SLIDE_DURATION = 6000

  const reducedMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  let galleries = []

  // ── HELPERS ──────────────────────────────────────────────────
  function injectLayer(section) {
    let layer = section.querySelector(':scope > .section-bg-layer')
    if (!layer) {
      layer = document.createElement('div')
      layer.className = 'section-bg-layer'
      layer.setAttribute('aria-hidden', 'true')
      section.prepend(layer)
    }
    return layer
  }

  function addOverlay(section, layer) {
    const val = section.getAttribute('data-bg-overlay')
    if (!val) return
    const overlay = document.createElement('div')
    overlay.className = 'section-bg-overlay'
    overlay.style.background = val
    layer.appendChild(overlay)
  }

  function parseList(attr) {
    return attr.split(',').map(u => u.trim()).filter(Boolean)
  }

  function sectionLabel(section) {
    return section.id || section.className || 'untitled-section'
  }

  // ── VARIAN 1: GRADIENT ───────────────────────────────────────
  function setupGrad(section) {
    if (section.__bgsecGrad) return
    const layer = injectLayer(section)
    layer.classList.add('section-bg-layer-grad')
    addOverlay(section, layer)
    section.__bgsecGrad = true
    log('gradient:', sectionLabel(section))
  }

  // ── VARIAN 2: SLIDESHOW ──────────────────────────────────────
  function createSlide(src) {
    const div = document.createElement('div')
    div.className = 'section-bg-slide'
    div.style.backgroundImage = `url('${src}')`
    return div
  }

  function galleryImages() {
    return galleries
      .map(g => g.file_url || g.url || g.photo_url)
      .filter(Boolean)
  }

  function setupAnim(section) {
    if (section.__bgsecAnim) return

    // Sumber: data-bg-images attr > galeri undangan
    let images = section.getAttribute('data-bg-images')
      ? parseList(section.getAttribute('data-bg-images'))
      : galleryImages()

    if (!images.length) {
      warn('anim (menunggu data):', sectionLabel(section))
      return
    }

    const layer = injectLayer(section)
    const slides = images.map(createSlide)
    slides.forEach(s => layer.appendChild(s))
    addOverlay(section, layer)

    section.__bgsecAnim = { slides, index: 0 }

    if (reducedMotion || slides.length === 1) {
      slides[0].classList.add('active')
      log('anim statis:', sectionLabel(section), slides.length, 'gambar')
      return
    }

    slides[0].classList.add('active')
    section.__bgsecAnim.timer = setInterval(() => {
      const cur  = section.__bgsecAnim.index
      const next = (cur + 1) % slides.length
      slides[cur].classList.remove('active')
      slides[next].classList.add('active')
      section.__bgsecAnim.index = next
    }, SLIDE_DURATION)

    log('slideshow jalan:', sectionLabel(section), slides.length, 'gambar')
  }

  // ── VARIAN 3: VIDEO ──────────────────────────────────────────
  function setupVideo(section) {
    if (section.__bgsecVideo) return

    const src = section.getAttribute('data-bg-video')
    if (!src) {
      warn('video tanpa data-bg-video:', sectionLabel(section))
      return
    }

    const layer = injectLayer(section)

    const poster = section.getAttribute('data-bg-image') ||
      (galleries[0] && (galleries[0].file_url || galleries[0].url))

    const video = document.createElement('video')
    video.className = 'section-bg-video'
    video.autoplay = true
    video.muted = true
    video.loop = true
    video.playsInline = true
    video.preload = 'auto'
    if (poster) video.poster = poster

    const source = document.createElement('source')
    source.src = src
    source.type = 'video/mp4'
    video.appendChild(source)

    // Fallback: jika video gagal dimuat, tampilkan gradient
    video.addEventListener('error', () => {
      warn('video gagal dimuat:', src)
      layer.classList.add('section-bg-layer-grad')
    })

    layer.appendChild(video)
    addOverlay(section, layer)

    section.__bgsecVideo = video
    log('video:', sectionLabel(section), src)

    video.play().catch(err =>
      warn('autoplay video diblokir:', err && err.message)
    )
  }

  // ── SCAN & INIT ──────────────────────────────────────────────
  function initSections() {
    document.querySelectorAll('[class*="bg-sec-"]').forEach(sec => {
      const cls = ' ' + sec.className + ' '
      if (/ bg-sec-grad-\d+ /.test(cls))    setupGrad(sec)
      if (/ bg-sec-anim-\d+ /.test(cls))    setupAnim(sec)
      if (/ bg-sec-video /.test(cls))       setupVideo(sec)
    })
  }

  document.addEventListener('DOMContentLoaded', initSections)

  // Data galeri siap (dari invitation-loader.js)
  document.addEventListener('nikahin:loaded', e => {
    galleries = (e.detail && e.detail.galleries) || []
    log('data galeri diterima:', galleries.length, 'gambar')
    initSections()
  })
})()
