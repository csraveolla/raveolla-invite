-- Add qr_token column to rsvp_tamu table
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)

ALTER TABLE public.rsvp_tamu
ADD COLUMN IF NOT EXISTS qr_token text;

-- Create index for fast QR lookups
CREATE INDEX IF NOT EXISTS idx_rsvp_tamu_qr_token
ON public.rsvp_tamu (qr_token)
WHERE qr_token IS NOT NULL;
