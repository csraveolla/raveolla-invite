/* ================================================================
   AUDIO PLAYER — Shared component untuk semua tema undangan

   Cara pakai:
     1. Load audio-player.css + audio-player.js di tema
     2. Panggil AudioPlayer.init(musicUrl) dari invitation-loader atau manual
     3. Panggil AudioPlayer.play() dari openInvitation() (synchronous click handler)
     4. Gunakan onclick="AudioPlayer.toggle()" di tombol musik (atau biarkan auto)

   Auto-render: Tombol, <audio>, dan #ytMusicPlayer dibuat otomatis.
   Customization: Override CSS variables di :root atau class tema.
   ================================================================ */
window.AudioPlayer = (function () {
  'use strict'

  let mode = 'audio'       // 'audio' | 'youtube'
  let ytPlayer = null
  let ytReady = false
  let initialized = false
  let musicUrl = ''

  // ── DOM CREATION ────────────────────────────────────────────
  function ensureDOM() {
    if (document.getElementById('bgMusic')) return

    // <audio> element
    const audio = document.createElement('audio')
    audio.id = 'bgMusic'
    audio.loop = true
    document.body.appendChild(audio)

    // YouTube player container
    const ytDiv = document.createElement('div')
    ytDiv.id = 'ytMusicPlayer'
    document.body.appendChild(ytDiv)

    // Floating button
    const btn = document.createElement('button')
    btn.id = 'musicBtn'
    btn.className = 'ap-btn'
    btn.setAttribute('aria-label', 'Toggle music')
    btn.innerHTML = '<span class="ap-icon-play">\u266A</span><span class="ap-icon-pause">\u266B</span>'
    btn.onclick = toggle
    document.body.appendChild(btn)
  }

  // ── YOUTUBE IFRAME API ──────────────────────────────────────
  function loadYouTubeAPI() {
    if (window.YT && window.YT.Player) return
    if (document.querySelector('script[src*="youtube.com/iframe_api"]')) return
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
  }

  // YouTube API calls this when ready
  const prevReady = window.onYouTubeIframeAPIReady
  window.onYouTubeIframeAPIReady = function () {
    ytReady = true
    if (typeof prevReady === 'function') prevReady()
  }

  function initYouTubePlayer(videoId) {
    if (!ytReady) return false
    if (ytPlayer) {
      ytPlayer.loadVideoById(videoId)
      return true
    }
    try {
      ytPlayer = new YT.Player('ytMusicPlayer', {
        videoId: videoId,
        playerVars: { autoplay: 0, loop: 1, playlist: videoId, controls: 0, modestbranding: 1 },
        events: {
          onReady: function (e) {
            e.target.setVolume(40)
            mode = 'youtube'
          }
        }
      })
      return true
    } catch (e) {
      console.warn('[AudioPlayer] YouTube init error:', e)
      return false
    }
  }

  function tryInitYouTube(videoId, retries) {
    retries = retries || 0
    if (window.YT && window.YT.Player) {
      initYouTubePlayer(videoId)
    } else if (retries < 50) {
      setTimeout(function () { tryInitYouTube(videoId, retries + 1) }, 200)
    }
  }

  // ── URL DETECTION ───────────────────────────────────────────
  function isYouTubeUrl(url) {
    return /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)/.test(url)
  }

  function extractYouTubeId(url) {
    var m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&?#]+)/)
    return m ? m[1] : null
  }

  // ── INIT ────────────────────────────────────────────────────
  function init(url) {
    ensureDOM()
    if (!url) return
    musicUrl = url
    initialized = true

    if (isYouTubeUrl(url)) {
      var vid = extractYouTubeId(url)
      if (!vid) return
      mode = 'youtube'
      loadYouTubeAPI()
      tryInitYouTube(vid)
    } else {
      mode = 'audio'
      var audio = document.getElementById('bgMusic')
      if (!audio) return
      var source = audio.querySelector('source')
      if (!source) {
        source = document.createElement('source')
        audio.appendChild(source)
      }
      source.src = url
      source.type = 'audio/mpeg'
      audio.load()
    }

    // Backward compat: set window flags for any theme JS that reads them
    window._nikahinMusicMode = mode
  }

  // ── PLAY / PAUSE ────────────────────────────────────────────
  function play() {
    ensureDOM()
    var btn = document.getElementById('musicBtn')
    if (!initialized) return

    if (mode === 'youtube') {
      if (ytPlayer && ytPlayer.playVideo) {
        ytPlayer.playVideo()
        if (btn) btn.classList.add('playing')
      }
    } else {
      var audio = document.getElementById('bgMusic')
      if (audio && audio.querySelector('source')?.src) {
        audio.volume = 0.4
        audio.play().catch(function () {})
        if (btn) btn.classList.add('playing')
      }
    }
  }

  function pause() {
    var btn = document.getElementById('musicBtn')
    if (mode === 'youtube') {
      if (ytPlayer && ytPlayer.pauseVideo) {
        ytPlayer.pauseVideo()
        if (btn) btn.classList.remove('playing')
      }
    } else {
      var audio = document.getElementById('bgMusic')
      if (audio) {
        audio.pause()
        if (btn) btn.classList.remove('playing')
      }
    }
  }

  function toggle() {
    if (mode === 'youtube') {
      if (!ytPlayer) return
      if (ytPlayer.getPlayerState && ytPlayer.getPlayerState() === YT.PlayerState.PLAYING) {
        pause()
      } else {
        play()
      }
    } else {
      var audio = document.getElementById('bgMusic')
      if (!audio) return
      if (audio.paused) {
        play()
      } else {
        pause()
      }
    }
  }

  function showButton() {
    var btn = document.getElementById('musicBtn')
    if (btn) btn.classList.add('show')
  }

  // ── PUBLIC API ──────────────────────────────────────────────
  return {
    init: init,
    play: play,
    pause: pause,
    toggle: toggle,
    showButton: showButton,
    getMode: function () { return mode },
    isPlaying: function () {
      if (mode === 'youtube') {
        return ytPlayer && ytPlayer.getPlayerState && ytPlayer.getPlayerState() === YT.PlayerState.PLAYING
      }
      var audio = document.getElementById('bgMusic')
      return audio && !audio.paused
    }
  }
})()
