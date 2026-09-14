-- Relay — domain gate patch (applied on top of schema.sql)
-- company members: anyone signed in with a company email, or an email an admin added to the roster
-- (Clerk's domain allow-list is a paid feature, so the gate lives here in the database).
create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(auth.jwt() ->> 'role', '') = 'authenticated'
     and public.jwt_email() <> ''
     and (
       public.jwt_email() like '%@bricknbolt.com'
       or exists (
         select 1 from public.docs d
         where d.collection = 'members' and d.id = public.jwt_email()
           and coalesce((d.data ->> 'active')::boolean, true)
       )
     );
$$;
revoke execute on function public.is_member() from public, anon;
grant execute on function public.is_member() to authenticated;


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
  for select to authenticated using (public.is_member());

create policy "requests: signed-in users insert" on public.docs
  for insert to authenticated with check (collection = 'requests' and public.is_member());
create policy "requests: signed-in users update" on public.docs
  for update to authenticated using (collection = 'requests' and public.is_member()) with check (collection = 'requests' and public.is_member());
create policy "requests: admins delete" on public.docs
  for delete to authenticated using (collection = 'requests' and public.is_admin());

create policy "members: self or admin insert" on public.docs
  for insert to authenticated with check (collection = 'members' and public.is_member() and (id = public.jwt_email() or public.is_admin()));
create policy "members: self or admin update" on public.docs
  for update to authenticated
  using (collection = 'members' and public.is_member() and (id = public.jwt_email() or public.is_admin()))
  with check (collection = 'members' and public.is_member() and (id = public.jwt_email() or public.is_admin()));
create policy "members: admins delete" on public.docs
  for delete to authenticated using (collection = 'members' and public.is_admin());

create policy "config: admins write" on public.docs
  for all to authenticated using (collection = 'config' and public.is_admin()) with check (collection = 'config' and public.is_admin());

