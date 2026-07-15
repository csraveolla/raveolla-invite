-- ============================================================
-- Migration: Update domain from nikahin.id to raveolla.my.id
-- Run this in Supabase SQL Editor before deploying
-- ============================================================

-- Update all existing base_url values in clients table
UPDATE clients 
SET base_url = REPLACE(base_url, 'https://nikahin.id', 'https://raveolla.my.id')
WHERE base_url LIKE '%nikahin.id%';

-- Verify the changes
SELECT id, nama_acara, base_url, slug 
FROM clients 
WHERE base_url IS NOT NULL;
