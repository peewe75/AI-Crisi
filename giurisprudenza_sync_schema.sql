-- ==============================================================================
-- Background Sync Runs Schema - AI Crisi
-- Registro persistente dei run schedulati, utile per gating a 48 ore e audit.
-- ==============================================================================

create table if not exists public.background_sync_runs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  status text not null check (status in ('running', 'success', 'skipped_interval', 'failed')),
  started_at timestamp with time zone not null default timezone('utc'::text, now()),
  finished_at timestamp with time zone,
  inserted_count integer not null default 0,
  skipped_count integer not null default 0,
  failed_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists background_sync_runs_job_started_idx
  on public.background_sync_runs (job_name, started_at desc);

create index if not exists background_sync_runs_job_status_finished_idx
  on public.background_sync_runs (job_name, status, finished_at desc);

alter table public.background_sync_runs enable row level security;

drop policy if exists "Admin puo leggere background_sync_runs" on public.background_sync_runs;
drop policy if exists "Admin puo gestire background_sync_runs" on public.background_sync_runs;

create policy "Admin puo leggere background_sync_runs"
  on public.background_sync_runs for select
  using ( public.is_admin() );

create policy "Admin puo gestire background_sync_runs"
  on public.background_sync_runs for all
  using ( public.is_admin() )
  with check ( public.is_admin() );
