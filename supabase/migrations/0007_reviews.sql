-- =====================================================================
-- Buró de Cumplimiento Regulatorio
-- Migración 0007: Evaluaciones de profesionales (reviews)
-- =====================================================================
-- Solo puede evaluar quien tuvo una conexión *cerrada* (contact_requests
-- con status='cerrado') con el profesional. La validación se hace en el
-- backend; aquí se define la tabla + RLS de lectura pública.

create table if not exists public.reviews (
    id                  uuid primary key default gen_random_uuid(),
    professional_id     uuid not null references public.professionals (id) on delete cascade,
    requester_id        uuid references public.profiles (id) on delete set null,
    business_id         uuid references public.businesses (id) on delete set null,
    contact_request_id  uuid references public.contact_requests (id) on delete set null,
    rating              integer not null check (rating between 1 and 5),
    comment             text,
    author_name         text,
    created_at          timestamptz not null default now(),
    unique (professional_id, requester_id)
);

create index if not exists reviews_professional_idx on public.reviews (professional_id);

-- ---------- RLS ----------
alter table public.reviews enable row level security;

-- Lectura pública de las reseñas.
drop policy if exists reviews_read on public.reviews;
create policy reviews_read on public.reviews
    for select using (true);

-- El autor puede insertar su propia reseña (el backend valida el engagement).
drop policy if exists reviews_insert_own on public.reviews;
create policy reviews_insert_own on public.reviews
    for insert with check (requester_id = auth.uid());
