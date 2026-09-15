-- ============================================================
-- Creative Request Ops — email notifications (outbox model)
--
-- A trigger watches every request write, works out which stage change
-- happened, chooses the recipients by role, and queues one event in
-- public.mail_outbox. The mailer (mailer/Code.gs, a Google Apps Script on
-- a 1-minute timer) claims queued events through two RPCs guarded by a
-- shared secret, sends the emails from the admin's Google account, and
-- acknowledges them. Nothing here needs a public web app or outbound
-- calls from the database.
--
-- One-time setup after running this file:
--   select vault.create_secret('<the TOKEN from mailer/Code.gs>', 'mailer_token');
-- The master switch lives in the app: Settings → Email notifications.
-- ============================================================

create table if not exists public.mailer_config (
  id         integer primary key default 1 check (id = 1),
  app_url    text    not null default 'https://pawankumar-bnb.github.io/creative-dashboard/',
  updated_at timestamptz not null default now()
);
alter table public.mailer_config enable row level security;   -- no policies: never readable from the browser
insert into public.mailer_config (id) values (1) on conflict (id) do nothing;

create table if not exists public.mail_outbox (
  id          bigserial primary key,
  created_at  timestamptz not null default now(),
  event       text        not null,
  payload     jsonb       not null,
  status      text        not null default 'pending',   -- pending | claimed | sent | failed
  claimed_at  timestamptz,
  sent_at     timestamptz,
  error       text
);
create index if not exists mail_outbox_status_idx on public.mail_outbox (status, id);
alter table public.mail_outbox enable row level security;     -- no policies: only the RPCs below touch it

-- The mailer claims a batch (stale claims older than 10 minutes are released first) ...
create or replace function public.mail_outbox_claim(p_token text, p_limit integer default 25)
returns setof public.mail_outbox
language plpgsql security definer set search_path = public as $$
declare tok text;
begin
  select decrypted_secret into tok from vault.decrypted_secrets where name = 'mailer_token' limit 1;
  if tok is null or p_token is null or p_token <> tok then raise exception 'unauthorized' using errcode = '28000'; end if;
  update public.mail_outbox set status = 'pending', claimed_at = null where status = 'claimed' and claimed_at < now() - interval '10 minutes';
  delete from public.mail_outbox where status in ('sent', 'failed') and created_at < now() - interval '30 days';
  return query
    update public.mail_outbox o set status = 'claimed', claimed_at = now()
    where o.id in (select id from public.mail_outbox where status = 'pending' order by id limit greatest(1, least(p_limit, 100)) for update skip locked)
    returning o.*;
end $$;
-- ... and reports what happened.
create or replace function public.mail_outbox_ack(p_token text, p_results jsonb)
returns integer
language plpgsql security definer set search_path = public as $$
declare tok text; n integer := 0; r jsonb;
begin
  select decrypted_secret into tok from vault.decrypted_secrets where name = 'mailer_token' limit 1;
  if tok is null or p_token is null or p_token <> tok then raise exception 'unauthorized' using errcode = '28000'; end if;
  for r in select * from jsonb_array_elements(coalesce(p_results, '[]'::jsonb)) loop
    update public.mail_outbox
       set status = case when coalesce((r ->> 'ok')::boolean, false) then 'sent' else 'failed' end,
           sent_at = case when coalesce((r ->> 'ok')::boolean, false) then now() else null end,
           error = r ->> 'error'
     where id = (r ->> 'id')::bigint and status = 'claimed';
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.mail_outbox_claim(text, integer) from public;
revoke all on function public.mail_outbox_ack(text, jsonb) from public;
grant execute on function public.mail_outbox_claim(text, integer) to anon, authenticated;
grant execute on function public.mail_outbox_ack(text, jsonb) to anon, authenticated;

create or replace function public.notify_request_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  cfg          public.mailer_config%rowtype;
  settings     jsonb;
  stages       jsonb;
  work_stage   text;
  old_stage    text;
  new_stage    text;
  old_kind     text;
  new_kind     text;
  stage_name   text;
  ev           text;
  actor_email  text;
  actor_name   text;
  last_msg     jsonb;
  note         text;
  assignee     jsonb;
  requester    jsonb;
  recips       jsonb := '[]'::jsonb;
  payload      jsonb;
  m            record;
begin
  if new.collection <> 'requests' then return new; end if;

  select * into cfg from public.mailer_config where id = 1;
  if not found then return new; end if;

  -- master switch (Settings → Email notifications); defaults to on
  select data into settings from public.docs where collection = 'config' and id = 'settings';
  if coalesce((settings -> 'notifications' ->> 'enabled')::boolean, true) = false then return new; end if;

  select data -> 'stages' into stages from public.docs where collection = 'config' and id = 'flow';
  stages := coalesce(stages, '[]'::jsonb);
  new_stage := new.data ->> 'stage';
  old_stage := case when tg_op = 'UPDATE' then old.data ->> 'stage' else null end;
  select s ->> 'kind', s ->> 'name' into new_kind, stage_name from jsonb_array_elements(stages) s where s ->> 'id' = new_stage;
  select s ->> 'kind' into old_kind from jsonb_array_elements(stages) s where s ->> 'id' = old_stage;
  select s ->> 'id' into work_stage from jsonb_array_elements(stages) s where s ->> 'kind' = 'work' limit 1;
  assignee  := new.data -> 'assignees' -> coalesce(work_stage, 'production');
  requester := new.data -> 'requester';

  -- which event is this?
  if tg_op = 'INSERT' then
    ev := 'raised';
  elsif (new.data ->> 'status') = 'done' and coalesce(old.data ->> 'status', '') <> 'done' then
    ev := 'approved';
  elsif (new.data ->> 'status') = 'cancelled' and coalesce(old.data ->> 'status', '') <> 'cancelled' then
    ev := 'cancelled';
  elsif new_kind = 'work' and old_kind = 'triage' then
    ev := 'assigned';
  elsif new_kind = 'work' and old_kind = 'review' then
    ev := 'rework';
  elsif new_kind = 'work' and old_kind = 'end' then
    ev := 'reopened';
  elsif new_kind = 'review' and old_kind = 'work' then
    ev := 'submitted';
  elsif new_kind = 'review' and old_kind = 'review' and new_stage is distinct from old_stage then
    ev := 'qc_passed';
  elsif new_kind = 'work' and old_kind = 'work'
        and coalesce(assignee ->> 'email', '') <> ''
        and coalesce(assignee ->> 'email', '') <> coalesce(old.data -> 'assignees' -> coalesce(work_stage, 'production') ->> 'email', '') then
    ev := 'reassigned';
  else
    return new;   -- comments, file links, brief edits: no email
  end if;

  -- who did it, and did they leave a note?
  actor_email := lower(coalesce(new.updated_by, ''));
  select d.data ->> 'name' into actor_name from public.docs d where d.collection = 'members' and d.id = actor_email;
  last_msg := case when jsonb_typeof(new.data -> 'thread') = 'array' and jsonb_array_length(new.data -> 'thread') > 0
                   then new.data -> 'thread' -> (jsonb_array_length(new.data -> 'thread') - 1) else null end;
  if actor_name is null then actor_name := coalesce(last_msg -> 'by' ->> 'name', 'Someone'); end if;
  if last_msg is not null and (last_msg ->> 'kind') in ('edit', 'approval') then note := last_msg ->> 'text'; end if;

  -- recipients by role (the person who acted is never emailed about their own action)
  if ev in ('raised', 'submitted', 'approved') then
    for m in select d.data ->> 'email' as email, d.data ->> 'name' as name from public.docs d
             where d.collection = 'members' and (d.data -> 'roles') ? 'coordinator' and coalesce((d.data ->> 'active')::boolean, true) loop
      recips := recips || jsonb_build_object('email', m.email, 'name', m.name, 'role', 'coordinator');
    end loop;
  end if;
  if ev = 'qc_passed' then
    for m in select d.data ->> 'email' as email, d.data ->> 'name' as name from public.docs d
             where d.collection = 'members' and (d.data -> 'roles') ? 'admin' and coalesce((d.data ->> 'active')::boolean, true) loop
      recips := recips || jsonb_build_object('email', m.email, 'name', m.name, 'role', 'admin');
    end loop;
  end if;
  if ev in ('assigned', 'reassigned', 'rework', 'qc_passed', 'approved', 'reopened', 'cancelled') and coalesce(assignee ->> 'email', '') <> '' then
    recips := recips || jsonb_build_object('email', assignee ->> 'email', 'name', assignee ->> 'name', 'role', 'assignee');
  end if;
  if ev in ('raised', 'assigned', 'reassigned', 'submitted', 'rework', 'qc_passed', 'approved', 'reopened', 'cancelled') and coalesce(requester ->> 'email', '') <> '' then
    recips := recips || jsonb_build_object('email', requester ->> 'email', 'name', requester ->> 'name', 'role', 'requester');
  end if;

  -- de-duplicate and drop the actor
  select coalesce(jsonb_agg(x.r), '[]'::jsonb) into recips
  from (select distinct on (lower(e.r ->> 'email')) e.r
        from jsonb_array_elements(recips) as e(r)
        where lower(e.r ->> 'email') <> actor_email and (e.r ->> 'email') like '%@%'
        order by lower(e.r ->> 'email'), (e.r ->> 'role')) x;
  if jsonb_array_length(recips) = 0 then return new; end if;

  payload := jsonb_build_object(
    'event', ev,
    'actor', jsonb_build_object('email', actor_email, 'name', actor_name),
    'note', note,
    'recipients', recips,
    'task', jsonb_build_object(
      'id', new.id,
      'title', new.data ->> 'title',
      'type', new.data ->> 'type',
      'team', case new.data ->> 'team' when 'design' then 'Graphic design' when 'video' then 'Video editing' else new.data ->> 'team' end,
      'stage', new_stage,
      'stageName', stage_name,
      'round', coalesce((new.data ->> 'round')::int, 1),
      'priority', new.data ->> 'priority',
      'tatHours', (new.data ->> 'tatHours')::numeric,
      'dueBy', case
                 when (new.data ->> 'tatDeadline') ~ '^[0-9]+$'
                   then to_char(to_timestamp((new.data ->> 'tatDeadline')::numeric / 1000) at time zone 'Asia/Kolkata', 'Dy DD Mon, HH24:MI')
                 when ev in ('assigned', 'reassigned', 'rework', 'reopened') and (new.data ->> 'tatHours')::numeric > 0
                   then to_char((now() + (new.data ->> 'tatHours')::numeric * interval '1 hour') at time zone 'Asia/Kolkata', 'Dy DD Mon, HH24:MI')
               end,
      'dueDate', new.data ->> 'dueDate',
      'requester', requester,
      'assignee', assignee,
      'link', cfg.app_url || '#/r/' || new.id
    )
  );

  insert into public.mail_outbox (event, payload) values (ev, payload);
  return new;
exception when others then
  raise warning 'notify_request_change failed: %', sqlerrm;
  return new;
end $$;

drop trigger if exists docs_notify on public.docs;
create trigger docs_notify after insert or update on public.docs
  for each row execute function public.notify_request_change();
