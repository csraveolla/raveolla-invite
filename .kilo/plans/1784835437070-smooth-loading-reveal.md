# Plan: Smooth Loading Reveal untuk Semua Tema

## Masalah
Saat halaman undangan dimuat, user melihat flash data default/fallback sebelum data asli dari Supabase muncul. Ini terjadi karena:
1. HTML tema berisi data statis fallback (misal "Romeo & Juliet")
2. `invitation-loader.js` fetch data secara async
3. DOM baru di-update setelah data arrives
4. User melihat default data selama jeda network

## Solusi
Implementasi **loading state + slide-down reveal** yang konsisten untuk semua tema:
- **sakina** (dark theme)
- **arafa** (light theme)  
- **medina** (new theme)

### Prinsip Desain
1. **Sembunyikan konten utama** hingga data siap
2. **Tampilkan loading indicator** yang subtle
3. **Slide-down smooth** saat data loaded menggunakan CSS transition
4. **Koordinasi dengan cover screen** untuk sakina/arafa
5. **Minim perubahan per tema** — gunakan shared CSS + JS terpusat

---

## Perubahan yang Akan Dilakukan

### 1. Shared CSS (`tema/assets/nk-design.css`)
Tambah blok CSS untuk loading state:

```css
/* ================================================================
   LOADING STATE & SLIDE-DOWN REVEAL
   ================================================================ */

/* Main content hidden during load */
[data-loading="true"] #main-content,
[data-loading="true"] #main,
[data-loading="true"] .main {
  opacity: 0;
  transform: translateY(-30px);
  transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

/* Reveal when loaded */
[data-loaded="true"] #main-content,
[data-loaded="true"] #main,
[data-loaded="true"] .main {
  opacity: 1;
  transform: translateY(0);
}

/* Loading overlay */
.nk-loading-overlay {
  position: fixed;
  inset: 0;
  z-index: 45;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  opacity: 1;
  transition: opacity 0.6s ease 0.2s, visibility 0.6s ease 0.2s;
}

[data-loaded="true"] .nk-loading-overlay {
  opacity: 0;
  visibility: hidden;
}

.nk-loading-spinner {
  width: 32px;
  height: 32px;
  border: 2px solid rgba(0, 0, 0, 0.08);
  border-top-color: var(--accent, #c5a059);
  border-radius: 50%;
  animation: nk-spin 0.8s linear infinite;
}

@keyframes nk-spin {
  to { transform: rotate(360deg); }
}
```

### 2. `tema/assets/invitation-loader.js`
Modifikasi `loadInvitation()`:

**Di awal fungsi (setelah ambil slug):**
```js
document.body.setAttribute('data-loading', 'true')
```

**Sebelum `nikahin:loaded` event dispatch:**
```js
document.body.removeAttribute('data-loading')
document.body.setAttribute('data-loaded', 'true')
```

**Di error handler (ketika invitations.length === 0):**
```js
document.body.removeAttribute('data-loading')
document.body.removeAttribute('data-loaded')
```

### 3. Perubahan Per Tema

#### Semua Tema (sakina, arafa, medina)
Tambahkan HTML loading indicator sebelum closing `</body>`:
```html
<div class="nk-loading-overlay" aria-hidden="true">
  <div class="nk-loading-spinner"></div>
</div>
```

#### sakina (`tema/sakina/index.html`)
- Tambah `.nk-loading-overlay` sebelum `</body>`
- Modify `InvitationOpener.init()` callback:
  - `onReveal`: Jangan langsung hide cover. Tunggu `data-loaded="true"` sebelum animasi cover dismissal.
  - `onReady`: Trigger setelah data loaded + cover dismissed.

#### arafa (`tema/arafa/index.html`)
- Tambah `.nk-loading-overlay` sebelum `</body>`
- Modify `InvitationOpener.init()` callback:
  - Sama seperti sakina, koordinasikan cover dismissal dengan loading state.

#### medina (`tema/medina/index.html`)
- Tambah `.nk-loading-overlay` sebelum `</body>`
- Tidak ada cover, jadi loading overlay langsung terlihat saat page load
- Saat data loaded, overlay fade out + `#main` slide down

---

## Alur Kerja

### Before (current)
```
Page Load → HTML with defaults visible → fetch data → update DOM → flash of defaults → real data
```

### After
```
Page Load → body[data-loading] → main content hidden, spinner visible
           → fetch data in background
           → nikahin:loaded fires
           → body[data-loaded] → spinner fades out, main content slides down smoothly
```

### Untuk sakina/arafa dengan cover
```
Page Load → body[data-loading] → cover visible, main content hidden behind cover
           → fetch data in background
           → User klik "Buka Undangan"
           → Jika data loaded: cover slides away + main content slides down
           → Jika data belum loaded: cover tetap, spinner muncul di cover
           → Setelah data loaded: cover slides away + main content slides down
```

---

## Detail Teknis

### CSS Transition
- **Duration**: 0.8s
- **Easing**: `cubic-bezier(0.16, 1, 0.3, 1)` (smooth ease-out)
- **Transform**: `translateY(-30px)` → `translateY(0)`
- **Opacity**: `0` → `1`

### Loading Indicator
- Fixed overlay, z-index 45 (di bawah cover z-index 50-100)
- Centered spinner, 32px
- Spinner color: `var(--accent, #c5a059)` — fallback ke gold untuk medina
- Auto-hide dengan delay 0.2s setelah data loaded

### State Management
- `data-loading="true"` — set oleh `invitation-loader.js` pada init
- `data-loaded="true"` — set oleh `invitation-loader.js` setelah semua data terisi
- Kedua attribute di-remove saat error (invitation tidak ditemukan)

### Edge Cases
1. **Data load cepat (<500ms)**: Loading state tetap ditampilkan minimal 300ms agar animasi terlihat
2. **Data load lambat**: Loading indicator tetap visible sampai data siap
3. **Error fetch**: State dibersihkan, error message ditampilkan
4. **User klik sebelum data loaded** (sakina/arafa): Cover tetap menutupi, spinner muncul

---

## File yang Akan Diubah

1. `tema/assets/nk-design.css` — tambah loading CSS
2. `tema/assets/invitation-loader.js` — tambah state management
3. `tema/sakina/index.html` — tambah loader HTML + adjust InvitationOpener callback
4. `tema/arafa/index.html` — tambah loader HTML + adjust InvitationOpener callback
5. `tema/medina/index.html` — tambah loader HTML

---

## Validasi

1. **Visual test**: Buka setiap theme dengan slug valid
   - Pastikan tidak ada flash data default
   - Pastikan loading spinner muncul
   - Pastikan slide-down animation smooth saat data loaded
2. **Network throttle test**: Simulasi network lambat (Chrome DevTools)
   - Pastikan loading state tetap visible selama fetch
   - Pastikan animasi tetap smooth setelah data arrives
3. **Error test**: Buka slug tidak valid
   - Pastikan loading state di-cleanup
   - Pastikan error message terlihat
4. **Cover coordination test** (sakina/arafa):
   - Klik "Buka Undangan" sebelum data loaded → cover tetap
   - Klik setelah data loaded → smooth transition

---

## Pertanyaan untuk User

1. Apakah loading indicator harus menampilkan teks "Memuat..." selain spinner?
2. Apakah animasi slide-down harus memiliki durasi tertentu (misal 0.8s) atau bisa diadjust per tema?
3. Untuk sakina/arafa, apakah cover harus tetap bisa diklik saat data belum loaded, atau harus di-disable sampai data ready?

**Rekomendasi**: 
- Ya, tambah teks "Memuat..." di bawah spinner untuk UX yang lebih jelas
- Durasi 0.8s dengan easing `cubic-bezier(0.16, 1, 0.3, 1)` sudah optimal
- Untuk sakina/arafa, cover bisa tetap diklik, tapi jika data belum ready tampilkan spinner di tengah cover
