-- Mobile number and terms acceptance for driver signup.
-- The number is for coordinator WhatsApp contact. It is not published.
-- This script does not decide a lawful basis.

alter table public.profiles
  add column if not exists mobile_e164 text,
  add column if not exists whatsapp_consent boolean not null default false,
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_mobile_e164_e164') then
    alter table public.profiles
      add constraint profiles_mobile_e164_e164
      check (mobile_e164 is null or mobile_e164 ~ '^\+[1-9][0-9]{7,14}$');
  end if;
end $$;

drop function if exists public.update_own_profile(text, text, boolean);

create function public.update_own_profile(
  display_name text,
  contact_preference text,
  email_updates boolean,
  mobile_e164 text,
  whatsapp_consent boolean,
  terms_accepted text,
  terms_version text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  perform public.require_collection();
  if uid is null or char_length(coalesce(display_name, '')) < 2 or char_length(coalesce(display_name, '')) > 80 then
    raise exception 'validation';
  end if;
  if contact_preference not in ('account', 'phone', 'email') then
    raise exception 'validation';
  end if;
  if terms_accepted is distinct from 'yes' or whatsapp_consent is distinct from true then
    raise exception 'validation';
  end if;
  if terms_version is null or char_length(terms_version) < 4 or char_length(terms_version) > 40 then
    raise exception 'validation';
  end if;
  if mobile_e164 is null or mobile_e164 !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception 'validation';
  end if;

  update public.profiles
  set display_name = update_own_profile.display_name,
      contact_preference = update_own_profile.contact_preference,
      email_updates = update_own_profile.email_updates,
      mobile_e164 = update_own_profile.mobile_e164,
      whatsapp_consent = true,
      terms_accepted_at = case
        when public.profiles.terms_version is not distinct from update_own_profile.terms_version
         and public.profiles.terms_accepted_at is not null
        then public.profiles.terms_accepted_at
        else now()
      end,
      terms_version = update_own_profile.terms_version,
      updated_at = now()
  where id = uid and status = 'active';

  if not found then
    raise exception 'not_authorised';
  end if;

  perform public.write_audit(uid, 'account', 'profile_updated', 'profile', uid::text, null, 'terms_accepted');
  return jsonb_build_object('saved', true);
end;
$$;

grant execute on function public.update_own_profile(text, text, boolean, text, boolean, text, text) to authenticated;
