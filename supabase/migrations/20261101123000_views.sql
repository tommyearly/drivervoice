create or replace view public.site_status with (security_barrier = true) as
select public.collection_open() as submissions_open;

create or replace view public.public_plan with (security_barrier = true) as
select organising_start_date from public.site_settings where id = 1;

create or replace view public.member_updates with (security_barrier = true) as
select id, slug, headline, audience, what_happened, what_unanswered, follow_up_role,
       next_update_due, classification, published_at, this_week, still_awaiting,
       actions_followed, driver_contribution
from public.updates
where status = 'published' and audience in ('public', 'members') and public.has_role('driver');

create or replace view public.member_actions with (security_barrier = true) as
select id, reference, title, agreed_outcome, responsible_role, date_agreed, target_date, status,
       latest_update, next_review_date,
       case when public_approved_by is not null then public_summary else null end as public_summary
from public.actions
where public.has_role('driver') or public.has_role('coordinator') or public.has_role('editor') or public.has_role('publisher');

grant select on public.site_status, public.public_plan to anon, authenticated;
grant select on public.member_updates, public.member_actions to authenticated;

create policy info_select on public.report_info_requests for select to authenticated using (
  exists (select 1 from public.reports r where r.id = report_id and r.owner_id = auth.uid())
  or public.has_role('coordinator')
  or (public.has_role('reviewer') and public.is_assigned(report_id))
);
create policy assignment_select on public.report_assignments for select to authenticated using (
  public.has_role('coordinator') or assignee_id = auth.uid() or exists (
    select 1 from public.reports r where r.id = report_id and r.owner_id = auth.uid()
  )
);
create policy updates_select on public.updates for select to authenticated using (
  public.has_role('editor') or public.has_role('publisher') or public.has_role('coordinator')
  or (status = 'published' and public.has_role('driver'))
);
create policy audit_select on public.audit_events for select to authenticated using (
  (category = 'account' and public.has_role('tech_admin'))
  or (category <> 'account' and public.has_role('coordinator'))
);
create policy volunteer_select on public.volunteer_applications for select to authenticated using (
  profile_id = auth.uid() or public.has_role('coordinator')
);
create policy settings_select on public.site_settings for select to authenticated using (
  public.has_role('coordinator') or public.has_role('tech_admin')
);

grant select on public.report_info_requests, public.report_assignments, public.updates, public.audit_events, public.volunteer_applications, public.site_settings to authenticated;
