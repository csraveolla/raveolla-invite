---
name: theme-development
description: Panduan membuat/mengubah tema undangan (folder tema/<nama>/index.html). Gunakan saat membangun tema baru, mengedit layout/animasi tema, atau debugging data binding (class-based atau data-bind). Mencakup anatomi tema, script wajib, resolusi slug->tema, sistem styling (style presets, NK-Design, motion-plus), section_styles, dan integrasi InvitationOpener.
metadata:
  audience: theme-developers
  workflow: frontend
---

# Theme Development — raveolla-invite

Panduan pengembangan tema undangan. Detail lengkap ada di file referensi; baca sebelum menduplikasi data.

- Binding lengkap: `DATA_BINDING_REFERENCE.md`
- Arsitektur umum & routing: `AGENTS.md`
- NK-Design: `nk-design.md`

## Anatomi Tema

1 folder = 1 tema: `tema/<nama>/index.html` (inline CSS ~800-2000 baris + markup). Nama folder harus sama persis dengan `themes.name` di Supabase (fallback `DEFAULT_THEME` = `sakina`, lookup case-insensitive).

Include wajib (dekat penutup `<body>`):

```html
<link rel="stylesheet" href="/assets/style-presets.css">
<link rel="stylesheet" href="/assets/motion-plus.css">
<script src="/env.js"></script>
<script src="/assets/motion-plus.js" defer></script>
<script src="/assets/invitation-loader.js" defer></script>
<script src="/tema/assets/audio-player.js" defer></script>
<script src="/tema/assets/invitation-opener.js"></script>
<script src="/tema/assets/loading-overlay.js"></script>
<script src="/tema/assets/rsvp-widget.js" defer></script>
```

Asset path: `sakina` memakai `/assets/*`; `arafa` memakai `/tema/assets/*`. Di produksi `.htaccess` memetakan keduanya — untuk tema baru ikuti konvensi tema terdekat dan pastikan path benar saat tes lokal.

## Data Binding (2 sistem, bisa dipakai bersamaan)

### 1. Class-based (legacy) — diisi `invitation-loader.js`
Key selectors yang wajib ada di HTML tema:

| Selector | Isi |
|---|---|
| `.name-bride` / `.name-groom` / `.backcover-bride` / `.backcover-groom` | nama panggilan |
| `#guestNameDisplay` | nama tamu |
| `.profile-bride-*` / `.profile-groom-*` (nickname, name, parents, photo, ig, ig-text) | profil mempelai |
| `#coverDate`, `#miniGalleryInitials` | tanggal acara, inisial |
| `#eventCardsContainer` | daftar acara (generated) |
| `#galleryContainer`, `#slide0..2`, `#miniGalleryTrack` | galeri (generated) |
| `#kadoContainer` | kado digital (generated) |
| `.timeline` | love story (generated) |
| `#ucapanList` | ucapan tamu (generated) |
| `#bgMusic` / `#ytMusicPlayer` | musik |
| `.footer-quote` / `.footer-hashtag` | footer |

`fillEvents()`/`fillKado()`/`fillLoveStory()`/`loadUcapan()` menghasilkan HTML — **tema harus meng-style class generated**: `.event-name`, `.event-time`, `.event-date-text`, `.event-loc`, `.btn-maps`, `.gift-card`, `.gift-bank-logo`, `.gift-account-num`, `.btn-copy`, `.timeline-item`, `.timeline-date`, `.timeline-title`, `.timeline-text`, `.timeline-photo`, `.ucapan-item`, `.ucapan-name`, `.ucapan-badge(.hadir/.tidak/.ragu)`, `.ucapan-text`, `.gallery-img`, `.mini-gallery-item`.

Selector yang tidak ada di HTML akan di-skip (graceful degradation), tapi tetap sediakan yang relevan.

### 2. Declarative (data-bind) — tanpa daftar class
```html
<h3 data-bind="bride_name" data-format="uppercase"></h3>
<img data-bind-src="bride_photo_url" data-bind-alt="bride_nickname">
<a data-bind-href="bride_instagram"></a>
<p data-bind="events.0.event_name"></p>
<span data-bind="guest_name"></span>
```

Atribut: `data-bind` (text), `data-bind-src`, `data-bind-href`, `data-bind-alt`, `data-bind-placeholder`, `data-format` (uppercase/lowercase/capitalize). Bisa akses nested array (`events.0.event_name`) dan computed field (`guest_name`, `event_date_formatted`, `event_time`, `bride_initial`, `groom_initial`, `bride_groom_initials`).

## Styling (3 lapisan)

1. **Style presets** (`style-presets.css`): class `style-gold|navy|blush|sage|ivory|rose|custom` + font (`font-playfair|font-cormorant|font-greatvibes|font-poppins|font-lato`). Override per-section via CSS vars `--override-bg/text/accent/border/radius/shadow/font/bg-image` (map DB key → var ada di `event-presets.js` `OVERRIDE_MAP`).
2. **NK-Design** (`nk-design.css`): warna `nk-white/nk-palm/nk-sand/nk-olive/nk-gunmetal` (+ `nk-color-*` untuk teks saja), `.nk-type` font rules, ukuran responsif `nk-s-p/h4/h3/h2/h1`, tombol `nk-btn` + `nk-btn-gunmetal|palm|olive|outline`. Lihat `nk-design.md`.
3. **Motion** (`motion-plus.css`): 63 animasi suffix `-dreamy`, dipicu IntersectionObserver via `.ani-container.active` (`motion-plus.js`). Ada juga sistem legacy per-tema (`initScrollAnimations()` di sakina) — jangan duplikasi keduanya tanpa alasan.

Token tema didefinisikan di `:root` tiap tema (mis. `--gold`, `--font-display`) — jangan hardcode warna di banyak tempat; pakai token.

## Section Styles (JSONB `section_styles`)

Loader memanggil `applyStyleToElement()` pada selector per section:

| Section key | Selector JS |
|---|---|
| `profile` | `.profile-card, .couple-card` |
| `gallery` | `#galleryContainer` |
| `love_story` | `.timeline` |
| `kado` | `#kadoContainer` |
| `quote_footer` | `.footer-section, .quotes-section` |
| `countdown` | `.countdown` \|\| `#countdown` \|\| `.countdown-row` |

## Integrasi Opener

```js
InvitationOpener.init({
  coverSelector: '#cover',
  mainSelector: '#main-content',
  revealDelay: 800,
  onReveal: (cover) => { /* animasi cover dismiss */ },
  onReady: () => { /* post-open: sticky nav, petals, scroll anim */ }
});
```

Kontrak: `init()` mengunci scroll; klik `.btn-open` → `open()` → audio play → buka kunci scroll → cover animasi → kelas `mainOpenClass` (`open`) pada main → `onReveal`/`onReady`. Jangan duplikasi logika open di tiap tema.

## Checklist Tema Baru

1. Buat `tema/<nama>/index.html` mengikuti struktur tema referensi (sakina dark / arafa light).
2. Sertakan semua script & asset wajib; pastikan path benar untuk dev & prod.
3. Tambahkan selector binding yang relevan — prefer `data-bind` untuk teks/foto statis, pastikan container generated (`#eventCardsContainer`, `#kadoContainer`, `#ucapanList`, `.timeline`, `#galleryContainer`) ada.
4. Style semua generated classes; gunakan token `:root`.
5. Daftarkan tema di tabel `themes` (nama harus sama dengan folder).
6. Uji: `python3 tema/serve.py` → buka `/slug-tema`; cek console `[nikahin]` (log slug, sbFetch, error) dan event `nikahin:loaded`.

## Verifikasi

- Tidak ada error di console (`[nikahin] ... error`).
- Semua section terisi (cover, profil, acara, galeri, kado, love story, countdown, ucapan).
- Audio & tombol buka undangan jalan; scroll lock terlepas setelah `open()`.
