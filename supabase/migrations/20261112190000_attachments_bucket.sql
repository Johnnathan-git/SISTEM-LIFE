-- Anexos do quadro fora do JSON: bucket público "attachments" + policies.
-- O quadro guardava cada anexo em base64 dentro da linha boards/main e o JSON
-- chegou a 6,5 MB — cada salvamento subia tudo de novo e falhava sem aviso.
-- Rode no SQL Editor do Lovable (projeto "Vida Sistêmica") ANTES de publicar
-- o app com o código novo. Pode rodar mais de uma vez sem erro.
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'attachments_select'
  ) then
    create policy "attachments_select" on storage.objects
      for select to anon, authenticated
      using (bucket_id = 'attachments');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'attachments_insert'
  ) then
    create policy "attachments_insert" on storage.objects
      for insert to anon, authenticated
      with check (bucket_id = 'attachments');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'attachments_update'
  ) then
    create policy "attachments_update" on storage.objects
      for update to anon, authenticated
      using (bucket_id = 'attachments')
      with check (bucket_id = 'attachments');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'attachments_delete'
  ) then
    create policy "attachments_delete" on storage.objects
      for delete to anon, authenticated
      using (bucket_id = 'attachments');
  end if;
end $$;
