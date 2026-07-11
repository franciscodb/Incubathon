-- =====================================================================
-- Buró de Cumplimiento Regulatorio
-- Migración 0005: Buckets de Storage y políticas de acceso
-- =====================================================================
-- Bucket "documents": documentos de trámites de los negocios.
-- Bucket "certifications": certificaciones de los profesionales.

insert into storage.buckets (id, name, public)
values
    ('documents', 'documents', false),
    ('certifications', 'certifications', true)
on conflict (id) do nothing;

-- ---------- documents (privado, por dueño) ----------
-- Convención de ruta: {business_id}/{filename}. Se valida contra la
-- propiedad del negocio usando el primer segmento de la ruta.

drop policy if exists documents_bucket_read on storage.objects;
create policy documents_bucket_read on storage.objects
    for select using (
        bucket_id = 'documents'
        and exists (
            select 1 from public.businesses b
            where b.owner_id = auth.uid()
              and b.id::text = (storage.foldername(name))[1]
        )
    );

drop policy if exists documents_bucket_write on storage.objects;
create policy documents_bucket_write on storage.objects
    for insert with check (
        bucket_id = 'documents'
        and exists (
            select 1 from public.businesses b
            where b.owner_id = auth.uid()
              and b.id::text = (storage.foldername(name))[1]
        )
    );

-- ---------- certifications (lectura pública, escritura autenticada) ----------
drop policy if exists certifications_bucket_read on storage.objects;
create policy certifications_bucket_read on storage.objects
    for select using (bucket_id = 'certifications');

drop policy if exists certifications_bucket_write on storage.objects;
create policy certifications_bucket_write on storage.objects
    for insert with check (
        bucket_id = 'certifications' and auth.role() = 'authenticated'
    );
