-- "Mark as not duplicates" (DedupResolutionWizard's onNotDuplicates) splits
-- every record out of its candidate group, which resets is_duplicate/
-- dedup_confirmed on each — leaving no trace that they were ever considered
-- duplicates. To show a Rayyan-style "Not Duplicate" count in the Data
-- Summary panel, that outcome needs its own durable counter (one increment
-- per group resolved this way, not per record — same unit as the existing
-- group-based "resolved" count).
alter table public.projects
  add column dedup_not_duplicate_count integer not null default 0;

create or replace function public.increment_dedup_not_duplicate_count(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_project_member(p_project_id) then
    raise exception 'not a member of this project';
  end if;
  update public.projects
  set dedup_not_duplicate_count = dedup_not_duplicate_count + 1
  where id = p_project_id;
end;
$$;

grant execute on function public.increment_dedup_not_duplicate_count(uuid) to authenticated;
