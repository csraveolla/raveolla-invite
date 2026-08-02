# Rencana: Penyimpanan Foto Galeri Hybrid (Hosting PHP + Supabase Storage, Auto-fallback)

## Gambaran
Upload foto galeri mencoba **hosting PHP** (`raveolla.my.id`) dulu; jika endpoint error/timeout, otomatis jatuh ke **Supabase Storage** (jalur lama, tetap dipertahankan). `galleries.file_url` tetap string URL → loader & DB tidak berubah. Foto lama di Supabase tetap valid.

## Latar belakang
- `galleries.file_url` adalah string URL yang langsung dipakai sebagai `<img src>` di `tema/assets/invitation-loader.js:289` — foto bisa berasal dari mana saja.
- Saat ini upload menuju Supabase Storage bucket `gallery-photos`.
- Tujuan: memanfaatkan disk hosting PHP (raveolla.my.id, Apache + PHP) sebagai penyimpanan utama, dengan Supabase Storage sebagai cadangan otomatis.

## 1. File baru (server side)

### `tema/upload.php` — endpoint upload
- `POST` multipart (`file`), dengan auth 2 mode:
  - **Admin**: header `Authorization: Bearer <jwt-supabase>` → diverifikasi via `GET {SUPABASE_URL}/auth/v1/user`.
  - **Client**: header `X-Client-Token: <token>` → diverifikasi via REST `clients?token=eq.X&select=id` pakai anon key.
- Validasi:
  - Ekstensi whitelist: `jpg`, `jpeg`, `png`, `webp`, `gif`.
  - Ukuran maks: 5MB.
  - Cek `getimagesize()`.
- Simpan ke `tema/uploads/galleries/<random>.<ext>` (nama file acak, tanpa path dari user).
- Response JSON: `{ "url": "https://raveolla.my.id/tema/uploads/galleries/<file>" }`.
- Header CORS: `Access-Control-Allow-Origin: *` + handler `OPTIONS` (preflight) — panel admin/client di-deploy di Cloudflare Pages (origin beda).
- Baca config dari `tema/upload-config.php`.

### `tema/uploads/.htaccess`
- `php_flag engine off`, `Options -Indexes` (deny directory listing), deni eksekusi script.

### `tema/upload-config.php` (gitignored)
- Isi manual di server: `SUPABASE_URL`, `SUPABASE_KEY`, `UPLOAD_BASE_URL`.

Catatan: root `.htaccess:18-21` sudah melayani file yang ada secara langsung, jadi `tema/upload.php` & file upload bisa diakses tanpa rewrite tambahan.

## 2. Perubahan frontend

### `rsvp-admin/js/api.js`
- Tambah `export const UPLOAD_ENDPOINT = E.UPLOAD_ENDPOINT || 'https://raveolla.my.id/tema/upload.php'`.

### `rsvp-admin/js/invitation.js` — `uploadInvGallery()` (baris 547)
- Bungkus upload jadi helper `uploadImageToHosting(file, token)`:
  1. POST `FormData` ke `UPLOAD_ENDPOINT` (timeout ~10s).
  2. Jika sukses → pakai `url` hasil.
  3. Jika gagal → `console.warn` lalu lanjut ke jalur Supabase Storage yang lama (baris 560-571).

### `rsvp-client/js/config.js`
- Tambah `UPLOAD_ENDPOINT`.

### `rsvp-client/js/invitation.js` — `uploadGalleryPhotos()` (baris 660)
- Pola sama: token client dari sessionStorage, fallback ke `.storage.upload()` yang lama (baris 678).

### `.env.example`
- Tambah `UPLOAD_ENDPOINT: 'https://raveolla.my.id/tema/upload.php'`.

### `.gitignore`
- Tambah `tema/upload-config.php` dan `tema/uploads/`.

## 3. Ruang lingkup
- **Inti**: upload galeri (admin + client).
- **Opsional (menyusul)**: `uploadInvQris` / `uploadInvPhoto` (admin) dan `uploadProfilePhoto` / `uploadQrisImage` (client) — pola sama persis, tinggal disamakan.

## 4. Keamanan
- Tanpa token valid → 403.
- Nama file direname acak, ekstensi di-whitelist.
- PHP engine dimatikan di folder upload (anti webshell).
- Supabase Storage tetap bisa dipakai untuk foto lama — `file_url` lama tetap valid.

## 5. Testing
- Dev server Python (`serve.py`) tidak menjalankan PHP → uji endpoint dengan `php -S localhost:8090 -t tema`, atau langsung deploy ke hosting.
- Kasus uji:
  1. Upload normal → tersimpan di hosting.
  2. Endpoint dimatikan/ditutup → otomatis fallback ke Supabase Storage.
  3. Cek undangan (mis. `/john-jane`) menampilkan foto dari kedua sumber.

## File yang terpengaruh
| Tipe | Path | Aksi |
|------|------|------|
| Baru | `tema/upload.php` | Buat |
| Baru | `tema/uploads/.htaccess` | Buat |
| Baru | `tema/upload-config.php` | Buat (gitignored) |
| Edit | `rsvp-admin/js/api.js` | Tambah `UPLOAD_ENDPOINT` |
| Edit | `rsvp-admin/js/invitation.js` | `uploadInvGallery()` + helper |
| Edit | `rsvp-client/js/config.js` | Tambah `UPLOAD_ENDPOINT` |
| Edit | `rsvp-client/js/invitation.js` | `uploadGalleryPhotos()` |
| Edit | `.env.example` | Tambah `UPLOAD_ENDPOINT` |
| Edit | `.gitignore` | Tambah `tema/upload-config.php`, `tema/uploads/` |
