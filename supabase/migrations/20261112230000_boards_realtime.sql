-- Sincronização ao vivo do quadro (tabela "boards", linha "main").
-- Rode no SQL Editor do Supabase (projeto "Vida Sistêmica"). Pode rodar mais
-- de uma vez sem erro e não apaga nenhum dado.
--
-- 1. Garante a tabela (se ela já existe, nada muda nela).
create table if not exists public.boards (
  id text primary key,
  data jsonb not null default '[]'::jsonb,
  updated_by text,
  updated_at timestamptz not null default now()
);

-- 2. Permissões: o app usa a chave pública (anon). Ler, criar e atualizar a
--    linha do quadro. Exclusão não é liberada.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'boards' and policyname = 'boards_select') then
    create policy "boards_select" on public.boards for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'boards' and policyname = 'boards_insert') then
    create policy "boards_insert" on public.boards for insert to anon, authenticated with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'boards' and policyname = 'boards_update') then
    create policy "boards_update" on public.boards for update to anon, authenticated using (true) with check (true);
  end if;
end $$;
alter table public.boards enable row level security;
grant select, insert, update on public.boards to anon, authenticated;

-- 3. Carimbo de versão pelo relógio do servidor, nunca pelo do computador de
--    quem salvou. O app usa esse carimbo para saber se a nuvem mudou.
create or replace function public.boards_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists boards_set_updated_at on public.boards;
create trigger boards_set_updated_at
  before insert or update on public.boards
  for each row execute function public.boards_set_updated_at();

-- 4. Liga o tempo real: sem isto o Supabase não avisa os outros navegadores.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'boards'
  ) then
    alter publication supabase_realtime add table public.boards;
  end if;
end $$;
