-- Active-learning reranking of the title/abstract screening queue (see
-- docs/pending-items.md §6.1) — MVP scope: reorder by predicted relevance
-- only, no statistical stopping rule/recall guarantee (that's future work,
-- noted in the doc). The model itself (TF-IDF + logistic regression) is
-- pure client-side TS (src/domain/activeLearning) trained on whatever
-- records already have a settled title_abstract decision — no server
-- component, no secrets, so this is just storage for its output.
alter table public.records
  add column relevance_score double precision,
  add column relevance_scored_at timestamptz;

-- Bulk write after a (re)training run — one round trip instead of one
-- UPDATE per record. Deliberately NOT security definer: it should run
-- under the calling user's own RLS, same "owner/reviewer can manage
-- records" policy as any other write to this table.
create or replace function public.set_relevance_scores(p_record_ids uuid[], p_scores double precision[])
returns void
language sql
as $$
  update public.records r
  set relevance_score = s.score,
      relevance_scored_at = now()
  from unnest(p_record_ids, p_scores) as s(id, score)
  where r.id = s.id;
$$;

grant execute on function public.set_relevance_scores(uuid[], double precision[]) to authenticated;

-- New project setting, same backfill pattern as risk_of_bias_enabled/data_extraction_enabled.
update public.projects
set settings = settings || '{"active_learning_enabled": false}'::jsonb
where not (settings ? 'active_learning_enabled');

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
  v_first_stage text;
begin
  v_first_stage := case
    when 'title_abstract' = any(p_stages_enabled) then 'title_abstract'
    when 'full_text' = any(p_stages_enabled) then 'full_text'
    else 'conflicts'
  end;

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
    'ai_screening_enabled', false,
    'ai_counts_as_reviewer', false,
    'risk_of_bias_enabled', false,
    'data_extraction_enabled', false,
    'active_learning_enabled', false,
    'unlocked_stages', jsonb_build_array(v_first_stage)
  );

  insert into public.projects (name, description, owner_id, prospero_id, created_by, settings)
  values (p_name, p_description, auth.uid(), nullif(p_prospero_id, ''), auth.uid(), v_settings)
  returning * into v_project;

  insert into public.project_members (project_id, user_id, role)
  values (v_project.id, auth.uid(), 'owner');

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
