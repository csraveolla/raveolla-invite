-- ================================================================
-- Migration: Daftarkan tema medina
-- Jalankan di Supabase SQL Editor
-- ================================================================

-- 1. Insert tema medina (jika belum ada)
INSERT INTO themes (name) 
SELECT 'medina' 
WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = 'medina')
RETURNING id;

-- 2. Lihat semua themes yang ada
SELECT id, name FROM themes ORDER BY id;

-- 3. Update invitation untuk pakai tema medina
-- Ganti 'nama-slug' dengan slug undangan yang ingin diubah
--
-- UPDATE invitations 
-- SET theme_id = (SELECT id FROM themes WHERE name = 'medina') 
-- WHERE slug = 'nama-slug';

-- 4. Verifikasi
-- SELECT i.slug, i.theme_id, t.name as theme_name
-- FROM invitations i
-- JOIN themes t ON i.theme_id = t.id
-- WHERE t.name = 'medina';

-- ================================================================
-- Cara pakai:
-- 1. Buka Supabase Dashboard → SQL Editor
-- 2. Copy jalur INSERT di atas
-- 3. Run query
-- 4. Copy id yang di-return (misal: 3)
-- 5. Jalankan UPDATE dengan mengganti 'nama-slug'
-- 6. Test: buka http://localhost:8080/nama-slug
-- ================================================================
