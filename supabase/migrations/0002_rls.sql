-- =====================================================================
-- Buró de Cumplimiento Regulatorio
-- Migración 0002: Row Level Security (RLS) básica por usuario
-- =====================================================================
-- El backend usa la SERVICE ROLE KEY (bypassa RLS). Estas políticas
-- protegen el acceso directo desde el cliente (anon key) por si el
-- frontend consulta Supabase directamente.

-- ---------- profiles ----------
alter table public.profiles enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
    for select using (auth.uid() = id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
    for insert with check (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
    for update using (auth.uid() = id);

-- ---------- businesses ----------
alter table public.businesses enable row level security;

drop policy if exists businesses_all_own on public.businesses;
create policy businesses_all_own on public.businesses
    for all using (owner_id = auth.uid())
    with check (owner_id = auth.uid());

-- ---------- procedures_catalog (lectura pública) ----------
alter table public.procedures_catalog enable row level security;

drop policy if exists procedures_catalog_read on public.procedures_catalog;
create policy procedures_catalog_read on public.procedures_catalog
    for select using (true);

-- ---------- business_procedures (a través del negocio dueño) ----------
alter table public.business_procedures enable row level security;

drop policy if exists business_procedures_own on public.business_procedures;
create policy business_procedures_own on public.business_procedures
    for all using (
        exists (
            select 1 from public.businesses b
            where b.id = business_procedures.business_id
              and b.owner_id = auth.uid()
        )
    )
    with check (
        exists (
            select 1 from public.businesses b
            where b.id = business_procedures.business_id
              and b.owner_id = auth.uid()
        )
    );

-- ---------- documents (a través del negocio dueño) ----------
alter table public.documents enable row level security;

drop policy if exists documents_own on public.documents;
create policy documents_own on public.documents
    for all using (
        exists (
            select 1 from public.businesses b
            where b.id = documents.business_id
              and b.owner_id = auth.uid()
        )
    )
    with check (
        exists (
            select 1 from public.businesses b
            where b.id = documents.business_id
              and b.owner_id = auth.uid()
        )
    );

-- ---------- professionals (lectura pública, escritura del dueño) ----------
alter table public.professionals enable row level security;

drop policy if exists professionals_read on public.professionals;
create policy professionals_read on public.professionals
    for select using (true);

drop policy if exists professionals_insert_own on public.professionals;
create policy professionals_insert_own on public.professionals
    for insert with check (user_id = auth.uid());

drop policy if exists professionals_update_own on public.professionals;
create policy professionals_update_own on public.professionals
    for update using (user_id = auth.uid());

-- ---------- professional_certifications ----------
alter table public.professional_certifications enable row level security;

drop policy if exists prof_cert_read on public.professional_certifications;
create policy prof_cert_read on public.professional_certifications
    for select using (true);

drop policy if exists prof_cert_manage_own on public.professional_certifications;
create policy prof_cert_manage_own on public.professional_certifications
    for all using (
        exists (
            select 1 from public.professionals p
            where p.id = professional_certifications.professional_id
              and p.user_id = auth.uid()
        )
    )
    with check (
        exists (
            select 1 from public.professionals p
            where p.id = professional_certifications.professional_id
              and p.user_id = auth.uid()
        )
    );

-- ---------- contact_requests ----------
alter table public.contact_requests enable row level security;

-- El solicitante (dueño de negocio) crea y ve sus solicitudes.
drop policy if exists contact_requests_requester on public.contact_requests;
create policy contact_requests_requester on public.contact_requests
    for all using (requester_id = auth.uid())
    with check (requester_id = auth.uid());

-- El profesional destinatario puede ver las solicitudes dirigidas a él.
drop policy if exists contact_requests_professional_read on public.contact_requests;
create policy contact_requests_professional_read on public.contact_requests
    for select using (
        exists (
            select 1 from public.professionals p
            where p.id = contact_requests.professional_id
              and p.user_id = auth.uid()
        )
    );
