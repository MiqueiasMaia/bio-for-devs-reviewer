-- On every new auth.users row: create the matching profile, then convert any
-- pending project_invites for that email into project_members rows. Runs as
-- security definer (owned by the migration role) so it can write to
-- public.profiles/project_members/project_invites regardless of the new
-- user's own RLS grants — at this point in the signup flow they have none.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_display_name text;
begin
  v_display_name := coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1));

  insert into public.profiles (id, email, display_name, initials)
  values (new.id, new.email, v_display_name, public.derive_initials(v_display_name))
  on conflict (id) do nothing;

  insert into public.project_members (project_id, user_id, role)
  select pi.project_id, new.id, pi.role
  from public.project_invites pi
  where pi.email = new.email::citext
  on conflict (project_id, user_id) do nothing;

  delete from public.project_invites where email = new.email::citext;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
