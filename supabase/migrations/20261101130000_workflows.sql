-- Live mutation functions used by the application.
-- Security-definer functions re-check the signed-in account. They do not trust a role sent by the browser.

create or replace function public.can_read_case(target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.reports r
    where r.id = target and r.status <> 'draft'
      and (
        public.has_role('coordinator')
        or (public.has_role('reviewer') and public.is_assigned(r.id))
      )
  );
$$;

revoke all on function public.can_read_case(uuid) from public, anon, authenticated;

create or replace view public.update_workbench with (security_barrier = true) as
select
  id, slug, status, headline, audience, what_happened, what_unanswered, follow_up_role,
  next_update_due, classification, this_week, still_awaiting, actions_followed, driver_contribution,
  case when public.has_role('editor') or public.has_role('coordinator') then source_record else '' end as source_record,
  reviewed_by,
  case when public.has_role('editor') or public.has_role('coordinator') then internal_note else '' end as internal_note,
  editor_reviewed_by, approved_by, published_at
from public.updates
where public.has_role('editor') or public.has_role('publisher') or public.has_role('coordinator');

grant select on public.update_workbench to authenticated;

drop policy if exists updates_select on public.updates;
create policy updates_select on public.updates for select to authenticated using (
  public.has_role('editor')
  or public.has_role('coordinator')
  or (status = 'published' and public.has_role('driver'))
);

create or replace function public.save_incident(payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  existing public.reports%rowtype;
  new_id uuid := gen_random_uuid();
  ref text;
  next_status text;
  sensitive boolean;
begin
  perform public.require_collection();
  perform public.require_privileged('driver');
  if coalesce(payload->>'acknowledgement', '') <> 'yes' then
    raise exception 'validation';
  end if;
  sensitive := payload->>'category' in ('Injury or welfare', 'Disciplinary', 'Third-party matter');
  if sensitive then
    if char_length(coalesce(payload->>'summary', '')) > 0 or char_length(coalesce(payload->>'outstanding', '')) > 0 then
      raise exception 'validation';
    end if;
    if char_length(coalesce(payload->>'supportRequested', '')) < 5 then
      raise exception 'validation';
    end if;
  elsif char_length(coalesce(payload->>'summary', '')) < 20 then
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
    id, reference, kind, owner_id, status, category, title, event_date, event_time, route_or_duty,
    what_happened, outstanding_issue, support_requested, sensitive, official_channel, official_reference,
    contact_method, contact_detail, idempotency_key, submitted_at
  ) values (
    new_id, ref, case when sensitive then 'callback' else 'incident' end, uid, next_status, payload->>'category',
    case when sensitive then 'Callback request' else coalesce(payload->>'category', 'Follow-up') || ' follow-up' end,
    (payload->>'eventDate')::date, nullif(payload->>'eventTime', ''),
    case when sensitive then null else nullif(payload->>'routeOrDuty', '') end,
    case when sensitive then '' else coalesce(payload->>'summary', '') end,
    case when sensitive then '' else coalesce(payload->>'outstanding', '') end,
    coalesce(payload->>'supportRequested', ''), sensitive,
    payload->>'officialChannelUsed', nullif(payload->>'officialReference', ''),
    payload->>'contactMethod', nullif(payload->>'contactDetail', ''),
    (payload->>'idempotencyKey')::uuid, case when next_status = 'received' then now() else null end
  );
  insert into public.report_assessments (report_id, verification_status) values (new_id, 'unverified');
  perform public.write_audit(uid, 'case', 'report_submitted', 'report', new_id::text, null, next_status);
  return jsonb_build_object('id', new_id, 'reference', ref, 'status', next_status);
end;
$$;

create or replace function public.respond_to_info(request_id uuid, body text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  req public.report_info_requests%rowtype;
  original text;
begin
  perform public.require_collection();
  perform public.require_privileged('driver');
  if char_length(coalesce(body, '')) < 5 then
    raise exception 'validation';
  end if;
  select * into req from public.report_info_requests where id = request_id;
  if req.id is null or not exists (select 1 from public.reports r where r.id = req.report_id and r.owner_id = uid) then
    raise exception 'not_authorised';
  end if;
  select what_happened into original from public.reports where id = req.report_id;
  update public.report_info_requests set responded_at = now() where id = request_id;
  insert into public.report_addenda (report_id, author_id, body) values (req.report_id, uid, body);
  if (select what_happened from public.reports where id = req.report_id) is distinct from original then
    raise exception 'validation';
  end if;
  perform public.write_audit(uid, 'case', 'information_added', 'report', req.report_id::text, null, null);
  return jsonb_build_object('saved', true);
end;
$$;

create or replace function public.request_report_change(report_id uuid, kind text, message text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  ref text;
  page_ref text;
  original text;
begin
  perform public.require_collection();
  perform public.require_privileged('driver');
  if kind not in ('correction', 'closure') or char_length(coalesce(message, '')) < 5 then
    raise exception 'validation';
  end if;
  select r.reference, r.what_happened into page_ref, original
  from public.reports r where r.id = report_id and r.owner_id = uid;
  if page_ref is null then
    raise exception 'not_authorised';
  end if;
  ref := public.make_reference('DVQ');
  insert into public.questions (reference, profile_id, page_ref, question, explanation, contact_preference)
  values (
    ref, uid, page_ref,
    case when kind = 'closure' then 'Closure requested' else 'Correction requested' end,
    message, 'account'
  );
  if (select what_happened from public.reports where id = report_id) is distinct from original then
    raise exception 'validation';
  end if;
  perform public.write_audit(uid, 'case', case when kind = 'closure' then 'closure_requested' else 'correction_requested' end, 'report', report_id::text, null, null);
  return jsonb_build_object('saved', true);
end;
$$;

create or replace function public.save_survey_response(first_rank text, second_rank text, third_rank text, other_text text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  period uuid;
begin
  perform public.require_collection();
  perform public.require_privileged('driver');
  if first_rank = second_rank or first_rank = third_rank or second_rank = third_rank then
    raise exception 'validation';
  end if;
  select id into period from public.survey_periods where closes_on >= current_date order by closes_on asc limit 1;
  if period is null then
    raise exception 'validation';
  end if;
  insert into public.survey_responses (period_id, profile_id, rank_first, rank_second, rank_third, other_text)
  values (period, uid, first_rank, second_rank, third_rank, coalesce(other_text, ''))
  on conflict (period_id, profile_id) do update
    set rank_first = excluded.rank_first,
        rank_second = excluded.rank_second,
        rank_third = excluded.rank_third,
        other_text = excluded.other_text,
        updated_at = now();
  perform public.write_audit(uid, 'survey', 'survey_saved', 'survey', period::text, null, null);
  return jsonb_build_object('saved', true);
end;
$$;

create or replace function public.submit_volunteer(payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  perform public.require_collection();
  perform public.require_privileged('driver');
  if char_length(coalesce(payload->>'name', '')) < 2 or char_length(coalesce(payload->>'statement', '')) < 20 then
    raise exception 'validation';
  end if;
  insert into public.volunteer_applications (profile_id, name, contact, depot, shift_pattern, preferred_role, statement, consent_profile)
  values (
    uid, payload->>'name', payload->>'contact', coalesce(payload->>'depot', ''), coalesce(payload->>'shiftPattern', ''),
    payload->>'preferredRole', payload->>'statement', payload->>'consentProfile' = 'yes'
  );
  perform public.write_audit(uid, 'account', 'volunteer_received', 'volunteer', uid::text, null, 'received');
  return jsonb_build_object('saved', true);
end;
$$;

create or replace function public.submit_question(payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  ref text;
begin
  perform public.require_collection();
  if char_length(coalesce(payload->>'companyWebsite', '')) > 0 then
    raise exception 'validation';
  end if;
  if char_length(coalesce(payload->>'question', '')) < 10 or char_length(coalesce(payload->>'explanation', '')) < 10 then
    raise exception 'validation';
  end if;
  ref := public.make_reference('DVQ');
  insert into public.questions (reference, profile_id, page_ref, question, explanation, contact_preference)
  values (ref, uid, payload->>'pageRef', payload->>'question', payload->>'explanation', coalesce(payload->>'contactPreference', ''));
  if uid is not null then
    perform public.write_audit(uid, 'case', 'question_received', 'question', ref, null, 'received');
  end if;
  return jsonb_build_object('reference', ref);
end;
$$;

create or replace function public.add_report_note(report_id uuid, body text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  if not public.can_read_case(report_id) then
    raise exception 'not_authorised';
  end if;
  if not public.aal2() then
    raise exception 'mfa_required';
  end if;
  if char_length(coalesce(body, '')) < 5 then
    raise exception 'validation';
  end if;
  insert into public.report_notes (report_id, author_id, body) values (report_id, uid, body);
  perform public.write_audit(uid, 'case', 'note_added', 'report', report_id::text, null, null);
  return jsonb_build_object('saved', true);
end;
$$;

create or replace function public.assign_report(report_id uuid, assignee_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  perform public.require_privileged('coordinator');
  if not exists (select 1 from public.reports r where r.id = report_id and r.status <> 'draft') then
    raise exception 'not_authorised';
  end if;
  if not exists (
    select 1 from public.role_assignments ra
    join public.profiles p on p.id = ra.profile_id
    where ra.profile_id = assignee_id and ra.role = 'reviewer' and ra.revoked_at is null and p.status = 'active'
  ) then
    raise exception 'validation';
  end if;
  insert into public.report_assignments (report_id, assignee_id, assigned_by)
  values (report_id, assignee_id, uid);
  perform public.write_audit(uid, 'case', 'reviewer_assigned', 'report', report_id::text, null, 'assigned');
  return jsonb_build_object('saved', true);
end;
$$;

create or replace function public.transition_report_status(report_id uuid, next_status text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  previous text;
begin
  if not public.can_read_case(report_id) then
    raise exception 'not_authorised';
  end if;
  if not public.aal2() then
    raise exception 'mfa_required';
  end if;
  if next_status not in ('received', 'triage', 'more_information_needed', 'under_review', 'referred', 'awaiting_response', 'resolved', 'closed') then
    raise exception 'validation';
  end if;
  select status into previous from public.reports where id = report_id;
  update public.reports set status = next_status where id = report_id and status <> 'draft';
  if not found then
    raise exception 'not_authorised';
  end if;
  perform public.write_audit(uid, 'case', 'status_changed', 'report', report_id::text, previous, next_status);
  return jsonb_build_object('saved', true);
end;
$$;

create or replace function public.request_more_information(report_id uuid, message text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  previous text;
begin
  if not public.can_read_case(report_id) then
    raise exception 'not_authorised';
  end if;
  if not public.aal2() then
    raise exception 'mfa_required';
  end if;
  if char_length(coalesce(message, '')) < 5 then
    raise exception 'validation';
  end if;
  select status into previous from public.reports where id = report_id;
  insert into public.report_info_requests (report_id, requested_by, message, due_at)
  values (report_id, uid, message, current_date + 5);
  update public.reports set status = 'more_information_needed' where id = report_id;
  perform public.write_audit(uid, 'case', 'information_requested', 'report', report_id::text, previous, 'more_information_needed');
  return jsonb_build_object('saved', true);
end;
$$;

create or replace function public.save_case_summary(report_id uuid, audience text, body text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  if audience not in ('members', 'public') or char_length(coalesce(body, '')) < 10 then
    raise exception 'validation';
  end if;
  if not (public.has_role('editor') or public.has_role('coordinator') or public.can_read_case(report_id)) then
    raise exception 'not_authorised';
  end if;
  if not public.aal2() then
    raise exception 'mfa_required';
  end if;
  if public.overlaps_private(body) then
    raise exception 'overlaps_private_record';
  end if;
  insert into public.case_summaries (report_id, audience, body)
  values (report_id, audience, body)
  on conflict (report_id, audience) do update
    set body = excluded.body, approved_by = null, approved_at = null;
  perform public.write_audit(uid, 'publication', 'summary_drafted', 'report', report_id::text, null, audience);
  return jsonb_build_object('saved', true);
end;
$$;

create or replace function public.create_update(payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  new_id uuid := gen_random_uuid();
  slug text;
  combined text;
begin
  if not (public.has_role('editor') or public.has_role('coordinator')) then
    raise exception 'not_authorised';
  end if;
  if not public.aal2() then
    raise exception 'mfa_required';
  end if;
  if payload->>'classification' = 'verified_fact'
     and (char_length(coalesce(payload->>'sourceRecord', '')) < 8 or char_length(coalesce(payload->>'reviewedBy', '')) < 3) then
    raise exception 'validation';
  end if;
  combined := concat_ws(' ', payload->>'headline', payload->>'thisWeek', payload->>'stillAwaiting', payload->>'actionsFollowed', payload->>'driverContribution');
  if public.overlaps_private(combined) then
    raise exception 'overlaps_private_record';
  end if;
  slug := left(trim(both '-' from lower(regexp_replace(coalesce(payload->>'headline', 'update'), '[^a-zA-Z0-9]+', '-', 'g'))), 60);
  if slug = '' then slug := 'update'; end if;
  slug := slug || '-' || substr(new_id::text, 1, 8);
  insert into public.updates (
    id, slug, status, headline, audience, what_happened, what_unanswered, follow_up_role, next_update_due,
    classification, this_week, still_awaiting, actions_followed, driver_contribution,
    source_record, reviewed_by, internal_note, author_id
  ) values (
    new_id, slug, 'draft', payload->>'headline', payload->>'audience', coalesce(payload->>'thisWeek', ''),
    coalesce(payload->>'stillAwaiting', ''), payload->>'followUpRole', (payload->>'nextUpdateDue')::date,
    payload->>'classification', payload->>'thisWeek', payload->>'stillAwaiting', payload->>'actionsFollowed', payload->>'driverContribution',
    coalesce(payload->>'sourceRecord', ''), coalesce(payload->>'reviewedBy', ''), coalesce(payload->>'internalNote', ''), uid
  );
  perform public.write_audit(uid, 'publication', 'update_drafted', 'update', new_id::text, null, 'draft');
  return jsonb_build_object('id', new_id);
end;
$$;

create or replace function public.correct_update(update_id uuid, note text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  perform public.require_privileged('publisher');
  if char_length(coalesce(note, '')) < 5 then
    raise exception 'validation';
  end if;
  if public.overlaps_private(note) then
    raise exception 'overlaps_private_record';
  end if;
  if not exists (select 1 from public.updates u where u.id = update_id and u.status = 'published') then
    raise exception 'not_authorised';
  end if;
  insert into public.update_corrections (update_id, note, corrected_by) values (update_id, note, uid);
  perform public.write_audit(uid, 'publication', 'update_corrected', 'update', update_id::text, 'published', 'published');
  return jsonb_build_object('saved', true);
end;
$$;

create or replace function public.save_action(payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  new_id uuid := gen_random_uuid();
  ref text;
  combined text;
begin
  perform public.require_privileged('coordinator');
  combined := concat_ws(' ', payload->>'title', payload->>'agreedOutcome', payload->>'latestUpdate');
  if public.overlaps_private(combined) then
    raise exception 'overlaps_private_record';
  end if;
  ref := public.make_reference('DVA');
  insert into public.actions (
    id, reference, title, agreed_outcome, responsible_role, date_agreed, target_date, status, latest_update, next_review_date
  ) values (
    new_id, ref, payload->>'title', payload->>'agreedOutcome', payload->>'responsibleRole',
    (payload->>'dateAgreed')::date, (payload->>'targetDate')::date, payload->>'status', payload->>'latestUpdate', (payload->>'nextReviewDate')::date
  );
  perform public.write_audit(uid, 'publication', 'action_saved', 'action', new_id::text, null, payload->>'status');
  return jsonb_build_object('id', new_id, 'reference', ref);
end;
$$;

create or replace function public.draft_public_action(action_id uuid, summary text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  if not (public.has_role('editor') or public.has_role('coordinator')) then
    raise exception 'not_authorised';
  end if;
  if not public.aal2() then
    raise exception 'mfa_required';
  end if;
  if char_length(coalesce(summary, '')) < 10 or public.overlaps_private(summary) then
    raise exception 'overlaps_private_record';
  end if;
  update public.actions
  set public_summary_draft = summary, public_summary_author = uid, public_summary = null, public_approved_by = null
  where id = action_id;
  if not found then
    raise exception 'not_authorised';
  end if;
  perform public.write_audit(uid, 'publication', 'public_action_drafted', 'action', action_id::text, null, 'draft');
  return jsonb_build_object('saved', true);
end;
$$;

create or replace function public.approve_public_action(action_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  row public.actions%rowtype;
begin
  perform public.require_privileged('publisher');
  select * into row from public.actions where id = action_id;
  if row.id is null or char_length(row.public_summary_draft) < 10 or row.public_summary_author is null then
    raise exception 'unreviewed';
  end if;
  if row.public_summary_author = uid then
    raise exception 'not_authorised';
  end if;
  if public.overlaps_private(row.public_summary_draft) then
    raise exception 'overlaps_private_record';
  end if;
  update public.actions
  set public_summary = public_summary_draft, public_approved_by = uid
  where id = action_id;
  perform public.write_audit(uid, 'publication', 'public_action_approved', 'action', action_id::text, 'draft', 'public');
  return jsonb_build_object('saved', true);
end;
$$;

create or replace function public.save_process_entry(payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  new_id uuid := gen_random_uuid();
begin
  perform public.require_privileged('coordinator');
  if payload->>'processType' = 'WRC referral'
     and (char_length(coalesce(payload->>'confirmationSource', '')) < 5 or coalesce(payload->>'confirmationDate', '') = '') then
    raise exception 'validation';
  end if;
  insert into public.process_entries (
    id, process_type, referral_date, reference_number, confirmation_source, confirmation_date,
    requested_information, request_date, requested_reply_date, response_received, responsible_role, next_step, review_date, updated_by
  ) values (
    new_id, coalesce(payload->>'processType', 'Not confirmed'), nullif(payload->>'referralDate', '')::date,
    coalesce(payload->>'referenceNumber', ''), coalesce(payload->>'confirmationSource', ''), nullif(payload->>'confirmationDate', '')::date,
    coalesce(payload->>'requestedInformation', ''), nullif(payload->>'requestDate', '')::date, nullif(payload->>'requestedReplyDate', '')::date,
    coalesce(payload->>'responseReceived', ''), coalesce(payload->>'responsibleRole', ''), coalesce(payload->>'nextStep', ''),
    nullif(payload->>'reviewDate', '')::date, uid
  );
  perform public.write_audit(uid, 'case', 'process_saved', 'process', new_id::text, null, payload->>'processType');
  return jsonb_build_object('id', new_id);
end;
$$;

create or replace function public.publish_priority(payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  new_id uuid := gen_random_uuid();
  combined text;
begin
  perform public.require_privileged('publisher');
  combined := concat_ws(' ', payload->>'outcome', payload->>'measure', payload->>'stage');
  if public.overlaps_private(combined) then
    raise exception 'overlaps_private_record';
  end if;
  insert into public.priorities (id, outcome, measure, stage, last_review, approved_by)
  values (new_id, payload->>'outcome', payload->>'measure', payload->>'stage', (payload->>'lastReview')::date, uid);
  perform public.write_audit(uid, 'publication', 'priority_published', 'priority', new_id::text, null, 'published');
  return jsonb_build_object('id', new_id);
end;
$$;

create or replace function public.confirm_eligibility(profile_id uuid, note text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  perform public.require_privileged('coordinator');
  if profile_id = uid or char_length(coalesce(note, '')) < 5 then
    raise exception 'not_authorised';
  end if;
  if not exists (select 1 from public.profiles p where p.id = profile_id and p.status = 'pending') then
    raise exception 'not_authorised';
  end if;
  update public.profiles set status = 'active', updated_at = now() where id = profile_id;
  insert into public.role_assignments (profile_id, role, granted_by)
  select profile_id, 'driver', uid
  where not exists (
    select 1 from public.role_assignments ra
    where ra.profile_id = confirm_eligibility.profile_id and ra.role = 'driver' and ra.revoked_at is null
  );
  perform public.write_audit(uid, 'account', 'eligibility_confirmed', 'profile', profile_id::text, 'pending', 'active');
  return jsonb_build_object('saved', true);
end;
$$;

create or replace function public.revoke_role(assignment_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  row public.role_assignments%rowtype;
begin
  perform public.require_privileged('tech_admin');
  select * into row from public.role_assignments where id = assignment_id and revoked_at is null;
  if row.id is null or row.profile_id = uid then
    raise exception 'not_authorised';
  end if;
  update public.role_assignments set revoked_at = now() where id = assignment_id;
  perform public.write_audit(uid, 'account', 'role_revoked', 'profile', row.profile_id::text, row.role, 'revoked');
  return jsonb_build_object('saved', true);
end;
$$;

create or replace function public.revoke_member(profile_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  perform public.require_privileged('tech_admin');
  if profile_id = uid then
    raise exception 'not_authorised';
  end if;
  update public.profiles set status = 'revoked', updated_at = now() where id = profile_id;
  if not found then
    raise exception 'not_authorised';
  end if;
  update public.role_assignments set revoked_at = now() where role_assignments.profile_id = revoke_member.profile_id and revoked_at is null;
  perform public.write_audit(uid, 'account', 'access_revoked', 'profile', profile_id::text, null, 'revoked');
  return jsonb_build_object('saved', true);
end;
$$;

create or replace function public.update_own_profile(display_name text, contact_preference text, email_updates boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  perform public.require_collection();
  if uid is null or char_length(coalesce(display_name, '')) < 2 then
    raise exception 'validation';
  end if;
  if contact_preference not in ('account', 'phone', 'email') then
    raise exception 'validation';
  end if;
  update public.profiles
  set display_name = update_own_profile.display_name,
      contact_preference = update_own_profile.contact_preference,
      email_updates = update_own_profile.email_updates,
      updated_at = now()
  where id = uid and status = 'active';
  if not found then
    raise exception 'not_authorised';
  end if;
  perform public.write_audit(uid, 'account', 'profile_updated', 'profile', uid::text, null, null);
  return jsonb_build_object('saved', true);
end;
$$;

create or replace function public.save_privacy_settings(payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  if not (public.has_role('coordinator') or public.has_role('tech_admin')) or not public.aal2() then
    raise exception 'not_authorised';
  end if;
  update public.site_settings set
    controller_name = payload->>'controllerName',
    controller_contact = payload->>'controllerContact',
    purposes = payload->>'purposes',
    article6_basis = payload->>'article6Basis',
    article9_condition = payload->>'article9Condition',
    processors = payload->>'processors',
    hosting = payload->>'hosting',
    transfers = payload->>'transfers',
    retention = payload->>'retention',
    rights_procedure = payload->>'rightsProcedure',
    breach_procedure = payload->>'breachProcedure',
    dpia_assessment = payload->>'dpiaAssessment',
    organising_start_date = nullif(payload->>'organisingStartDate', '')::date,
    publish_notice = payload->>'publishNotice' = 'yes',
    updated_at = now()
  where id = 1;
  perform public.write_audit(uid, 'settings', 'privacy_settings_saved', 'settings', 'site', null, null);
  return jsonb_build_object('saved', true);
end;
$$;

create or replace function public.confirm_privacy(which_role text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  other uuid;
begin
  if which_role = 'coordinator' then
    perform public.require_privileged('coordinator');
    select tech_confirmed_by into other from public.site_settings where id = 1;
    if other = uid then
      raise exception 'not_authorised';
    end if;
    update public.site_settings set coordinator_confirmed_at = now(), coordinator_confirmed_by = uid where id = 1;
  elsif which_role = 'tech_admin' then
    perform public.require_privileged('tech_admin');
    select coordinator_confirmed_by into other from public.site_settings where id = 1;
    if other = uid then
      raise exception 'not_authorised';
    end if;
    update public.site_settings set tech_confirmed_at = now(), tech_confirmed_by = uid where id = 1;
  else
    raise exception 'validation';
  end if;
  perform public.write_audit(uid, 'settings', 'privacy_confirmed', 'settings', 'site', null, which_role);
  return jsonb_build_object('saved', true);
end;
$$;

create or replace function public.set_legal_hold(report_id uuid, hold boolean, reason text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  perform public.require_privileged('coordinator');
  if not exists (select 1 from public.reports r where r.id = report_id) then
    raise exception 'not_authorised';
  end if;
  if hold then
    if char_length(coalesce(reason, '')) < 8 then
      raise exception 'validation';
    end if;
    insert into public.preservation_holds (report_id, reason, created_by)
    values (report_id, reason, uid)
    on conflict (report_id) do nothing;
  else
    delete from public.preservation_holds where preservation_holds.report_id = set_legal_hold.report_id;
  end if;
  perform public.write_audit(uid, 'case', case when hold then 'legal_hold_set' else 'legal_hold_cleared' end, 'report', report_id::text, null, case when hold then 'hold' else 'open' end);
  return jsonb_build_object('saved', true);
end;
$$;

create or replace function public.publish_survey_aggregate(audience text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  period uuid;
  total integer;
  small_cells integer;
  large_cells integer;
  snapshot jsonb;
begin
  perform public.require_privileged('survey_admin');
  if audience not in ('committee', 'members', 'public') then
    raise exception 'validation';
  end if;
  select id into period from public.survey_periods order by created_at desc limit 1;
  if period is null then
    raise exception 'validation';
  end if;
  select count(*) into total from public.survey_responses where period_id = period;
  select count(*) filter (where n > 0 and n < 5), count(*) filter (where n >= 5)
  into small_cells, large_cells
  from (
    select count(*) as n from public.survey_responses where period_id = period group by rank_first
  ) cells;
  if total < 5 or small_cells = 1 or large_cells <= 1 then
    snapshot := jsonb_build_object('withheld', true, 'total', total, 'note', 'Results are withheld so people cannot be identified.');
  else
    snapshot := jsonb_build_object(
      'withheld', false,
      'total', total,
      'cells', (
        select jsonb_agg(jsonb_build_object('label', rank_first, 'count', case when count(*) < 5 then null else count(*) end))
        from public.survey_responses where period_id = period group by rank_first
      )
    );
  end if;
  insert into public.survey_publications (period_id, audience, snapshot, published_by)
  values (period, audience, snapshot, uid);
  perform public.write_audit(uid, 'survey', 'aggregate_published', 'survey', period::text, null, audience);
  return jsonb_build_object('saved', true);
end;
$$;

create or replace function public.create_invitation(email text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  new_id uuid := gen_random_uuid();
begin
  perform public.require_privileged('tech_admin');
  if email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'validation';
  end if;
  insert into public.invitations (id, email, invited_by) values (new_id, lower(email), uid);
  perform public.write_audit(uid, 'account', 'invitation_created', 'invitation', new_id::text, null, null);
  return jsonb_build_object('invitationId', new_id);
end;
$$;

create or replace function public.review_update(update_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  if not (public.has_role('editor') or public.has_role('coordinator')) then
    raise exception 'not_authorised';
  end if;
  if not public.aal2() then
    raise exception 'mfa_required';
  end if;
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

insert into public.survey_periods (closes_on)
select date '2099-12-31'
where not exists (select 1 from public.survey_periods);

grant execute on function public.save_incident(jsonb) to authenticated;
grant execute on function public.respond_to_info(uuid, text) to authenticated;
grant execute on function public.request_report_change(uuid, text, text) to authenticated;
grant execute on function public.save_survey_response(text, text, text, text) to authenticated;
grant execute on function public.submit_volunteer(jsonb) to authenticated;
grant execute on function public.submit_question(jsonb) to anon, authenticated;
grant execute on function public.add_report_note(uuid, text) to authenticated;
grant execute on function public.assign_report(uuid, uuid) to authenticated;
grant execute on function public.transition_report_status(uuid, text) to authenticated;
grant execute on function public.request_more_information(uuid, text) to authenticated;
grant execute on function public.save_case_summary(uuid, text, text) to authenticated;
grant execute on function public.create_update(jsonb) to authenticated;
grant execute on function public.correct_update(uuid, text) to authenticated;
grant execute on function public.save_action(jsonb) to authenticated;
grant execute on function public.draft_public_action(uuid, text) to authenticated;
grant execute on function public.approve_public_action(uuid) to authenticated;
grant execute on function public.save_process_entry(jsonb) to authenticated;
grant execute on function public.publish_priority(jsonb) to authenticated;
grant execute on function public.confirm_eligibility(uuid, text) to authenticated;
grant execute on function public.revoke_role(uuid) to authenticated;
grant execute on function public.revoke_member(uuid) to authenticated;
grant execute on function public.update_own_profile(text, text, boolean) to authenticated;
grant execute on function public.save_privacy_settings(jsonb) to authenticated;
grant execute on function public.confirm_privacy(text) to authenticated;
grant execute on function public.set_legal_hold(uuid, boolean, text) to authenticated;
grant execute on function public.publish_survey_aggregate(text) to authenticated;
grant execute on function public.create_invitation(text) to authenticated;
