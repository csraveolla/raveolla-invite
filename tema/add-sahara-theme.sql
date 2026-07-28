-- ================================================================
-- Migration: Daftarkan tema sahara
-- Jalankan di Supabase SQL Editor
-- ================================================================

-- 1. Insert tema sahara (jika belum ada)
INSERT INTO themes (name, theme_code, is_active, sort_order)
SELECT 'sahara', 'sahara', true, 3
WHERE NOT EXISTS (SELECT 1 FROM themes WHERE name = 'sahara')
RETURNING id;

-- 2. Lihat semua themes yang ada
SELECT id, name, theme_code, is_active FROM themes ORDER BY sort_order;

-- 3. Update invitation untuk pakai tema sahara
-- Ganti 'nama-slug' dengan slug undangan yang ingin diubah
--
-- UPDATE invitations
-- SET theme_id = (SELECT id FROM themes WHERE name = 'sahara')
-- WHERE slug = 'nama-slug';

-- ================================================================
-- Cara pakai:
-- 1. Buka Supabase Dashboard -> SQL Editor
-- 2. Copy jalur INSERT di atas
-- 3. Run query
-- 4. Copy id yang di-return
-- 5. Jalankan UPDATE dengan mengganti 'nama-slug'
-- 6. Test: buka http://localhost:8080/nama-slug
-- ================================================================
