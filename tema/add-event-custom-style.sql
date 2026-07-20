-- ================================================================
-- Migration: Per-section custom styling
-- ================================================================

-- 1. Tambah kolom custom_style (JSONB) ke tabel events (sudah ada sebelumnya)
ALTER TABLE events ADD COLUMN IF NOT EXISTS custom_style jsonb DEFAULT NULL;

-- 2. Tambah kolom section_styles (JSONB) ke tabel invitations
-- Menyimpan style untuk section: gallery, love_story, kado, countdown, quote_footer
-- Struktur JSON:
-- {
--   "gallery":     { "bg_color":"", "text_color":"", "accent_color":"", "border":"", "border_radius":"", "font_family":"", "box_shadow":"" },
--   "love_story":  { "bg_color":"", "text_color":"", "accent_color":"", "border":"", "border_radius":"", "font_family":"", "box_shadow":"" },
--   "kado":        { "bg_color":"", "text_color":"", "accent_color":"", "border":"", "border_radius":"", "font_family":"", "box_shadow":"" },
--   "countdown":   { "bg_color":"", "text_color":"", "accent_color":"", "border":"", "border_radius":"", "font_family":"", "box_shadow":"" },
--   "quote_footer": { "bg_color":"", "text_color":"", "accent_color":"", "border":"", "border_radius":"", "font_family":"", "box_shadow":"" }
-- }
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS section_styles jsonb DEFAULT NULL;
