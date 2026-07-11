-- =====================================================================
-- Buró de Cumplimiento Regulatorio
-- Migración 0006: Suscripciones (billing con Stripe)
-- =====================================================================
-- Modelo: se paga una suscripción por los negocios dados de alta (precio
-- híbrido por volumen + recargo por alcohol). Una suscripción por cuenta.

create table if not exists public.subscriptions (
    id                      uuid primary key default gen_random_uuid(),
    account_id              uuid not null unique references public.profiles (id) on delete cascade,
    status                  text not null default 'free'
                            check (status in ('free','active','trialing','past_due','canceled','incomplete')),
    seats                   integer not null default 0,   -- negocios que cubre el plan
    alcohol_businesses      integer not null default 0,
    interval                text not null default 'monthly'
                            check (interval in ('monthly','annual')),
    amount_cents            integer not null default 0,
    currency                text not null default 'mxn',
    stripe_customer_id      text,
    stripe_subscription_id  text,
    current_period_end      timestamptz,
    created_at              timestamptz not null default now(),
    updated_at              timestamptz not null default now()
);

create index if not exists subscriptions_account_idx on public.subscriptions (account_id);
create index if not exists subscriptions_stripe_sub_idx on public.subscriptions (stripe_subscription_id);

-- updated_at automático
drop trigger if exists subscriptions_set_updated on public.subscriptions;
create trigger subscriptions_set_updated before update on public.subscriptions
    for each row execute function public.set_updated_at();

-- ---------- RLS ----------
-- El backend usa la SERVICE ROLE KEY (bypassa RLS) para escribir desde los
-- webhooks de Stripe. El cliente sólo puede leer su propia suscripción.
alter table public.subscriptions enable row level security;

drop policy if exists subscriptions_select_own on public.subscriptions;
create policy subscriptions_select_own on public.subscriptions
    for select using (account_id = auth.uid());
