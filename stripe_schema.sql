-- ==============================================================================
-- Stripe Billing Schema - AI Crisi
-- Esegui questo script in Supabase SQL Editor dopo supabase_setup.sql
-- ==============================================================================

create table if not exists public.user_subscriptions (
  user_id text primary key,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_price_id text,
  stripe_current_period_end timestamp with time zone,
  status text not null default 'inactive',
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

alter table public.user_subscriptions enable row level security;

-- Lettura consentita solo al proprietario della riga
create policy "User can read own subscription"
  on public.user_subscriptions
  for select
  using ((auth.jwt() ->> 'sub') = user_id);

-- Nessuna policy di insert/update/delete per gli utenti normali:
-- le scritture avvengono da backend con SUPABASE_SERVICE_ROLE_KEY
-- (service role bypassa RLS).

create or replace function public.set_user_subscriptions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists trigger_user_subscriptions_updated_at on public.user_subscriptions;

create trigger trigger_user_subscriptions_updated_at
before update on public.user_subscriptions
for each row
execute function public.set_user_subscriptions_updated_at();
