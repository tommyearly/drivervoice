-- Drivers Voice schema. Row level security is deny by default.
-- This script does not decide a lawful basis or make the service legally compliant.

create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  contact_preference text not null default 'account' check (contact_preference in ('account', 'phone', 'email')),
  email_updates boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'active', 'suspended', 'revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(display_name) <= 80)
);

create table public.role_assignments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('driver', 'reviewer', 'coordinator', 'editor', 'publisher', 'tech_admin', 'survey_admin')),
  granted_by uuid references public.profiles (id),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  invited_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  revoked_at timestamptz,
  expires_at timestamptz not null default (now() + interval '7 days')
);

create table public.site_settings (
  id integer primary key check (id = 1),
  controller_name text not null default '',
  controller_contact text not null default '',
  purposes text not null default '',
  article6_basis text not null default '',
  article9_condition text not null default '',
  processors text not null default '',
  hosting text not null default '',
  transfers text not null default '',
  retention text not null default '',
  rights_procedure text not null default '',
  breach_procedure text not null default '',
  dpia_assessment text not null default '',
  coordinator_confirmed_at timestamptz,
  coordinator_confirmed_by uuid,
  tech_confirmed_at timestamptz,
  tech_confirmed_by uuid,
  publish_notice boolean not null default false,
  organising_start_date date,
  updated_at timestamptz not null default now()
);
insert into public.site_settings (id) values (1);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  kind text not null check (kind in ('concern', 'incident', 'callback')),
  owner_id uuid not null references public.profiles (id),
  status text not null check (status in ('draft', 'received', 'triage', 'more_information_needed', 'under_review', 'referred', 'awaiting_response', 'resolved', 'closed')),
  category text not null,
  title text not null,
  event_date date,
  event_date_end date,
  event_time text,
  depot_context text,
  route_or_duty text,
  what_happened text not null default '',
  personally_observed text not null default '',
  needs_checking text not null default '',
  effect_on_work text not null default '',
  outcome_requested text not null default '',
  official_channel text,
  official_reference text,
  contact_method text not null default 'account',
  contact_detail text,
  outstanding_issue text,
  support_requested text,
  sensitive boolean not null default false,
  idempotency_key uuid not null,
  response_due date,
  retention_review_on date,
  created_at timestamptz not null default now(),
  submitted_at timestamptz,
  unique (owner_id, idempotency_key),
  check (char_length(title) <= 160),
  check (char_length(what_happened) <= 4000)
);

create table public.report_assessments (
  report_id uuid primary key references public.reports (id) on delete cascade,
  assessment text not null default '',
  verification_status text not null default 'unverified' check (verification_status in ('unverified', 'awaiting_confirmation', 'verified', 'not_verified')),
  verification_source text,
  verified_by uuid,
  verified_at timestamptz,
  check (verification_status <> 'verified' or (coalesce(char_length(verification_source), 0) >= 8 and verified_by is not null))
);

create table public.report_assignments (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  assignee_id uuid not null references public.profiles (id),
  assigned_by uuid references public.profiles (id),
  assigned_at timestamptz not null default now(),
  removed_at timestamptz
);

create table public.report_notes (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  author_id uuid not null references public.profiles (id),
  body text not null,
  created_at timestamptz not null default now(),
  check (char_length(body) between 1 and 4000)
);

create table public.report_info_requests (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  requested_by uuid not null references public.profiles (id),
  message text not null,
  due_at date,
  responded_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.report_addenda (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  author_id uuid not null references public.profiles (id),
  body text not null,
  created_at timestamptz not null default now()
);

create table public.case_summaries (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  audience text not null check (audience in ('members', 'public')),
  body text not null,
  approved_by uuid,
  approved_at timestamptz,
  unique (report_id, audience)
);

create table public.preservation_holds (
  report_id uuid primary key references public.reports (id) on delete cascade,
  reason text not null,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.report_events (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  label text not null,
  created_at timestamptz not null default now()
);

create table public.updates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  status text not null check (status in ('draft', 'in_review', 'published')),
  headline text not null,
  audience text not null check (audience in ('public', 'members')),
  what_happened text not null default '',
  what_unanswered text not null default '',
  follow_up_role text not null default '',
  next_update_due date,
  classification text not null check (classification in ('verified_fact', 'proposal', 'awaiting_confirmation')),
  this_week text not null default '',
  still_awaiting text not null default '',
  actions_followed text not null default '',
  driver_contribution text not null default '',
  source_record text not null default '',
  reviewed_by text not null default '',
  internal_note text not null default '',
  author_id uuid references public.profiles (id),
  editor_reviewed_by uuid,
  approved_by uuid,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.update_corrections (
  id uuid primary key default gen_random_uuid(),
  update_id uuid not null references public.updates (id) on delete cascade,
  note text not null,
  corrected_by uuid not null references public.profiles (id),
  corrected_at timestamptz not null default now()
);

create table public.actions (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  title text not null,
  agreed_outcome text not null,
  responsible_role text not null,
  date_agreed date not null,
  target_date date not null,
  status text not null check (status in ('proposed', 'agreed', 'in_progress', 'awaiting_reply', 'completed', 'closed')),
  latest_update text not null,
  next_review_date date not null,
  public_summary_draft text not null default '',
  public_summary_author uuid,
  public_summary text,
  public_approved_by uuid,
  created_at timestamptz not null default now()
);

create table public.priorities (
  id uuid primary key default gen_random_uuid(),
  outcome text not null,
  measure text not null,
  stage text not null,
  last_review date not null,
  approved_by uuid not null references public.profiles (id),
  published_at timestamptz not null default now()
);

create table public.survey_periods (
  id uuid primary key default gen_random_uuid(),
  closes_on date not null,
  created_at timestamptz not null default now()
);

create table public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references public.survey_periods (id),
  profile_id uuid not null references public.profiles (id),
  rank_first text not null,
  rank_second text not null,
  rank_third text not null,
  other_text text not null default '',
  updated_at timestamptz not null default now(),
  unique (period_id, profile_id),
  check (rank_first <> rank_second and rank_first <> rank_third and rank_second <> rank_third)
);

create table public.survey_publications (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references public.survey_periods (id),
  audience text not null check (audience in ('committee', 'members', 'public')),
  snapshot jsonb not null,
  published_by uuid not null references public.profiles (id),
  published_at timestamptz not null default now()
);

create table public.volunteer_applications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id),
  name text not null,
  contact text not null,
  depot text not null default '',
  shift_pattern text not null default '',
  preferred_role text not null,
  statement text not null,
  consent_profile boolean not null default false,
  approved_profile text,
  status text not null default 'received',
  created_at timestamptz not null default now()
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  profile_id uuid references public.profiles (id),
  page_ref text not null,
  question text not null,
  explanation text not null,
  contact_preference text not null default '',
  status text not null default 'received',
  created_at timestamptz not null default now()
);

create table public.process_entries (
  id uuid primary key default gen_random_uuid(),
  process_type text not null default 'Not confirmed',
  referral_date date,
  reference_number text not null default '',
  confirmation_source text not null default '',
  confirmation_date date,
  requested_information text not null default '',
  request_date date,
  requested_reply_date date,
  response_received text not null default '',
  responsible_role text not null default '',
  next_step text not null default '',
  review_date date,
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  category text not null check (category in ('account', 'case', 'publication', 'survey', 'settings')),
  action text not null,
  entity_type text not null,
  entity_id text not null,
  from_status text,
  to_status text,
  created_at timestamptz not null default now()
);

create table public.stored_files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id),
  report_id uuid references public.reports (id) on delete cascade,
  object_path text not null,
  mime text not null,
  byte_size integer not null check (byte_size > 0 and byte_size <= 5242880),
  status text not null default 'quarantined' check (status in ('quarantined', 'released')),
  scan_status text not null default 'not_scanned' check (scan_status in ('not_scanned', 'clean', 'rejected')),
  redaction_note text not null default '',
  created_at timestamptz not null default now()
);

create table public.rate_buckets (
  bucket text primary key,
  hits integer not null,
  reset_at timestamptz not null
);

create index reports_owner_idx on public.reports (owner_id);
create index assignments_report_idx on public.report_assignments (report_id);
create index audit_category_idx on public.audit_events (category, created_at desc);

alter table public.profiles enable row level security;
alter table public.role_assignments enable row level security;
alter table public.invitations enable row level security;
alter table public.site_settings enable row level security;
alter table public.reports enable row level security;
alter table public.report_assessments enable row level security;
alter table public.report_assignments enable row level security;
alter table public.report_notes enable row level security;
alter table public.report_info_requests enable row level security;
alter table public.report_addenda enable row level security;
alter table public.case_summaries enable row level security;
alter table public.preservation_holds enable row level security;
alter table public.report_events enable row level security;
alter table public.updates enable row level security;
alter table public.update_corrections enable row level security;
alter table public.actions enable row level security;
alter table public.priorities enable row level security;
alter table public.survey_periods enable row level security;
alter table public.survey_responses enable row level security;
alter table public.survey_publications enable row level security;
alter table public.volunteer_applications enable row level security;
alter table public.questions enable row level security;
alter table public.process_entries enable row level security;
alter table public.audit_events enable row level security;
alter table public.stored_files enable row level security;
alter table public.rate_buckets enable row level security;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

create or replace function public.has_role(requested text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.role_assignments ra
    join public.profiles p on p.id = ra.profile_id
    where ra.profile_id = auth.uid() and ra.role = requested and ra.revoked_at is null and p.status = 'active'
  );
$$;

create or replace function public.is_assigned(target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.report_assignments a
    where a.report_id = target and a.assignee_id = auth.uid() and a.removed_at is null
  );
$$;

create or replace function public.aal2()
returns boolean language sql stable as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2';
$$;

create or replace function public.collection_open()
returns boolean language sql stable security definer set search_path = public as $$
  select
    char_length(controller_name) >= 3
    and char_length(controller_contact) >= 5
    and char_length(purposes) >= 20
    and char_length(article6_basis) >= 20
    and char_length(article9_condition) >= 20
    and char_length(processors) >= 20
    and char_length(hosting) >= 20
    and char_length(transfers) >= 20
    and char_length(retention) >= 20
    and char_length(rights_procedure) >= 20
    and char_length(breach_procedure) >= 20
    and char_length(dpia_assessment) >= 20
    and coordinator_confirmed_at is not null
    and tech_confirmed_at is not null
    and coordinator_confirmed_by is not null
    and tech_confirmed_by is not null
    and coordinator_confirmed_by <> tech_confirmed_by
  from public.site_settings where id = 1;
$$;

create or replace function public.make_reference(prefix text)
returns text language plpgsql security definer set search_path = public as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  suffix text := '';
  i integer;
begin
  for i in 1..5 loop
    suffix := suffix || substr(alphabet, 1 + (get_byte(gen_random_bytes(1), 0) % length(alphabet)), 1);
  end loop;
  return prefix || '-' || to_char(now() at time zone 'utc', 'YYYY') || '-' || suffix;
end;
$$;

create or replace function public.write_audit(actor uuid, category text, action text, entity_type text, entity_id text, from_status text, to_status text)
returns void language sql security definer set search_path = public as $$
  insert into public.audit_events (actor_id, category, action, entity_type, entity_id, from_status, to_status)
  values (actor, category, action, entity_type, entity_id, from_status, to_status);
$$;

create or replace function public.overlaps_private(candidate text)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  blob text;
  norm_candidate text := lower(regexp_replace(coalesce(candidate, ''), '\s+', ' ', 'g'));
  slice text;
  i integer;
begin
  for blob in
    select lower(regexp_replace(txt, '\s+', ' ', 'g'))
    from (
      select what_happened as txt from public.reports
      union all select personally_observed from public.reports
      union all select body from public.report_notes
      union all select body from public.report_addenda
      union all select other_text from public.survey_responses
      union all select contact from public.volunteer_applications
    ) private_text
    where char_length(txt) >= 40
  loop
    i := 1;
    while i <= char_length(blob) - 39 loop
      slice := substr(blob, i, 40);
      if position(slice in norm_candidate) > 0 then
        return true;
      end if;
      i := i + 5;
    end loop;
  end loop;
  return false;
end;
$$;

create or replace function public.require_collection()
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.collection_open() then
    raise exception 'collection_closed';
  end if;
end;
$$;

create or replace function public.require_privileged(requested text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(requested) then
    raise exception 'not_authorised';
  end if;
  if requested <> 'driver' and not public.aal2() then
    raise exception 'mfa_required';
  end if;
end;
$$;

create or replace function public.save_report(payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  existing public.reports%rowtype;
  new_id uuid := gen_random_uuid();
  ref text;
  next_status text;
begin
  perform public.require_collection();
  perform public.require_privileged('driver');
  if coalesce(payload->>'acknowledgement', '') <> 'yes' then
    raise exception 'validation';
  end if;
  if char_length(coalesce(payload->>'title', '')) < 5 or char_length(coalesce(payload->>'whatHappened', '')) < 20 then
    raise exception 'validation';
  end if;
  select * into existing from public.reports
  where owner_id = uid and idempotency_key = (payload->>'idempotencyKey')::uuid;
  if found then
    return jsonb_build_object('id', existing.id, 'reference', existing.reference, 'status', existing.status);
  end if;
  next_status := case when payload->>'intent' = 'draft' then 'draft' else 'received' end;
  ref := public.make_reference('DV');
  insert into public.reports (
    id, reference, kind, owner_id, status, category, title, event_date, event_date_end, depot_context,
    what_happened, personally_observed, needs_checking, effect_on_work, outcome_requested,
    official_channel, official_reference, contact_method, contact_detail, idempotency_key, submitted_at
  ) values (
    new_id, ref, 'concern', uid, next_status, payload->>'category', payload->>'title',
    (payload->>'eventDate')::date, nullif(payload->>'eventDateEnd', '')::date, nullif(payload->>'depotContext', ''),
    payload->>'whatHappened', payload->>'personallyObserved', payload->>'needsChecking', payload->>'effectOnWork', payload->>'outcomeRequested',
    payload->>'officialChannelUsed', nullif(payload->>'officialReference', ''), payload->>'contactMethod', nullif(payload->>'contactDetail', ''),
    (payload->>'idempotencyKey')::uuid, case when next_status = 'received' then now() else null end
  );
  insert into public.report_assessments (report_id, verification_status) values (new_id, 'unverified');
  perform public.write_audit(uid, 'case', 'report_submitted', 'report', new_id::text, null, next_status);
  return jsonb_build_object('id', new_id, 'reference', ref, 'status', next_status);
end;
$$;

create or replace function public.publish_update(update_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  row public.updates%rowtype;
  combined text;
begin
  perform public.require_privileged('publisher');
  select * into row from public.updates where id = update_id;
  if row.id is null or row.status <> 'in_review' or row.editor_reviewed_by is null then
    raise exception 'unreviewed';
  end if;
  if row.editor_reviewed_by = uid then
    raise exception 'not_authorised';
  end if;
  if row.classification = 'verified_fact' and (char_length(row.source_record) < 8 or char_length(row.reviewed_by) < 3) then
    raise exception 'validation';
  end if;
  combined := concat_ws(' ', row.headline, row.what_happened, row.what_unanswered, row.this_week, row.still_awaiting, row.actions_followed, row.driver_contribution);
  if public.overlaps_private(combined) then
    raise exception 'overlaps_private_record';
  end if;
  update public.updates set status = 'published', approved_by = uid, published_at = now() where id = update_id;
  perform public.write_audit(uid, 'publication', 'update_published', 'update', update_id::text, 'in_review', 'published');
  return jsonb_build_object('slug', row.slug);
end;
$$;

create or replace function public.review_update(update_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  perform public.require_privileged('editor');
  update public.updates
  set status = 'in_review', editor_reviewed_by = uid
  where id = update_id and status = 'draft'
    and (classification <> 'verified_fact' or (char_length(source_record) >= 8 and char_length(reviewed_by) >= 3));
  if not found then
    raise exception 'unreviewed';
  end if;
  perform public.write_audit(uid, 'publication', 'update_reviewed', 'update', update_id::text, 'draft', 'in_review');
  return jsonb_build_object('saved', true);
end;
$$;

create or replace function public.set_verification(report_id uuid, next_status text, source text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  if not (public.has_role('coordinator') or (public.has_role('reviewer') and public.is_assigned(report_id))) then
    raise exception 'not_authorised';
  end if;
  if not public.aal2() then
    raise exception 'mfa_required';
  end if;
  if next_status = 'verified' and char_length(coalesce(source, '')) < 8 then
    raise exception 'validation';
  end if;
  update public.report_assessments
  set verification_status = next_status,
      verification_source = case when next_status = 'verified' then source else null end,
      verified_by = case when next_status = 'verified' then uid else null end,
      verified_at = case when next_status = 'verified' then now() else null end
  where report_assessments.report_id = set_verification.report_id;
  perform public.write_audit(uid, 'case', 'verification_set', 'report', report_id::text, null, next_status);
  return jsonb_build_object('saved', true);
end;
$$;

create or replace function public.delete_report(report_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  perform public.require_privileged('coordinator');
  if exists (select 1 from public.preservation_holds h where h.report_id = delete_report.report_id) then
    raise exception 'legal_hold';
  end if;
  delete from public.reports where id = delete_report.report_id;
  if not found then
    raise exception 'not_authorised';
  end if;
  perform public.write_audit(uid, 'case', 'report_deleted', 'report', report_id::text, null, 'deleted');
  return jsonb_build_object('saved', true);
end;
$$;

create or replace function public.grant_role(profile_id uuid, requested text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  perform public.require_privileged('tech_admin');
  if profile_id = uid then
    raise exception 'not_authorised';
  end if;
  if not exists (select 1 from public.profiles p where p.id = profile_id and p.status = 'active') then
    raise exception 'not_authorised';
  end if;
  insert into public.role_assignments (profile_id, role, granted_by)
  select profile_id, requested, uid
  where not exists (
    select 1 from public.role_assignments ra
    where ra.profile_id = grant_role.profile_id and ra.role = requested and ra.revoked_at is null
  );
  perform public.write_audit(uid, 'account', 'role_granted', 'profile', profile_id::text, null, requested);
  return jsonb_build_object('saved', true);
end;
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  invite public.invitations%rowtype;
begin
  select * into invite from public.invitations
  where lower(email) = lower(new.email) and accepted_at is null and revoked_at is null and expires_at > now()
  order by created_at desc limit 1;
  insert into public.profiles (id, display_name, status)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''), 'pending');
  if invite.id is not null then
    update public.invitations set accepted_at = now() where id = invite.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create view public.published_updates with (security_barrier = true) as
select id, slug, headline, audience, what_happened, what_unanswered, follow_up_role,
       next_update_due, classification, published_at, this_week, still_awaiting,
       actions_followed, driver_contribution
from public.updates
where status = 'published' and audience = 'public';

create view public.published_corrections with (security_barrier = true) as
select c.update_id, c.note, c.corrected_at
from public.update_corrections c
join public.updates u on u.id = c.update_id
where u.status = 'published' and u.audience = 'public';

create view public.public_action_summaries with (security_barrier = true) as
select reference, public_summary as summary
from public.actions
where public_approved_by is not null and public_summary is not null;

create view public.public_priorities with (security_barrier = true) as
select id, outcome, measure, stage, last_review from public.priorities;

create view public.public_privacy_notice with (security_barrier = true) as
select controller_name, controller_contact, purposes, article6_basis, article9_condition,
       processors, hosting, transfers, retention, rights_procedure, breach_procedure, dpia_assessment
from public.site_settings
where id = 1 and publish_notice = true and public.collection_open();

grant select on public.published_updates, public.published_corrections, public.public_action_summaries, public.public_priorities, public.public_privacy_notice to anon, authenticated;

create policy reports_select on public.reports for select to authenticated using (
  (owner_id = auth.uid() and public.has_role('driver'))
  or (public.has_role('coordinator') and status <> 'draft')
  or (public.has_role('reviewer') and public.is_assigned(id) and status <> 'draft')
);

create policy profiles_select on public.profiles for select to authenticated using (
  id = auth.uid() or public.has_role('tech_admin') or public.has_role('coordinator')
);

create policy roles_select on public.role_assignments for select to authenticated using (
  profile_id = auth.uid() or public.has_role('tech_admin') or public.has_role('coordinator')
);

create policy notes_select on public.report_notes for select to authenticated using (
  public.has_role('coordinator') or (public.has_role('reviewer') and public.is_assigned(report_id))
);

create policy assessment_select on public.report_assessments for select to authenticated using (
  public.has_role('coordinator') or (public.has_role('reviewer') and public.is_assigned(report_id))
);

create policy survey_select on public.survey_responses for select to authenticated using (
  profile_id = auth.uid() or public.has_role('survey_admin')
);

create policy process_select on public.process_entries for select to authenticated using (
  public.has_role('coordinator')
);

create policy questions_select on public.questions for select to authenticated using (
  profile_id = auth.uid() or public.has_role('coordinator')
);

create policy files_select on public.stored_files for select to authenticated using (false);

grant select on public.profiles, public.role_assignments, public.reports, public.report_notes, public.report_assessments, public.survey_responses, public.process_entries, public.questions to authenticated;

grant execute on function public.has_role(text) to authenticated;
grant execute on function public.is_assigned(uuid) to authenticated;
grant execute on function public.aal2() to authenticated;
grant execute on function public.save_report(jsonb) to authenticated;
grant execute on function public.publish_update(uuid) to authenticated;
grant execute on function public.review_update(uuid) to authenticated;
grant execute on function public.set_verification(uuid, text, text) to authenticated;
grant execute on function public.delete_report(uuid) to authenticated;
grant execute on function public.grant_role(uuid, text) to authenticated;

revoke all on function public.overlaps_private(text) from public, anon, authenticated;
revoke all on function public.make_reference(text) from public, anon, authenticated;
revoke all on function public.write_audit(uuid, text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.collection_open() from public, anon, authenticated;
revoke all on function public.require_collection() from public, anon, authenticated;
revoke all on function public.require_privileged(text) from public, anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('private-records', 'private-records', false, 5242880, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do update set public = false, file_size_limit = 5242880;
