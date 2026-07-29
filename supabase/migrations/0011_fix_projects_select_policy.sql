-- Bug fix: create_project() does
--   insert into public.projects (...) values (...) returning * into v_project;
--   insert into public.project_members (project_id, user_id, role) values (v_project.id, auth.uid(), 'owner');
-- An INSERT ... RETURNING under RLS must also satisfy the table's SELECT
-- policy for the new row (so it can be returned). At the moment of that
-- RETURNING, the project_members row that would make the creator a member
-- doesn't exist yet — it's the *next* statement — so the old
-- is_project_member(id)-only policy rejects the RETURNING and the whole
-- function fails with "new row violates row-level security policy for
-- table projects", even though the INSERT's own WITH CHECK passed. The
-- creator, by definition, owns the row they just created — let owner_id
-- grant visibility too, independent of project_members state.
drop policy "members can view their projects" on public.projects;

create policy "members can view their projects"
  on public.projects for select
  to authenticated
  using (public.is_project_member(id) or owner_id = auth.uid());
