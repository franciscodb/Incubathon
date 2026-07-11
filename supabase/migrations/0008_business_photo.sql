-- =====================================================================
-- CumplIA — Foto del negocio
-- Agrega la columna photo_url a businesses. Idempotente y aditiva
-- (no afecta datos existentes). El backend la llena vía
-- POST /businesses/{id}/photo (Supabase Storage, bucket público).
-- =====================================================================
alter table public.businesses
    add column if not exists photo_url text;
