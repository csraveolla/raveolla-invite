# Data Binding Reference

Referensi lengkap CSS class/ID yang digunakan untuk data binding dari Supabase ke DOM.

---

## 1. Cover Section

| Selector | JS Method | Data Field | Element | Sakina | Arafa | Medina |
|---|---|---|---|---|---|---|
| `.name-bride` | `setText()` | `inv.bride_nickname` | `<span>` | ✅ | ✅ | ✅ |
| `.name-groom` | `setText()` | `inv.groom_nickname` | `<span>` | ✅ | ✅ | ✅ |
| `#coverDate` | `getElementById()` | `clients[0].tanggal_acara` (formatted) | `<div>` | ✅ | ✅ | ✅ |
| `#miniGalleryInitials` | `getElementById()` | `bride_nickname[0]` + `groom_nickname[0]` | `<div>` | ✅ | ✅ | ❌ |
| `.backcover-bride` | `setText()` | `inv.bride_nickname` | `<span>` | ✅ | ✅ | ✅ |
| `.backcover-groom` | `setText()` | `inv.groom_nickname` | `<span>` | ✅ | ✅ | ✅ |
| `#guestNameDisplay` | `setText()` | `_guestName` (dari `tamu_undangan.nama` atau `?to=` param) | `<p>`/`<div>` | ✅ | ✅ | ✅ |

---

## 2. Profile (Mempelai)

| Selector | JS Method | Data Field | Element | Sakina | Arafa | Medina |
|---|---|---|---|---|---|---|
| `.profile-bride-nickname` | `setText()` | `inv.bride_nickname` | `<p>` | ✅ | ✅ | ✅ |
| `.profile-bride-name` | `setText()` | `inv.bride_name` | `<p>` | ✅ | ✅ | ❌ |
| `.profile-bride-parents` | `setText()` | `buildParents(inv.bride_father, inv.bride_mother)` | `<p>` | ✅ | ✅ | ✅ |
| `.profile-bride-photo` | `setSrc()` | `inv.bride_photo_url` | `<img>` | ✅ | ✅ | ✅ |
| `.profile-bride-ig` | `setHref()` | `https://instagram.com/${inv.bride_instagram}` | `<a>` | ✅ | ✅ | ✅ |
| `.profile-bride-ig-text` | `setText()` | `inv.bride_instagram` | `<span>` | ✅ | ✅ | ✅ |
| `.profile-groom-nickname` | `setText()` | `inv.groom_nickname` | `<p>` | ✅ | ✅ | ✅ |
| `.profile-groom-name` | `setText()` | `inv.groom_name` | `<p>` | ✅ | ✅ | ❌ |
| `.profile-groom-parents` | `setText()` | `buildParents(inv.groom_father, inv.groom_mother)` | `<p>` | ✅ | ✅ | ✅ |
| `.profile-groom-photo` | `setSrc()` | `inv.groom_photo_url` | `<img>` | ✅ | ✅ | ✅ |
| `.profile-groom-ig` | `setHref()` | `https://instagram.com/${inv.groom_instagram}` | `<a>` | ✅ | ✅ | ✅ |
| `.profile-groom-ig-text` | `setText()` | `inv.groom_instagram` | `<span>` | ✅ | ✅ | ✅ |
| `.profile-card` | `querySelectorAll()` | `section_styles.profile` (applyStyleToElement) | `<div>` | ✅ | ❌ | ✅ |
| `.couple-card` | `querySelectorAll()` | `section_styles.profile` (applyStyleToElement) | `<div>` | ❌ | ✅ | ❌ |

**Note:** JS menggunakan combined query `.profile-card, .couple-card` sehingga kedua tema bekerja.

---

## 3. Events (Acara)

### Container

| Selector | JS Method | Data Field | Element | Sakina | Arafa | Medina |
|---|---|---|---|---|---|---|
| `#eventCardsContainer` | `getElementById()` | `events[]` array | `<div>` | ✅ | ✅ | ✅ |

### Generated HTML (oleh `fillEvents()`)

| Class | Data Field | Element |
|---|---|---|
| `.event-type` | `"Prosesi ${i + 1}"` (hardcoded) | `<p>` |
| `.event-name` | `ev.event_name` | `<h3>` |
| `.event-time` | `formatJam(ev.start_time)` + `formatJam(ev.end_time)` | `<p>` |
| `.event-date-text` | `formatTanggal(ev.event_date)` | `<p>` |
| `.event-loc` | `ev.location_name` + `ev.address` | `<p>` |
| `.btn-maps` | `ev.maps_url` | `<a>` |
| `[data-event-idx]` | `events[i].custom_style` (applyStyleToElement) | `<div>` |

---

## 4. Gallery (Galeri)

| Selector | JS Method | Data Field | Element | Sakina | Arafa | Medina |
|---|---|---|---|---|---|---|
| `#galleryContainer` | `getElementById()` | `galleries[]` array | `<div>` | ✅ | ❌ | ✅ |
| `#slide0` | `getElementById()` | `galleries[0].file_url` (cover photo) | `<div>` | ✅ | ❌ | ✅ |
| `#slide1` | `getElementById()` | `galleries[1].file_url` | `<div>` | ✅ | ❌ | ✅ |
| `#slide2` | `getElementById()` | `galleries[2].file_url` | `<div>` | ✅ | ❌ | ✅ |

### Generated HTML (oleh `fillGallery()`)

| Class | Data Field | Element |
|---|---|---|
| `.gallery-img` | `g.file_url`, `g.caption` | `<img>` |

**Note:** Arafa tidak memiliki galeri section.

---

## 5. Mini Gallery (Save the Date)

| Selector | JS Method | Data Field | Element | Sakina | Arafa | Medina |
|---|---|---|---|---|---|---|
| `#miniGalleryTrack` | `getElementById()` | `galleries.slice(0, 4)` | `<div>` | ✅ | ✅ | ✅ |

### Generated HTML (oleh `fillMiniGallery()`)

| Class | Data Field | Element |
|---|---|---|
| `.mini-gallery-item` | `g.file_url`, `g.caption` | `<div>` |

---

## 6. Music

| Selector | JS Method | Data Field | Element | Sakina | Arafa | Medina |
|---|---|---|---|---|---|---|
| `#bgMusic` | `getElementById()` | `inv.music_url` (audio) | `<audio>` | ✅ | ✅ | ✅ |
| `#ytMusicPlayer` | `YT.Player()` | `inv.music_url` (YouTube ID) | `<div>` | ✅ | ✅ | ✅ |

---

## 7. Love Story (Timeline)

| Selector | JS Method | Data Field | Element | Sakina | Arafa | Medina |
|---|---|---|---|---|---|---|
| `.timeline` | `querySelector()` | `love_stories[]` + `section_styles.love_story` | `<div>` | ✅ | ✅ | ✅ |

### Generated HTML (oleh `fillLoveStory()`)

| Class | Data Field | Element |
|---|---|---|
| `.timeline-item` | wrapper | `<div>` |
| `.timeline-date` | `formatBulanTahun(s.event_date)` | `<p>` |
| `.timeline-title` | `s.title` | `<h3>` |
| `.timeline-text` | `s.description` | `<p>` |
| `.timeline-photo` | `s.photo_url` | `<img>` (conditional) |

---

## 8. Countdown

| Selector | JS Method | Data Field | Element | Sakina | Arafa | Medina |
|---|---|---|---|---|---|---|
| `.countdown` / `#countdown` / `.countdown-row` | `querySelector()` | `section_styles.countdown` (applyStyleToElement) | `<div>` | ✅ | ✅ | ✅ |
| `#cd-h` | `getElementById()` | Days (atau Hours) | `<span>` | ✅ | ✅ | ✅ |
| `#cd-j` | `getElementById()` | Hours | `<span>` | ✅ | ✅ | ❌ |
| `#cd-m` | `getElementById()` | Minutes | `<span>` | ✅ | ✅ | ✅ |
| `#cd-s` | `getElementById()` | Seconds | `<span>` | ✅ | ✅ | ✅ |

**Note:** JS mencoba 3 selector sebagai fallback: `.countdown` → `#countdown` → `.countdown-row`

---

## 9. RSVP

### Form Elements (oleh tema, bukan invitation-loader.js)

| Selector | JS Method | Element | Sakina | Arafa | Medina |
|---|---|---|---|---|---|
| `#rsvpName` | `getElementById().value` | `<input>` | ✅ | ✅ | ✅ |
| `#rsvpWishes` | `getElementById().value` | `<textarea>` | ✅ | ✅ | ✅ |

### RSVP Elements (oleh invitation-loader.js)

| Selector | JS Method | Element | Sakina | Arafa | Medina |
|---|---|---|---|---|---|
| `#rsvpPhone` | `getElementById().value` | `<input>` | ❌ | ❌ | ❌ |
| `#rsvpError` | `getElementById().textContent` | unknown | ❌ | ❌ | ✅ |
| `#rsvpSubmitBtn` | `getElementById()` | `<button>` | ❌ | ❌ | ✅ |
| `#rsvpForm` | `getElementById()` | unknown | ❌ | ❌ | ✅ |
| `.rsvp-status.selected` | `querySelector().dataset.status` | `<div>` | ❌ | ❌ | ❌ |

**Note:** Elemen RSVP di atas tidak ada di kedua tema lama. Medina sudah menambahkannya.

---

## 10. Kado Digital (Bank Accounts)

| Selector | JS Method | Data Field | Element | Sakina | Arafa | Medina |
|---|---|---|---|---|---|---|
| `#kadoContainer` | `getElementById()` | `bank_accounts[]` + `section_styles.kado` | `<div>` | ✅ | ✅ | ✅ |

### Generated HTML (oleh `fillKado()`)

| Class | Data Field | Element |
|---|---|---|
| `.gift-card` | wrapper | `<div>` |
| `.gift-bank-logo` | `a.bank_name.substring(0,6)` | `<div>` |
| `.gift-bank-name` | `a.bank_name` atau `a.type` | `<p>` |
| `.gift-account-num` | `a.account_number` | `<p>` |
| `.gift-account-name` | `a.account_name` | `<p>` |
| `.btn-copy` | `window._nikahinCopy()` | `<button>` |
| `#kado-${a.id}` | `a.account_number` (clipboard) | `<p>` |

---

## 11. Quote & Hashtag (Footer)

| Selector | JS Method | Data Field | Element | Sakina | Arafa | Medina |
|---|---|---|---|---|---|---|
| `.footer-quote` | `setText()` | `inv.quote` | `<p>`/`<div>` | ✅ | ✅ | ✅ |
| `.footer-hashtag` | `setText()` | `inv.hashtag` | `<p>`/`<div>` | ✅ | ✅ | ✅ |
| `.footer-section` | `querySelectorAll()` | `section_styles.quote_footer` (applyStyleToElement) | `<footer>` | ✅ | ✅ | ❌ |
| `.quotes-section` | `querySelectorAll()` | `section_styles.quote_footer` (applyStyleToElement) | `<section>` | ❌ | ✅ | ❌ |

**Note:** Medina tidak memiliki `.footer-section` atau `.quotes-section` yang bisa di-style oleh `section_styles.quote_footer`.

---

## 12. Ucapan (Wishes/Guestbook)

| Selector | JS Method | Data Field | Element | Sakina | Arafa | Medina |
|---|---|---|---|---|---|---|
| `#ucapanList` | `getElementById()` | `rsvp_tamu` rows (where `pesan != ''`) | `<div>` | ✅ | ✅ | ✅ |

### Generated HTML (oleh `loadUcapan()`)

| Class | Data Field | Element |
|---|---|---|
| `.ucapan-item` | wrapper | `<div>` |
| `.ucapan-header` | wrapper | `<div>` |
| `.ucapan-name` | `r.nama` | `<span>` |
| `.ucapan-badge` | `r.kehadiran` | `<span>` |
| `.ucapan-badge.hadir` | `r.kehadiran === 'Hadir'` | `<span>` |
| `.ucapan-badge.tidak` | `r.kehadiran === 'Tidak Hadir'` | `<span>` |
| `.ucapan-badge.ragu` | `r.kehadiran === 'Ragu'` | `<span>` |
| `.ucapan-text` | `r.pesan` | `<p>` |

---

## 13. Section Style Overrides (JSONB)

| Section Key | JS Selector | Sakina | Arafa | Medina |
|---|---|---|---|---|
| `profile` | `.profile-card, .couple-card` | ✅ | ✅ | ✅ |
| `gallery` | `#galleryContainer` | ✅ | ❌ | ✅ |
| `love_story` | `.timeline` | ✅ | ✅ | ✅ |
| `kado` | `#kadoContainer` | ✅ | ✅ | ✅ |
| `quote_footer` | `.footer-section, .quotes-section` | Partial | ✅ | ❌ |
| `countdown` | `.countdown` \|\| `#countdown` \|\| `.countdown-row` | ✅ | ✅ | ✅ |

---

## 14. Missing Elements (Gracefully Degraded)

Selector yang di-reference JS tapi tidak ada di HTML kedua tema lama:

| Selector | Purpose | Status |
|---|---|---|
| `#rsvpPhone` | Phone number input | ❌ Tidak ada |
| `#rsvpError` | Error message display | ❌ Tidak ada (Medina sudah menambahkan) |
| `#rsvpSubmitBtn` | Submit button | ❌ Tidak ada (Medina sudah menambahkan) |
| `#rsvpForm` | Form wrapper | ❌ Tidak ada (Medina sudah menambahkan) |
| `.rsvp-status.selected` | Attendance status | ❌ Tidak ada |

Selector yang hanya ada di Sakina (tidak di Arafa):

| Selector | Purpose |
|---|---|
| `#galleryContainer` | Gallery grid |
| `#slide0`, `#slide1`, `#slide2` | Cover background slides |

Selector yang ada di Medina (tidak di Sakina/Arafa):

| Selector | Purpose |
|---|---|
| `#miniGalleryInitials` | Initials display |
| `#cd-j` | Hours (countdown) |

---

## 15. Summary: Selector Usage

### ID-Based (`getElementById`)
```
coverDate, miniGalleryInitials, eventCardsContainer, galleryContainer,
slide0, slide1, slide2, miniGalleryTrack, bgMusic, ytMusicPlayer,
kadoContainer, ucapanList, cd-d, cd-h, cd-m, cd-s,
rsvpName, rsvpWishes, rsvpPhone, rsvpError, rsvpSubmitBtn, rsvpForm
```

### Class-Based (`querySelector`/`querySelectorAll`)
```
.name-bride, .name-groom, .backcover-bride, .backcover-groom,
.profile-bride-nickname, .profile-bride-name, .profile-bride-parents,
.profile-bride-photo, .profile-bride-ig, .profile-bride-ig-text,
.profile-groom-nickname, .profile-groom-name, .profile-groom-parents,
.profile-groom-photo, .profile-groom-ig, .profile-groom-ig-text,
.profile-card, .couple-card,
.timeline, .footer-quote, .footer-hashtag,
.footer-section, .quotes-section,
.rsvp-status.selected
```

### Generated HTML Classes
```
.event-type, .event-name, .event-time, .event-date-text, .event-loc, .btn-maps,
.gallery-img, .mini-gallery-item,
.timeline-item, .timeline-date, .timeline-title, .timeline-text, .timeline-photo,
.gift-card, .gift-bank-logo, .gift-bank-name, .gift-account-num, .gift-account-name, .btn-copy,
.ucapan-item, .ucapan-header, .ucapan-name, .ucapan-badge, .ucapan-text
```

### Medina Theme Compatibility
Medina theme supports all data binding selectors except:
- `#miniGalleryInitials` (not used)
- `#cd-j` (countdown uses `#cd-h` for hours instead)
- `#rsvpPhone` (not implemented)
- `.footer-section` / `.quotes-section` (no section_styles.quote_footer support)

---

## 16. Declarative Data Binding (data-bind)

Sistem baru yang memungkinkan theme developer membind data dari Supabase ke elemen HTML tanpa harus register class/selector di `invitation-loader.js`.

### Cara Penggunaan

```html
<!-- Text content (default) -->
<h3 data-bind="bride_name"></h3>

<!-- Src attribute -->
<img data-bind-src="bride_photo_url">

<!-- Href attribute -->
<a data-bind-href="bride_instagram">Instagram</a>

<!-- Alt attribute -->
<img data-bind-src="bride_photo_url" data-bind-alt="bride_nickname">

<!-- Placeholder -->
<input data-bind-placeholder="guest_name">

<!-- Format text -->
<p data-bind="bride_name" data-format="uppercase"></p>
<p data-bind="groom_name" data-format="capitalize"></p>

<!-- Nested array access -->
<p data-bind="events.0.event_name"></p>
<p data-bind="events.0.location_name"></p>
```

### Supported Attributes

| Attribute | Fungsi | Contoh Value |
|---|---|---|
| `data-bind` | Isi textContent | `bride_name`, `guest_name` |
| `data-bind-src` | Set src attribute | `bride_photo_url` |
| `data-bind-href` | Set href attribute | `bride_instagram` |
| `data-bind-alt` | Set alt attribute | `bride_nickname` |
| `data-bind-placeholder` | Set placeholder | `guest_name` |
| `data-format` | Format text output | `uppercase`, `lowercase`, `capitalize` |

### Available Fields

Semua field dari `invitations` table tersedia langsung:

| Field | Deskripsi |
|---|---|
| `bride_name` | Nama lengkap mempelai wanita |
| `bride_nickname` | Nama panggilan mempelai wanita |
| `bride_photo_url` | URL foto mempelai wanita |
| `bride_father` | Nama ayah mempelai wanita |
| `bride_mother` | Nama ibu mempelai wanita |
| `bride_instagram` | Instagram mempelai wanita |
| `groom_name` | Nama lengkap mempelai pria |
| `groom_nickname` | Nama panggilan mempelai pria |
| `groom_photo_url` | URL foto mempelai pria |
| `groom_father` | Nama ayah mempelai pria |
| `groom_mother` | Nama ibu mempelai pria |
| `groom_instagram` | Instagram mempelai pria |
| `quote` | Kutipan undangan |
| `hashtag` | Hashtag undangan |
| `music_url` | URL musik |

### Computed Fields

| Field | Deskripsi | Contoh |
|---|---|---|
| `guest_name` | Nama tamu undangan | "Budi Santoso" |
| `event_date_formatted` | Tanggal acara terformat | "Senin, 25 Desember 2025" |
| `event_date` | Tanggal acara (YYYY-MM-DD) | "2025-12-25" |
| `event_time` | Waktu acara | "09.00 WIB" |
| `bride_initial` | Inisial mempelai wanita | "A" |
| `groom_initial` | Inisial mempelai pria | "B" |
| `bride_groom_initials` | Inisial gabungan | "A & B" |

### Nested Array Access

Untuk mengakses data dari array (events, galleries, dll):

```html
<p data-bind="events.0.event_name"></p>      <!-- Nama acara pertama -->
<p data-bind="events.0.location_name"></p>   <!-- Lokasi acara pertama -->
<p data-bind="events.1.event_name"></p>      <!-- Nama acara kedua -->
```

### Contoh Penggunaan di Theme

```html
<!-- Hero section dengan nama mempelai -->
<section class="hero">
  <h1 data-bind="bride_name" data-format="uppercase"></h1>
  <p class="subtitle">&</p>
  <h1 data-bind="groom_name" data-format="uppercase"></h1>
</section>

<!-- Photo mempelai -->
<div class="bride-photo">
  <img data-bind-src="bride_photo_url" data-bind-alt="bride_nickname">
</div>

<!-- Instagram link -->
<a class="ig-link" data-bind-href="bride_instagram">
  Follow <span data-bind="bride_instagram"></span>
</a>

<!-- Guest greeting -->
<p>Halo, <span data-bind="guest_name"></span>!</p>

<!-- Event details -->
<div class="event">
  <h3 data-bind="events.0.event_name"></h3>
  <p data-bind="event_date_formatted"></p>
  <p data-bind="event_time"></p>
</div>
```

### Backward Compatibility

Sistem class-based lama (`.name-bride`, `.profile-bride-name`, dll) tetap bekerja. Sistem `data-bind` adalah tambahan, bukan pengganti. Kedua sistem bisa digunakan bersamaan dalam satu tema.
