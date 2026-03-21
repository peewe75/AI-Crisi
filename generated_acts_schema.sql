-- ==============================================================================
-- Generated Acts Schema - AI Crisi
-- Salva bozze/versioni prodotte dall'Officina Atti, con archivio e download.
-- ==============================================================================

create table if not exists public.generated_acts (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices(id) on delete cascade,
  document_type text not null,
  title text not null,
  content_markdown text not null,
  version integer not null check (version > 0),
  status text not null default 'active' check (status in ('active', 'archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  archived_at timestamp with time zone
);

create unique index if not exists generated_acts_practice_type_version_idx
  on public.generated_acts (practice_id, document_type, version);

create index if not exists generated_acts_practice_status_idx
  on public.generated_acts (practice_id, status, created_at desc);

alter table public.generated_acts enable row level security;

create policy "Lettura atti generati limitata alle proprie pratiche"
  on public.generated_acts for select
  using (
    exists (
      select 1
      from public.practices p
      join public.clients c on c.id = p.client_id
      where p.id = generated_acts.practice_id
        and c.user_id = auth.jwt() ->> 'sub'
    )
  );

create policy "Inserimento atti generati limitato alle proprie pratiche"
  on public.generated_acts for insert
  with check (
    exists (
      select 1
      from public.practices p
      join public.clients c on c.id = p.client_id
      where p.id = generated_acts.practice_id
        and c.user_id = auth.jwt() ->> 'sub'
    )
  );

create policy "Aggiornamento atti generati limitato alle proprie pratiche"
  on public.generated_acts for update
  using (
    exists (
      select 1
      from public.practices p
      join public.clients c on c.id = p.client_id
      where p.id = generated_acts.practice_id
        and c.user_id = auth.jwt() ->> 'sub'
    )
  )
  with check (
    exists (
      select 1
      from public.practices p
      join public.clients c on c.id = p.client_id
      where p.id = generated_acts.practice_id
        and c.user_id = auth.jwt() ->> 'sub'
    )
  );

create policy "Delete atti generati limitato alle proprie pratiche"
  on public.generated_acts for delete
  using (
    exists (
      select 1
      from public.practices p
      join public.clients c on c.id = p.client_id
      where p.id = generated_acts.practice_id
        and c.user_id = auth.jwt() ->> 'sub'
    )
  );

create policy "Admin puo gestire tutti gli atti generati"
  on public.generated_acts for all
  using ( public.is_admin() )
  with check ( public.is_admin() );

create or replace function public.set_generated_acts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());

  if new.status = 'archived' and new.archived_at is null then
    new.archived_at = timezone('utc'::text, now());
  elsif new.status = 'active' then
    new.archived_at = null;
  end if;

  return new;
end;
$$;

drop trigger if exists trigger_generated_acts_updated_at on public.generated_acts;

create trigger trigger_generated_acts_updated_at
before update on public.generated_acts
for each row
execute function public.set_generated_acts_updated_at();
