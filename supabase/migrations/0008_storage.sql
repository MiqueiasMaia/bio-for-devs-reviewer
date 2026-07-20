-- Two buckets: raw import originals (RIS/CSV) and full-text PDFs. Both are
-- private; every object is stored at a path prefixed with its project id
-- (`${project_id}/...`), which the policies below parse out of
-- storage.objects.name to check project membership.
insert into storage.buckets (id, name, public)
values
  ('imports', 'imports', false),
  ('fulltext', 'fulltext', false)
on conflict (id) do nothing;

create or replace function public.storage_path_project_id(p_name text)
returns uuid
language sql
immutable
as $$
  select nullif(split_part(p_name, '/', 1), '')::uuid;
$$;

create policy "members can read import originals"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'imports'
    and public.is_project_member(public.storage_path_project_id(name))
  );

create policy "owner/reviewer can upload import originals"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'imports'
    and public.project_role(public.storage_path_project_id(name)) in ('owner', 'reviewer')
  );

create policy "owner/reviewer can delete import originals"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'imports'
    and public.project_role(public.storage_path_project_id(name)) in ('owner', 'reviewer')
  );

create policy "members can read fulltext pdfs"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'fulltext'
    and public.is_project_member(public.storage_path_project_id(name))
  );

create policy "owner/reviewer can upload fulltext pdfs"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'fulltext'
    and public.project_role(public.storage_path_project_id(name)) in ('owner', 'reviewer')
  );

create policy "owner/reviewer can delete fulltext pdfs"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'fulltext'
    and public.project_role(public.storage_path_project_id(name)) in ('owner', 'reviewer')
  );
