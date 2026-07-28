-- Add pos_id column to rsvp_tamu table for guest seating position
ALTER TABLE public.rsvp_tamu
ADD COLUMN IF NOT EXISTS pos_id text;

-- Add waktu_hadir if not exists (used by scanner for check-in timestamp)
ALTER TABLE public.rsvp_tamu
ADD COLUMN IF NOT EXISTS waktu_hadir timestamptz;
