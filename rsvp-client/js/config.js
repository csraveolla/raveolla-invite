// ============================================================
// config.js — Konfigurasi & Konstanta Global
// Secrets dari /env.js (window.__ENV)
// ============================================================

const E = window.__ENV || {};
export const SB  = E.SUPABASE_URL || '';
export const KEY = E.SUPABASE_KEY || '';

export const H   = {
  'apikey':        KEY,
  'Authorization': `Bearer ${KEY}`,
  'Content-Type':  'application/json'
};

export const DEFAULT_TEMPLATE = `*_Assalamualaikum warahmatullahi wabarakatuh._*

Dengan rahmat dan rida Allah SWT, kami bermaksud mengundang Bapak/Ibu/Saudara/i *{nama}* di acara pernikahan kami, yang InsyaAllah akan berlangsung pada:

*Hari : Sabtu*
Tanggal : *15 Juni 2025*
Pukul : 09.00 WIB s.d Selesai
Tempat : Jl. Tamanharapan III, Surabaya

Merupakan suatu kehormatan bagi kami apabila Bapak/Ibu/Saudara/i *{nama}* berkenan hadir untuk memberikan doa restu kepada kami

*_Wassalamu'alaikum Warahmatullahi Wabarakatuh_*

_kami yang berbahagia_ 
*nama kedua mempelai*

_undangan dan konfirmasi kehadiran melalui link ini:_
{link}`;

export const PAKET_FEATURES = {
  lite:    { wa_text: false, komentar: false, kirim_tab: false, reminder: false, jadwal: false, ucapan: false, max_tamu: 50,  max_wa: 0   },
  pro:     { wa_text: true,  komentar: true,  kirim_tab: true,  reminder: false, jadwal: false, ucapan: false, max_tamu: 150, max_wa: 150 },
  premium: { wa_text: true,  komentar: true,  kirim_tab: true,  reminder: true,  jadwal: true,  ucapan: true,  max_tamu: 300, max_wa: 300 }
};

export const TZ      = 'Asia/Jakarta';
export const PER     = 20;  // item per halaman tabel
export const DOMAIN  = E.PUBLIC_DOMAIN || '';
export const FONNTE  = E.FONNTE_API    || '';
