-- ==============================================================================
-- Gemini RAG Schema Update - AI Crisi
-- Allinea knowledge_base e RPC a embeddings Gemini ridotti a 768 dimensioni
-- ==============================================================================

create extension if not exists vector;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'knowledge_base'
      and column_name = 'embedding'
  ) then
    begin
      alter table public.knowledge_base
        alter column embedding type vector(768);
    exception
      when others then
        if not exists (
          select 1
          from information_schema.columns
          where table_schema = 'public'
            and table_name = 'knowledge_base'
            and column_name = 'embedding_legacy_1536'
        ) then
          alter table public.knowledge_base
            rename column embedding to embedding_legacy_1536;
        end if;

        if not exists (
          select 1
          from information_schema.columns
          where table_schema = 'public'
            and table_name = 'knowledge_base'
            and column_name = 'embedding'
        ) then
          alter table public.knowledge_base
            add column embedding vector(768);
        end if;
    end;
  else
    alter table public.knowledge_base
      add column embedding vector(768);
  end if;
end $$;

create index if not exists knowledge_base_embedding_idx
  on public.knowledge_base
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

drop function if exists public.match_knowledge_base(vector, integer);
drop function if exists public.match_knowledge_base(vector, integer, text);

create or replace function public.match_knowledge_base(
  query_embedding vector(768),
  match_count integer default 5,
  filter_category text default null
)
returns table (
  id uuid,
  title text,
  content text,
  category text,
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
    kb.metadata,
    1 - (kb.embedding <=> query_embedding) as similarity
  from public.knowledge_base kb
  where kb.embedding is not null
    and (
      filter_category is null
      or kb.category = filter_category
    )
  order by kb.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

grant execute on function public.match_knowledge_base(vector, integer, text)
  to authenticated, service_role;

