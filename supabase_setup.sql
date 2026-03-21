-- ==============================================================================
-- AI Crisi - Supabase Database Setup 
-- Istruzioni per l'Admin: Copia questo intero script nell'Editor SQL 
-- della tua Dashboard Supabase e clicca su "Run" per creare tutta l'architettura.
-- ==============================================================================

-- 1. Abilita l'estensione vettoriale per il RAG (Recupero Semantico Giurisprudenza)
create extension if not exists vector;

-- ==============================================================================
-- 2. Creazione Tabelle Relazionali
-- ==============================================================================

-- Tabella 'clients': contiene l'anagrafica cliente
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id text not null, -- ID univoco dell'utente fornito da Clerk (auth.jwt() ->> 'sub')
  company_name text not null,
  vat_number text,
  address text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabella 'practices': pratiche CCII (Composizione Negoziata, Concordato, etc.)
create table if not exists public.practices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  type text not null, -- Es. 'CNC', 'Concordato', 'Piano Attestato'
  status text not null default 'Bozza',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabella 'documents': riferimenti ai file caricati nello storage e testi per RAG
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references public.practices(id) on delete cascade,
  category text not null, -- I "7 Cassetti": 'Societaria', 'Contabile', 'Fiscale', 'Certificazioni', 'Finanza', 'Lavoro', 'Strategia'
  file_path text, -- Percorso del PDF originario nel Supabase Storage
  extracted_text text, -- Il testo OCR/estrattivo completo letto dal PDF, da usare per LLM context
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabella 'knowledge_base': sistema centralizzato RAG (Normativa Italiana, Giurisprudenza, Template)
create table if not exists public.knowledge_base (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  metadata jsonb default '{}'::jsonb,
  embedding vector(1536), -- Vector format standard OpenAI text-embedding-3-small
  category text not null, -- Esempio: 'Giurisprudenza', 'Normativa', 'Template'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==============================================================================
-- 3. Configurazione Supabase Storage Bucket
-- ==============================================================================

-- Creiamo un contenitore interno per i file fisici dei clienti (non pubblico da internet!)
insert into storage.buckets (id, name, public) 
values ('practice_documents', 'practice_documents', false)
on conflict (id) do nothing;

-- ==============================================================================
-- 4. Sicurezza Dati (Row Level Security - RLS) ed Integrazione Clerk
-- ==============================================================================

-- Abilitiamo RLS ovunque, così di default nessuno può accedere a nulla, a meno 
-- di policy esplicite o l'uso della Service Key.
alter table public.clients enable row level security;
alter table public.practices enable row level security;
alter table public.documents enable row level security;
alter table public.knowledge_base enable row level security;

-- NOTA su policy e Clerk JWT:
-- Per Clerk, bisogna creare un 'JWT Template' nominato 'supabase' dalla dashboard Clerk.
-- Questo inietterà i claim nel token JWT.
-- auth.jwt() ->> 'sub' estrarrà l'ID formattato di Clerk e lo mapperemo sul nostro user_id.

-- ----------------------------------------------------
-- Policy per la tabella "clients"
-- ----------------------------------------------------
create policy "I professionisti possono leggere solo i propri clienti" 
  on public.clients for select 
  using ( (auth.jwt() ->> 'sub') = user_id );

create policy "I professionisti possono inserire nuovi clienti per sé stessi" 
  on public.clients for insert 
  with check ( (auth.jwt() ->> 'sub') = user_id );

create policy "I professionisti possono aggiornare i propri clienti" 
  on public.clients for update 
  using ( (auth.jwt() ->> 'sub') = user_id );

create policy "I professionisti possono eliminare i propri clienti" 
  on public.clients for delete 
  using ( (auth.jwt() ->> 'sub') = user_id );

-- ----------------------------------------------------
-- Policy per la tabella "practices"
-- ----------------------------------------------------
create policy "Lettura pratiche limitata ai propri clienti" 
  on public.practices for select 
  using ( exists (select 1 from public.clients where id = practices.client_id and user_id = auth.jwt() ->> 'sub') );

create policy "Inserimento pratiche solo sui propri clienti" 
  on public.practices for insert 
  with check ( exists (select 1 from public.clients where id = practices.client_id and user_id = auth.jwt() ->> 'sub') );

create policy "Aggiornamento pratiche limitato ai propri clienti" 
  on public.practices for update 
  using ( exists (select 1 from public.clients where id = practices.client_id and user_id = auth.jwt() ->> 'sub') );

create policy "Delete pratiche limitato ai propri clienti" 
  on public.practices for delete 
  using ( exists (select 1 from public.clients where id = practices.client_id and user_id = auth.jwt() ->> 'sub') );

-- ----------------------------------------------------
-- Policy per la tabella "documents"
-- ----------------------------------------------------
create policy "Lettura file logici limitata ai documenti delle proprie pratiche" 
  on public.documents for select 
  using ( exists (
    select 1 from public.practices p
    join public.clients c on p.client_id = c.id
    where p.id = documents.practice_id and c.user_id = auth.jwt() ->> 'sub'
  ) );

create policy "Inserimento documenti limitato alle proprie pratiche" 
  on public.documents for insert 
  with check ( exists (
    select 1 from public.practices p
    join public.clients c on p.client_id = c.id
    where p.id = documents.practice_id and c.user_id = auth.jwt() ->> 'sub'
  ) );

-- ----------------------------------------------------
-- Policy per la tabella "knowledge_base" (RAG Assoluta)
-- ----------------------------------------------------
-- RAG è accessibile a chiunque abbia un token autorizzato (utente loggato all'app)
create policy "Chiunque loggato può interrogare la giurisprudenza" 
  on public.knowledge_base for select 
  using ( auth.role() = 'authenticated' );
-- (Nota: Inserimento e Update verranno fatti via backend interno usando chiavi Service Role
-- aggirando RLS per popolare i dati vettorializzati).

-- ----------------------------------------------------
-- Policy per lo "Storage" Fisico
-- ----------------------------------------------------
-- Consentiamo a ruoli autenticati l'upload al bucket
create policy "Upload file bucket practice_documents per utenti autenticati"
  on storage.objects for insert
  with check ( bucket_id = 'practice_documents' and auth.role() = 'authenticated' );

-- Download dai propri path bucket per ruoli autenticati
create policy "Download file bucket practice_documents per utenti autenticati"
  on storage.objects for select
  using ( bucket_id = 'practice_documents' and auth.role() = 'authenticated' );

-- ==============================================================================
-- 5. Admin Bypass Policies (Clerk role=admin)
-- ==============================================================================
-- Queste policy consentono accesso completo agli utenti che hanno role=admin
-- nel JWT Clerk (es. public_metadata.role = "admin").

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(
    (auth.jwt() ->> 'role') = 'admin'
    or (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    or (auth.jwt() -> 'public_metadata' ->> 'role') = 'admin'
    or (auth.jwt() -> 'private_metadata' ->> 'role') = 'admin',
    false
  );
$$;

create policy "Admin puo gestire tutti i clienti"
  on public.clients for all
  using ( public.is_admin() )
  with check ( public.is_admin() );

create policy "Admin puo gestire tutte le pratiche"
  on public.practices for all
  using ( public.is_admin() )
  with check ( public.is_admin() );

create policy "Admin puo gestire tutti i documenti"
  on public.documents for all
  using ( public.is_admin() )
  with check ( public.is_admin() );

create policy "Admin puo gestire tutta la knowledge_base"
  on public.knowledge_base for all
  using ( public.is_admin() )
  with check ( public.is_admin() );

create policy "Admin puo gestire tutti i file practice_documents"
  on storage.objects for all
  using ( bucket_id = 'practice_documents' and public.is_admin() )
  with check ( bucket_id = 'practice_documents' and public.is_admin() );
