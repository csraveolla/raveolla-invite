-- ================================================================
-- Migration: Add columns needed by Edge Functions
-- Jalankan di Supabase SQL Editor
-- ================================================================

-- 1. Kolom terkirim di kirim_jadwal (tracking progress batch)
ALTER TABLE public.kirim_jadwal
ADD COLUMN IF NOT EXISTS terkirim int DEFAULT 0;

-- 2. Kolom reminder_ucapan_target di clients (filter target ucapan)
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS reminder_ucapan_target text DEFAULT 'hadir';
