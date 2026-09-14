-- ============================================================
-- Relay — Supabase schema (run once in the SQL editor, as the project owner)
--
-- One table holds every document the app stores (requests, members, config),
-- exactly the shape the front-end already uses. Access is enforced by
-- row-level security keyed on the Clerk session token:
--   * the token must carry role = 'authenticated'  (Clerk → Integrations → Supabase)
--   * the token must carry the user's email        (Clerk → Sessions → Customize
--     session token → {"email": "{{user.primary_email_address}}"})
-- ============================================================

create table if not exists public.docs (
  collection  text        not null,
  id          text        not null,
  data        jsonb       not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  updated_by  text,
  primary key (collection, id)
);
create index if not exists docs_collection_idx on public.docs (collection);
alter table public.docs enable row level security;
alter table public.docs replica identity full;

-- realtime: every open tab sees changes as they happen
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'docs') then
    alter publication supabase_realtime add table public.docs;
  end if;
end $$;

-- ---------- helpers ----------
create or replace function public.jwt_email() returns text
language sql stable as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

-- admins: the workspace owner, plus anyone whose members row carries the admin role
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select public.jwt_email() = 'pawankumar@bricknbolt.com'
      or exists (
        select 1 from public.docs d
        where d.collection = 'members'
          and d.id = public.jwt_email()
          and (d.data -> 'roles') ? 'admin'
          and coalesce((d.data ->> 'active')::boolean, true)
      );
$$;

-- task numbers come from a sequence so two people can never mint the same id
create sequence if not exists public.task_number_seq;
create or replace function public.next_task_number() returns integer
language sql security definer set search_path = public as $$
  select nextval('public.task_number_seq')::integer;
$$;
revoke execute on function public.next_task_number() from public, anon;
grant execute on function public.next_task_number() to authenticated;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ---------- row-level security ----------
drop policy if exists "signed-in users read everything"      on public.docs;
drop policy if exists "requests: signed-in users insert"      on public.docs;
drop policy if exists "requests: signed-in users update"      on public.docs;
drop policy if exists "requests: admins delete"               on public.docs;
drop policy if exists "members: self or admin insert"         on public.docs;
drop policy if exists "members: self or admin update"         on public.docs;
drop policy if exists "members: admins delete"                on public.docs;
drop policy if exists "config: admins write"                  on public.docs;

create policy "signed-in users read everything" on public.docs
  for select to authenticated using (true);

create policy "requests: signed-in users insert" on public.docs
  for insert to authenticated with check (collection = 'requests');
create policy "requests: signed-in users update" on public.docs
  for update to authenticated using (collection = 'requests') with check (collection = 'requests');
create policy "requests: admins delete" on public.docs
  for delete to authenticated using (collection = 'requests' and public.is_admin());

create policy "members: self or admin insert" on public.docs
  for insert to authenticated with check (collection = 'members' and (id = public.jwt_email() or public.is_admin()));
create policy "members: self or admin update" on public.docs
  for update to authenticated
  using (collection = 'members' and (id = public.jwt_email() or public.is_admin()))
  with check (collection = 'members' and (id = public.jwt_email() or public.is_admin()));
create policy "members: admins delete" on public.docs
  for delete to authenticated using (collection = 'members' and public.is_admin());

create policy "config: admins write" on public.docs
  for all to authenticated using (collection = 'config' and public.is_admin()) with check (collection = 'config' and public.is_admin());

-- ---------- guard: nobody can give themselves a role ----------
create or replace function public.docs_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.collection = 'members' and not public.is_admin() then
    if new.id <> public.jwt_email() then
      raise exception 'You can only edit your own team entry';
    end if;
    if tg_op = 'UPDATE' then
      new.data := jsonb_set(jsonb_set(new.data, '{roles}', coalesce(old.data -> 'roles', '["requester"]'::jsonb)), '{active}', coalesce(old.data -> 'active', 'true'::jsonb));
    else
      new.data := jsonb_set(jsonb_set(new.data, '{roles}', '["requester"]'::jsonb), '{active}', 'true'::jsonb);
    end if;
  end if;
  new.updated_at := now();
  new.updated_by := nullif(public.jwt_email(), '');
  return new;
end $$;
drop trigger if exists docs_guard on public.docs;
create trigger docs_guard before insert or update on public.docs
  for each row execute function public.docs_guard();
