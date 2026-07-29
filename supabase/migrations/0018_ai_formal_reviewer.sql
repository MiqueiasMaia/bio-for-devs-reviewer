-- AI as a formal co-reviewer ------------------------------------------------
-- When ai_counts_as_reviewer is on, a confident AI screening (INCLUDE or
-- EXCLUDE) occupies one of the reviewers_required_per_record slots, same as
-- a human screening — cutting the human workload roughly in half when AI
-- and a single human agree. A UNCERTAIN AI decision never counts: it's
-- treated as if the AI hadn't screened the record at all, so the slot
-- stays open for a human. This is applied at the very bottom of the
-- decision pipeline (v_record_stage_decisions), so v_record_final_decision,
-- v_conflicts, v_prisma_counts and v_fulltext_exclusion_reasons all keep
-- working unmodified — they just see one more "reviewer" in the mix when
-- the project opts in.
update public.projects
set settings = settings || '{"ai_counts_as_reviewer": false}'::jsonb
where not (settings ? 'ai_counts_as_reviewer');

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
    'ai_screening_enabled', false,
    'ai_counts_as_reviewer', false,
    'risk_of_bias_enabled', false
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

-- v_record_stage_decisions: union human screenings with confident AI
-- screenings (only when the owning project opted in). AI rows carry
-- reviewer_id = null in the jsonb (never collides with a real reviewer
-- uuid — fetchQueue's "have I already screened this" check stays correct
-- unmodified) plus is_ai = true so a future UI can distinguish it if
-- needed; the AI's decision itself stays invisible to the active screening
-- UI exactly like today (no screen reads reviewer_decisions' content, only
-- its counts), only revealed in ConflictsPage via the separate
-- ai_screenings query that already exists there.
create or replace view public.v_record_stage_decisions with (security_invoker = true) as
with combined as (
  select
    s.record_id,
    s.stage,
    s.reviewer_id,
    s.decision,
    s.reasons,
    s.decided_at
  from public.screenings s
  union all
  select
    a.record_id,
    a.stage,
    null::uuid as reviewer_id,
    a.decision,
    '{}'::text[] as reasons,
    a.created_at as decided_at
  from public.ai_screenings a
  join public.records r on r.id = a.record_id
  join public.projects p on p.id = r.project_id
  where a.decision <> 'UNCERTAIN'
    and coalesce((p.settings ->> 'ai_counts_as_reviewer')::boolean, false)
)
select
  r.id as record_id,
  r.project_id,
  c.stage,
  jsonb_agg(
    jsonb_build_object(
      'reviewer_id', c.reviewer_id,
      'decision', c.decision,
      'reasons', c.reasons,
      'decided_at', c.decided_at,
      'is_ai', c.reviewer_id is null
    )
    order by c.decided_at
  ) as reviewer_decisions,
  count(*) as reviews_count,
  count(distinct c.decision) as distinct_decision_count,
  (array_agg(c.decision order by c.decided_at))[1] as first_decision
from public.records r
join combined c on c.record_id = r.id
group by r.id, r.project_id, c.stage;
