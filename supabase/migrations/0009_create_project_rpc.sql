-- Project creation touches three tables (projects, project_members,
-- exclusion_reasons) and needs to be atomic, so it's a single RPC rather
-- than three sequential client-side inserts that could partially fail. This
-- function is SECURITY INVOKER (the default — no `security definer` here),
-- so it runs with the calling user's own privileges and is still fully
-- subject to RLS; it succeeds only because, at each step, the policies
-- written in 0002/0003 already allow exactly this sequence for the caller.
create or replace function public.create_project(
  p_name text,
  p_description text default '',
  p_prospero_id text default null,
  p_reviewers_required_per_record int default 2,
  p_stages_enabled text[] default array['title_abstract', 'full_text']
)
returns public.projects
language plpgsql
as $$
declare
  v_project public.projects;
  v_settings jsonb;
begin
  v_settings := jsonb_build_object(
    'reviewers_required_per_record', p_reviewers_required_per_record,
    'blind_screening', true,
    'auto_advance_on_decision', true,
    'stages_enabled', to_jsonb(p_stages_enabled),
    'dedup', jsonb_build_object(
      'on_doi', true,
      'on_normalized_title', true,
      'title_similarity_threshold', 0.92
    ),
    'ui_locale', 'pt-BR',
    'ai_screening_enabled', false
  );

  insert into public.projects (name, description, owner_id, prospero_id, created_by, settings)
  values (p_name, p_description, auth.uid(), nullif(p_prospero_id, ''), auth.uid(), v_settings)
  returning * into v_project;

  insert into public.project_members (project_id, user_id, role)
  values (v_project.id, auth.uid(), 'owner');

  -- Default Rayyan-style exclusion-reason taxonomy (spec §3); fully editable
  -- afterwards from Project Settings → Exclusion reasons.
  insert into public.exclusion_reasons (project_id, code, label, order_index)
  values
    (v_project.id, 'wrong_outcome', 'Desfecho errado', 1),
    (v_project.id, 'wrong_population', 'População errada', 2),
    (v_project.id, 'wrong_study_design', 'Desenho de estudo errado', 3),
    (v_project.id, 'wrong_intervention', 'Intervenção errada', 4),
    (v_project.id, 'fulltext_unavailable', 'Texto completo indisponível', 5),
    (v_project.id, 'retracted_article', 'Artigo retratado', 6);

  return v_project;
end;
$$;

grant execute on function public.create_project(text, text, text, int, text[]) to authenticated;
