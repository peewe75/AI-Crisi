-- ==============================================================================
-- Knowledge Base Sovraindebitamento - AI Crisi
-- Tabella dedicata al retrieval RAG per procedure di sovraindebitamento
-- ==============================================================================

create extension if not exists vector;

create table if not exists public.knowledge_base_sovraindebitamento (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  embedding vector(768),
  category text not null,
  procedure_type text,
  source text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.knowledge_base_sovraindebitamento
  enable row level security;

drop policy if exists "knowledge_base_sovraindebitamento_authenticated_select"
  on public.knowledge_base_sovraindebitamento;
drop policy if exists "knowledge_base_sovraindebitamento_service_role_insert"
  on public.knowledge_base_sovraindebitamento;
drop policy if exists "knowledge_base_sovraindebitamento_service_role_update"
  on public.knowledge_base_sovraindebitamento;
drop policy if exists "knowledge_base_sovraindebitamento_service_role_delete"
  on public.knowledge_base_sovraindebitamento;

create policy "knowledge_base_sovraindebitamento_authenticated_select"
  on public.knowledge_base_sovraindebitamento
  for select
  to authenticated
  using (true);

create policy "knowledge_base_sovraindebitamento_service_role_insert"
  on public.knowledge_base_sovraindebitamento
  for insert
  to service_role
  with check (true);

create policy "knowledge_base_sovraindebitamento_service_role_update"
  on public.knowledge_base_sovraindebitamento
  for update
  to service_role
  using (true)
  with check (true);

create policy "knowledge_base_sovraindebitamento_service_role_delete"
  on public.knowledge_base_sovraindebitamento
  for delete
  to service_role
  using (true);

create index if not exists knowledge_base_sovraindebitamento_embedding_idx
  on public.knowledge_base_sovraindebitamento
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

drop function if exists public.match_knowledge_base_sovraindebitamento(vector, integer, text);

create or replace function public.match_knowledge_base_sovraindebitamento(
  query_embedding vector(768),
  match_count integer default 5,
  filter_procedure text default null
)
returns table (
  id uuid,
  title text,
  content text,
  category text,
  procedure_type text,
  source text,
  metadata jsonb,
  similarity double precision
)
language sql
stable
as $$
  select
    kb.id,
    kb.title,
    kb.content,
    kb.category,
    kb.procedure_type,
    kb.source,
    kb.metadata,
    1 - (kb.embedding <=> query_embedding) as similarity
  from public.knowledge_base_sovraindebitamento kb
  where kb.embedding is not null
    and (
      filter_procedure is null
      or kb.procedure_type = filter_procedure
    )
  order by kb.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

grant execute on function public.match_knowledge_base_sovraindebitamento(vector, integer, text)
  to authenticated, service_role;
