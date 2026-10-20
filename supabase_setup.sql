-- Ejecutar en SQL Editor del proyecto Supabase. No pega aquí datos de clientes.
create table if not exists public.analysis_events (
 id bigint generated always as identity primary key,
 created_at timestamptz not null default now(),
 risk text not null check (risk in ('alto','precaucion','indeterminado')),
 mode text not null check (mode in ('capture','text')),
 flagged_domain text check(flagged_domain is null or (length(flagged_domain)<=100 and flagged_domain ~ '^[a-z0-9.-]+$')),
 signal_count smallint not null check (signal_count between 0 and 30),
 url_count smallint not null check (url_count between 0 and 12)
);
create index if not exists events_created_idx on public.analysis_events (created_at desc);
create table if not exists public.admin_users (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.analysis_events enable row level security;
alter table public.admin_users enable row level security;
revoke all on public.analysis_events from anon,authenticated;
revoke all on public.admin_users from anon,authenticated;
grant insert(risk,mode,flagged_domain,signal_count,url_count) on public.analysis_events to anon,authenticated;
grant select on public.analysis_events to authenticated;
grant select on public.admin_users to authenticated;
grant usage, select on sequence public.analysis_events_id_seq to anon,authenticated;
drop policy if exists "public_submit_minimal_event" on public.analysis_events;
create policy "public_submit_minimal_event" on public.analysis_events for insert to anon, authenticated with check (true);
drop policy if exists "admin_read_events" on public.analysis_events;
create policy "admin_read_events" on public.analysis_events for select to authenticated using (
 exists(select 1 from public.admin_users a where a.user_id=(select auth.uid()))
);
drop policy if exists "admins_read_self" on public.admin_users;
create policy "admins_read_self" on public.admin_users for select to authenticated using (user_id=(select auth.uid()));
-- Después de crear usuario administrador en Authentication > Users, habilitarlo:
-- insert into public.admin_users(user_id) values ('UUID-DE-ADMIN') on conflict do nothing;
-- Producción: limitar abuso del endpoint de insert, CAPTCHA/rate limiting y retención de registros.
