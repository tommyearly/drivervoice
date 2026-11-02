alter table public.priorities add column if not exists agreement_note text not null default '';

drop view if exists public.public_priorities;
create view public.public_priorities with (security_barrier = true) as
select id, outcome, measure, stage, last_review, agreement_note from public.priorities;
grant select on public.public_priorities to anon, authenticated;

create or replace function public.publish_priority(payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  new_id uuid := gen_random_uuid();
  combined text;
  agreement text := coalesce(payload->>'agreement', '');
begin
  perform public.require_privileged('publisher');
  if char_length(agreement) < 20 then
    raise exception 'validation';
  end if;
  combined := concat_ws(' ', payload->>'outcome', payload->>'measure', payload->>'stage', agreement);
  if public.overlaps_private(combined) then
    raise exception 'overlaps_private_record';
  end if;
  insert into public.priorities (id, outcome, measure, stage, last_review, agreement_note, approved_by)
  values (new_id, payload->>'outcome', payload->>'measure', payload->>'stage', (payload->>'lastReview')::date, agreement, uid);
  perform public.write_audit(uid, 'publication', 'priority_published', 'priority', new_id::text, null, 'published');
  return jsonb_build_object('id', new_id);
end;
$$;

create or replace function public.create_update(payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  new_id uuid := gen_random_uuid();
  slug text;
  combined text;
  reviewer text;
begin
  if not (public.has_role('editor') or public.has_role('coordinator')) then
    raise exception 'not_authorised';
  end if;
  if not public.aal2() then
    raise exception 'mfa_required';
  end if;
  select coalesce(nullif(trim(display_name), ''), 'account ' || left(uid::text, 8)) into reviewer
  from public.profiles where id = uid;
  if reviewer is null or char_length(reviewer) < 3 then
    reviewer := 'account ' || left(uid::text, 8);
  end if;
  if payload->>'classification' = 'verified_fact' and char_length(coalesce(payload->>'sourceRecord', '')) < 8 then
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
    coalesce(payload->>'sourceRecord', ''), reviewer, coalesce(payload->>'internalNote', ''), uid
  );
  perform public.write_audit(uid, 'publication', 'update_drafted', 'update', new_id::text, null, 'draft');
  return jsonb_build_object('id', new_id);
end;
$$;
