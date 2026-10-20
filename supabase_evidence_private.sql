-- ESCUDO / FASE SEGURA 1: solo lectura administrativa. NO concede INSERT a anon ni authenticated.
-- Ejecutar primero con el bucket creado PRIVADO en Storage > New bucket.
-- Configurar bucket escudo-evidencias: Public OFF, Max 5 MB, MIME image/jpeg e image/png.
create table if not exists public.evidence_records (
 id uuid primary key default gen_random_uuid(),
 storage_path text not null unique,
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default (now() + interval '30 days'),
 status text not null default 'pending' check(status in ('pending','deleting','deleted','delete_error')),
 deleted_at timestamptz,
 delete_attempts integer not null default 0,
 last_delete_error text,
 risk text check(risk in ('alto','precaucion','indeterminado')),
 flagged_domain text,
 check(length(storage_path) between 1 and 180),
 check(expires_at <= created_at + interval '30 days')
);
create index if not exists escudo_evidence_expiry on public.evidence_records(status,expires_at);
alter table public.evidence_records enable row level security;
revoke all on public.evidence_records from anon, authenticated;
grant select on public.evidence_records to authenticated;
drop policy if exists escudo_admin_read_evidence on public.evidence_records;
create policy escudo_admin_read_evidence on public.evidence_records
for select to authenticated using (
 exists(select 1 from public.admin_users a where a.user_id = (select auth.uid()))
);
-- IMPORTANTE: no políticas de subida públicas. Sólo lectura/borrado administrativos.
-- En Storage Policies, comprueba que no existan otras políticas permisivas para este bucket.
drop policy if exists escudo_admin_read_storage on storage.objects;
create policy escudo_admin_read_storage on storage.objects
for select to authenticated using (
 bucket_id='escudo-evidencias'
 and exists(select 1 from public.admin_users a where a.user_id=(select auth.uid()))
);
drop policy if exists escudo_admin_delete_storage on storage.objects;
create policy escudo_admin_delete_storage on storage.objects
for delete to authenticated using (
 bucket_id='escudo-evidencias'
 and exists(select 1 from public.admin_users a where a.user_id=(select auth.uid()))
);
-- No INSERT/UPDATE policies for the bucket here.
-- La limpieza automática NO queda activada con este SQL.
-- Borrar filas en SQL jamás elimina los objetos almacenados.
