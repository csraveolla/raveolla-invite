# Deploy & Setup Cron — Fitur Terjadwal

Semua reminder terjadwal (RSVP, H-3/H-1, Ucapan, Kirim massal) dieksekusi oleh
**edge function** yang dipicu HTTP dari cron eksternal (cron-job.org, GitHub
Actions, atau Supabase Scheduled Functions). Tanpa trigger ini, tidak ada
satupun yang berjalan — browser admin TIDAK perlu terbuka.

---

## 1. Deploy Edge Functions

```bash
# dari root project
npx supabase login
npx supabase link --project-ref <PROJECT_REF>

npx supabase functions deploy check-reminder        --no-verify-jwt
npx supabase functions deploy execute-jadwal        --no-verify-jwt
npx supabase functions deploy send-reminder-rsvp    --no-verify-jwt
npx supabase functions deploy send-reminder-ucapan  --no-verify-jwt
```

> **`--no-verify-jwt` penting.** Cron job tidak mengirim JWT user. Tanpa flag
> ini, request cron akan ditolak (401) dan reminder tidak pernah jalan.
> Alternatif: kirim header `Authorization: Bearer <SERVICE_ROLE_KEY>` dari cron.

### Env variables yang wajib diset (semua function)

| Variable | Keterangan |
|---|---|
| `SUPABASE_URL` | Otomatis tersedia (built-in) |
| `SUPABASE_SERVICE_ROLE_KEY` | Otomatis tersedia (built-in) |
| `ADMIN_API_KEY` | **Opsional.** Key Fonnte admin. Jika tidak diset, function otomatis membaca dari tabel `admin_settings` (row `admin_apikey`) — sama seperti panel admin. |

> Bila `ADMIN_API_KEY` env tidak diset, function akan fallback membaca key dari
> tabel `admin_settings`. Pastikan key Fonnte sudah diisi di **RSVP Admin →
> Konfigurasi WhatsApp Admin** dan tersimpan sebagai `admin_apikey`.

```bash
npx supabase secrets set ADMIN_API_KEY="<fonnte-admin-api-key>" --project-ref <PROJECT_REF>
```

---

## 2. Setup Cron Job

Buat job di cron-job.org (atau scheduler lain) yang melakukan `POST` ke URL
function. Hanya **satu cron per function** yang dibutuhkan — gating jam sudah
ditangani di dalam kode.

### URL function

```
https://<PROJECT_REF>.supabase.co/functions/v1/<nama-function>
```

### Jadwal yang disarankan

| Function | Jadwal | Keterangan |
|---|---|---|
| `execute-jadwal` | Setiap jam (`0 * * * *`) | Kirim massal terjadwal (`kirim_jadwal`); batch besar dilanjutkan tiap jam |
| `check-reminder` | Jam 08:00 WIB tiap hari | H-3 / H-1. Gating internal: hanya proses saat jam 08:00–08:59 WIB |
| `send-reminder-rsvp` | Jam 08:00 WIB tiap hari | Reminder RSVP terjadwal. Gating internal: jam 08:00–08:59 WIB |
| `send-reminder-ucapan` | Jam 10:00 WIB tiap hari | Ucapan terima kasih terjadwal. Gating internal: jam 10:00–10:59 WIB |

> Cron di **cron-job.org** menggunakan UTC. 08.00 WIB = **01:00 UTC**, 10.00 WIB
> = **03:00 UTC**. Jika jadwal cron meleset sedikit, gating internal akan
> meng-*skip* eksekusi di jam yang salah — jangan panik, tinggal perbaiki
> jadwal cronnya.

### Body / Method

- `execute-jadwal`, `check-reminder`: body kosong, method `POST` (GET juga aman).
- `send-reminder-rsvp`, `send-reminder-ucapan`: body kosong `POST` = mode terjadwal
  (membaca semua client dengan jadwal hari ini). Kirim body
  `{"client_id": "<uuid>"}` untuk mode manual (dipakai tombol "Kirim Sekarang").

---

## 3. Urutan Data

1. **Reminder RSVP / Ucapan**: client memilih tanggal di panel → tersimpan di
   `clients.reminder_rsvp_jadwal` / `reminder_ucapan_jadwal` (+ `_aktif`). Saat
   cron memanggil function di tanggal tsb (jam sesuai gating), function mengirim
   WA & mencatat di `reminder_log` + `wa_log`.
2. **H-3 / H-1**: client menyalakan `reminder_h3`/`reminder_h1` + mengisi
   `tanggal_acara`. Setiap hari jam 08:00 WIB, `check-reminder` menghitung
   H-3 (tanggal_acara − 3 hari) dan H-1 (tanggal_acara − 1 hari), lalu kirim ke
   tamu yang sudah RSVP **Hadir**.
3. **Kirim massal terjadwal**: client memilih "Jadwal" di tab Kirim →
   tersimpan di `kirim_jadwal` (status `terjadwal`). `execute-jadwal` memproses
   tiap jam, batch 50/client, lanjut otomatis jam berikutnya sampai `terkirim`.

---

## 4. Verifikasi

1. **Fungsi jalan?** → Supabase Dashboard → Edge Functions → buka Logs.
   - Cek log `[check-reminder]` / `[execute-jadwal]` / `[send-reminder-*]`.
   - Kalau ada `401 Unauthorized` → cron tidak mengirim auth / function masih
     `verify_jwt`. Redeploy dengan `--no-verify-jwt` atau tambah header auth.
   - Kalau ada `Tidak ada API key — skip` → isi `admin_apikey` di panel admin
     ATAU set env `ADMIN_API_KEY`.
2. **Data terkirim?** → cek tabel `wa_log` dan `reminder_log` (tipe
   `rsvp`/`h3`/`h1`/`ucapan`/`massal`). `kirim_jadwal.status` = `terkirim`.
3. **Kuota terpotong?** → `clients.wa_terkirim` bertambah hanya untuk pesan
   yang sukses diterima Fonnte (`status: true`).
