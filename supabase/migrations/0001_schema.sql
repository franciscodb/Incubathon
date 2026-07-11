-- =====================================================================
-- Buró de Cumplimiento Regulatorio — Esquema base
-- Migración 0001: tablas, tipos y restricciones
-- =====================================================================
-- Ejecutar en Supabase (SQL Editor o `supabase db push`).
-- Requiere las extensiones pgcrypto/uuid disponibles por defecto en Supabase.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- profiles: extiende auth.users con rol y datos de contacto
-- role: business_owner (dueño de negocio) | professional | admin
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
    id          uuid primary key references auth.users (id) on delete cascade,
    email       text,
    full_name   text,
    phone       text,
    role        text not null default 'business_owner'
                check (role in ('business_owner', 'professional', 'admin')),
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- businesses: datos generales + clasificación. Pertenece a un profile.
-- ---------------------------------------------------------------------
create table if not exists public.businesses (
    id                          uuid primary key default gen_random_uuid(),
    owner_id                    uuid not null references public.profiles (id) on delete cascade,
    nombre                      text not null,
    razon_social                text,
    rfc                         text,
    giro                        text not null default 'restaurante'
                                check (giro in ('restaurante','cafeteria','bar','cantina','fonda','food_truck','otro')),
    alcaldia                    text,
    direccion                   text,
    superficie_m2               numeric default 0,
    aforo                       integer default 0,
    num_trabajadores            integer default 0,
    vende_alcohol               boolean not null default false,
    usa_gas                     boolean not null default false,
    tiene_terraza               boolean not null default false,
    tiene_anuncios              boolean not null default false,
    genera_residuos_especiales  boolean not null default false,
    nivel_ruido                 text not null default 'bajo'
                                check (nivel_ruido in ('bajo','medio','alto')),
    inmueble                    text not null default 'rentado'
                                check (inmueble in ('propio','rentado')),
    realiza_construccion        boolean not null default false,
    nivel_impacto               text default 'bajo'
                                check (nivel_impacto in ('bajo','vecinal','zonal')),
    created_at                  timestamptz not null default now(),
    updated_at                  timestamptz not null default now()
);

create index if not exists businesses_owner_idx on public.businesses (owner_id);

-- ---------------------------------------------------------------------
-- procedures_catalog: catálogo maestro de trámites CDMX (A&B).
-- Público de lectura. steps es un arreglo JSON de {title, detail}.
-- ---------------------------------------------------------------------
create table if not exists public.procedures_catalog (
    code            text primary key,
    name            text not null,
    authority       text,
    category        text,
    criticality     text not null default 'media'
                    check (criticality in ('alta','media','baja')),
    vigencia_meses  integer,               -- null = sin vencimiento
    estimated_cost  text,
    estimated_time  text,
    official_url    text,
    description     text,
    why             text,
    steps           jsonb not null default '[]'::jsonb,
    created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- documents: archivos en Storage con fechas de emisión / vencimiento.
-- ---------------------------------------------------------------------
create table if not exists public.documents (
    id                uuid primary key default gen_random_uuid(),
    business_id       uuid not null references public.businesses (id) on delete cascade,
    procedure_code    text references public.procedures_catalog (code) on delete set null,
    name              text not null,
    file_path         text,                 -- ruta en el bucket de Storage
    file_url          text,                 -- url pública/firmada (o mock)
    mime_type         text,
    fecha_emision     date,
    fecha_vencimiento date,
    uploaded_by       uuid references public.profiles (id) on delete set null,
    created_at        timestamptz not null default now()
);

create index if not exists documents_business_idx on public.documents (business_id);

-- ---------------------------------------------------------------------
-- business_procedures: trámite aplicado a un negocio (matriz).
-- status: pendiente | en_tramite | vigente | vencido | no_aplica
-- ---------------------------------------------------------------------
create table if not exists public.business_procedures (
    id                uuid primary key default gen_random_uuid(),
    business_id       uuid not null references public.businesses (id) on delete cascade,
    procedure_code    text not null references public.procedures_catalog (code) on delete cascade,
    status            text not null default 'pendiente'
                      check (status in ('pendiente','en_tramite','vigente','vencido','no_aplica')),
    fecha_inicio      date,
    fecha_emision     date,
    fecha_vencimiento date,
    document_id       uuid references public.documents (id) on delete set null,
    notas             text,
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now(),
    unique (business_id, procedure_code)
);

create index if not exists business_procedures_business_idx on public.business_procedures (business_id);

-- ---------------------------------------------------------------------
-- professionals: perfil del profesional verificado del marketplace.
-- especialidades / procedures_codes son arreglos de texto.
-- ---------------------------------------------------------------------
create table if not exists public.professionals (
    id                uuid primary key default gen_random_uuid(),
    user_id           uuid references public.profiles (id) on delete cascade,
    nombre            text not null,
    profesion         text,                 -- Abogado, Arquitecto, DRO, Ing., etc.
    especialidades    text[] not null default '{}',
    procedures_codes  text[] not null default '{}', -- trámites que ayuda a resolver
    cedula            text,
    bio               text,
    ciudad            text default 'Ciudad de México',
    alcaldias         text[] not null default '{}',
    telefono          text,
    email             text,
    sitio_web         text,
    verified          boolean not null default false,
    rating            numeric(2,1) default 0,
    reviews_count     integer default 0,
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now()
);

create index if not exists professionals_verified_idx on public.professionals (verified);

-- ---------------------------------------------------------------------
-- professional_certifications: credenciales/documentos del profesional.
-- ---------------------------------------------------------------------
create table if not exists public.professional_certifications (
    id                uuid primary key default gen_random_uuid(),
    professional_id   uuid not null references public.professionals (id) on delete cascade,
    nombre            text not null,
    emisor            text,
    file_path         text,
    file_url          text,
    fecha_emision     date,
    fecha_vencimiento date,
    verified          boolean not null default false,
    created_at        timestamptz not null default now()
);

create index if not exists prof_cert_professional_idx on public.professional_certifications (professional_id);

-- ---------------------------------------------------------------------
-- contact_requests: solicitud de contacto usuario <-> profesional.
-- ---------------------------------------------------------------------
create table if not exists public.contact_requests (
    id                uuid primary key default gen_random_uuid(),
    business_id       uuid references public.businesses (id) on delete set null,
    professional_id   uuid not null references public.professionals (id) on delete cascade,
    requester_id      uuid references public.profiles (id) on delete set null,
    procedure_code    text references public.procedures_catalog (code) on delete set null,
    message           text,
    status            text not null default 'nuevo'
                      check (status in ('nuevo','contactado','cerrado')),
    created_at        timestamptz not null default now()
);

create index if not exists contact_requests_professional_idx on public.contact_requests (professional_id);
create index if not exists contact_requests_requester_idx on public.contact_requests (requester_id);

-- ---------------------------------------------------------------------
-- Trigger: crear profile automáticamente al registrarse un usuario.
-- El rol se toma de raw_user_meta_data->>'role' (default business_owner).
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
    insert into public.profiles (id, email, full_name, role)
    values (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data->>'full_name', ''),
        coalesce(new.raw_user_meta_data->>'role', 'business_owner')
    )
    on conflict (id) do nothing;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists businesses_set_updated on public.businesses;
create trigger businesses_set_updated before update on public.businesses
    for each row execute function public.set_updated_at();

drop trigger if exists business_procedures_set_updated on public.business_procedures;
create trigger business_procedures_set_updated before update on public.business_procedures
    for each row execute function public.set_updated_at();
