-- ============================================================
-- Creative Request Ops — video editing flow (run once)
--
-- 1. Replaces config/flow with one flow per team: the graphic design flow
--    is unchanged; the video team gets Brief received → Assigned → Shoot →
--    First cut → Final edit → QC & upload → Delivered.
-- 2. Gives the video lead his role and adds the third editor.
-- 3. Moves video requests that are mid-flight onto the matching new stage,
--    including their assignees and their stage history, so nothing stalls.
-- ============================================================

-- 1. the flows -------------------------------------------------------------
insert into public.docs (collection, id, data) values ('config', 'flow', '{"version":4,"teams":{"design":[{"id":"intake","name":"Requested","kind":"start","role":"requester","slaHours":0,"phase":"intake","color":"#64748B"},{"id":"brief","name":"Brief & assign","kind":"triage","role":"coordinator","slaHours":24,"phase":"brief","color":"#1baf7a"},{"id":"production","name":"In production","kind":"work","role":"team","slaHours":0,"slaFrom":"task","needsFile":true,"phase":"work","color":"#4a3aa7"},{"id":"qc","name":"QC","kind":"review","reviewers":["role:coordinator"],"slaHours":24,"editsTo":"production","phase":"qc","color":"#eb6834"},{"id":"approval","name":"Final approval","kind":"review","reviewers":["requester","role:admin"],"slaHours":24,"editsTo":"production","phase":"approval","color":"#2a78d6"},{"id":"done","name":"Approved","kind":"end","role":"","slaHours":0,"phase":"done","color":"#0ca30c"}],"video":[{"id":"v-intake","name":"Requested","kind":"start","role":"requester","slaHours":0,"phase":"intake","color":"#64748B"},{"id":"v-brief","name":"Brief received","kind":"triage","role":"videolead","slaHours":12,"phase":"brief","color":"#1baf7a"},{"id":"v-assigned","name":"Assigned","kind":"work","role":"video","slaHours":12,"phase":"work","color":"#64748B","step":"start","skipTo":"v-firstcut","skipLabel":"No shoot needed","nextLabel":"Start shoot"},{"id":"v-shoot","name":"Shoot","kind":"work","role":"video","slaHours":48,"phase":"work","color":"#4a3aa7","needsFile":true,"fileLabel":"footage link","nextLabel":"Shoot done"},{"id":"v-firstcut","name":"First cut","kind":"work","role":"video","slaHours":48,"phase":"work","color":"#e87ba4","needsFile":true,"fileLabel":"first-cut link","nextLabel":"First cut ready"},{"id":"v-final","name":"Final edit","kind":"work","role":"video","slaHours":24,"phase":"work","color":"#2a78d6","needsFile":true,"fileLabel":"final file link","nextLabel":"Ready for QC"},{"id":"v-qc","name":"QC & upload","kind":"review","reviewers":["role:videolead"],"slaHours":24,"editsTo":"v-final","phase":"qc","uploads":true,"color":"#eb6834"},{"id":"v-done","name":"Delivered","kind":"end","role":"","slaHours":0,"phase":"done","color":"#0ca30c"}]}}'::jsonb)
on conflict (collection, id) do update set data = excluded.data;

-- 2. the video team --------------------------------------------------------
update public.docs set data = jsonb_set(data, '{roles}', (
    select jsonb_agg(distinct r) from jsonb_array_elements(coalesce(data -> 'roles', '[]'::jsonb) || '["video","videolead"]'::jsonb) r))
  where collection = 'members' and id = 'pratyush.nath@bricknbolt.com';

insert into public.docs (collection, id, data) values
  ('members', 'hatchinghoi.hangsing@bricknbolt.com',
   '{"email":"hatchinghoi.hangsing@bricknbolt.com","name":"Hatchinghoi Hangsing","roles":["video"],"active":true,"emailUnconfirmed":true}'::jsonb)
on conflict (collection, id) do nothing;

-- 3. mid-flight video requests --------------------------------------------
with map(old_id, new_id) as (values
    ('intake','v-intake'), ('brief','v-brief'), ('production','v-final'),
    ('qc','v-qc'), ('approval','v-qc'), ('done','v-done'))
update public.docs d set data =
  jsonb_set(
    jsonb_set(
      case when d.data -> 'assignees' ? 'production'
           then jsonb_set(d.data, '{assignees}', jsonb_build_object(
                  'v-assigned', d.data -> 'assignees' -> 'production',
                  'v-shoot',    d.data -> 'assignees' -> 'production',
                  'v-firstcut', d.data -> 'assignees' -> 'production',
                  'v-final',    d.data -> 'assignees' -> 'production'))
           else d.data end,
      '{stage}', to_jsonb((select new_id from map where old_id = d.data ->> 'stage'))),
    '{visits}', coalesce((
      select jsonb_agg(case when (v ->> 'stage') in (select old_id from map)
                            then jsonb_set(v, '{stage}', to_jsonb((select new_id from map where old_id = v ->> 'stage')))
                            else v end order by ord)
      from jsonb_array_elements(coalesce(d.data -> 'visits', '[]'::jsonb)) with ordinality as e(v, ord)
    ), '[]'::jsonb))
where d.collection = 'requests'
  and d.data ->> 'team' = 'video'
  and d.data ->> 'stage' in (select old_id from map);

-- what moved
select id, data ->> 'stage' as stage, data ->> 'status' as status, data -> 'assignees' as assignees
from public.docs where collection = 'requests' and data ->> 'team' = 'video' order by id;
