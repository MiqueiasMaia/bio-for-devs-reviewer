-- Sequential stage lock/unlock -------------------------------------------
-- Adds settings.unlocked_stages: the prefix of the review workflow
-- (título/resumo -> texto completo -> conflitos -> risco de viés ->
-- extração de dados) this project has opened up so far. Nav links to a
-- locked stage stay clickable (product requirement); the page itself
-- shows a locked notice instead of its real content — see StageGate.tsx
-- and src/domain/stageLock/stageLock.ts, the single source of truth for
-- the sequence both this migration and the frontend must agree on.
--
-- Backfill is retroactive by explicit product decision: every existing
-- project is locked down to just its first applicable stage, same as new
-- projects — there is no "grandfather everything unlocked" carve-out.
-- "First applicable stage" = title_abstract if enabled, else full_text if
-- enabled, else conflicts (covers the schema-legal but UI-unreachable case
-- of an empty stages_enabled array — conflicts has no on/off flag).
with first_stage as (
  select
    p.id,
    case
      when p.settings->'stages_enabled' ? 'title_abstract' then 'title_abstract'
      when p.settings->'stages_enabled' ? 'full_text' then 'full_text'
      else 'conflicts'
    end as stage
  from public.projects p
)
update public.projects p
set settings = p.settings || jsonb_build_object('unlocked_stages', jsonb_build_array(fs.stage))
from first_stage fs
where fs.id = p.id
  and not (p.settings ? 'unlocked_stages');

-- New projects need the same initial state.
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
