-- Demo project seed --------------------------------------------------------
-- Run this AFTER you have signed up at least once in the app (so a real
-- auth.users / profiles row exists to own the demo project). This avoids
-- hand-crafting auth.users/auth.identities rows, whose exact columns differ
-- across Supabase/GoTrue versions.
--
--   1. Deploy the app, sign up with your own email.
--   2. Paste this file into the Supabase SQL editor and run it.
--
-- It creates one project — "Ensemble ML no prognóstico pós-AVC" — with the
-- PICOTS criteria, highlight-term lists and exclusion-reason taxonomy from
-- the owner's original single-file screener. Nothing stroke/ML-specific
-- exists anywhere else in the schema or app code; it is purely seed data for
-- this one demo project.

do $$
declare
  v_owner_id uuid;
  v_project_id uuid;
begin
  select id into v_owner_id from auth.users order by created_at asc limit 1;

  if v_owner_id is null then
    raise exception 'No users found. Sign up in the app first, then re-run seed.sql.';
  end if;

  insert into public.projects (name, description, owner_id, prospero_id, created_by, settings)
  values (
    'Ensemble ML no prognóstico pós-AVC',
    'Revisão sistemática sobre modelos de machine learning (incluindo, mas não restrito a, ensembles) para prognóstico de recuperação motora e funcional após AVC.',
    v_owner_id,
    'CRD420261326872',
    v_owner_id,
    '{
      "reviewers_required_per_record": 2,
      "blind_screening": true,
      "auto_advance_on_decision": true,
      "stages_enabled": ["title_abstract", "full_text"],
      "dedup": { "on_doi": true, "on_normalized_title": true, "title_similarity_threshold": 0.92 },
      "ui_locale": "pt-BR",
      "ai_screening_enabled": false
    }'::jsonb
  )
  returning id into v_project_id;

  insert into public.project_members (project_id, user_id, role)
  values (v_project_id, v_owner_id, 'owner');

  -- Criteria (PICOTS) --------------------------------------------------
  insert into public.criteria (project_id, kind, text, order_index, picots_dimension) values
    (v_project_id, 'inclusion', 'População: adultos com AVC (isquêmico/hemorrágico), qualquer fase.', 1, 'P'),
    (v_project_id, 'inclusion', 'Abordagem de ML: qualquer método de aprendizado de máquina — modelos de regressão, métodos baseados em árvores, redes neurais e arquiteturas ensemble (o protocolo PROSPERO CRD420261326872 não restringe a ensemble).', 2, 'I'),
    (v_project_id, 'inclusion', 'Desfecho: recuperação motora (Fugl-Meyer, ARAT) OU funcional/AVD (mRS, Barthel, FIM).', 3, 'O'),
    (v_project_id, 'inclusion', 'Métrica: reporta ao menos uma (AUC, C-index, acurácia, RMSE, R², calibração).', 4, null),
    (v_project_id, 'inclusion', 'Tipo de estudo: estudo primário (desenvolvimento e/ou validação).', 5, 'S'),
    (v_project_id, 'exclusion', 'Não é AVC / não humano / não adulto.', 1, null),
    (v_project_id, 'exclusion', 'Revisão, editorial, carta, protocolo ou resumo de congresso sem dados.', 2, null),
    (v_project_id, 'exclusion', 'Sem qualquer modelo de ML preditivo (apenas estatística descritiva ou avaliação clínica, sem modelo).', 3, null),
    (v_project_id, 'exclusion', 'Diagnóstico, segmentação ou detecção — não prognóstico de desfecho.', 4, null),
    (v_project_id, 'exclusion', 'Prevê apenas mortalidade ou apenas destino de alta (fora do escopo).', 5, null),
    (v_project_id, 'exclusion', 'Publicado antes de 2015.', 6, null),
    (v_project_id, 'exclusion', 'Idioma diferente de inglês, português ou espanhol.', 7, null);

  -- Highlight terms -----------------------------------------------------
  insert into public.highlight_terms (project_id, category, terms, color, order_index) values
    (v_project_id, 'population', array[
      'stroke','strokes','ischemic','ischaemic','haemorrhagic','hemorrhagic','cerebrovascular',
      'poststroke','post-stroke','post stroke','survivors','hemiparesis','hemiparetic','hemiplegia','paretic'
    ], '#e6d9f2', 1),
    (v_project_id, 'intervention', array[
      'machine learning','deep learning','neural network','artificial neural','convolutional','cnn','lstm',
      'recurrent neural','transformer','support vector','svm','logistic regression','linear regression',
      'regression model','decision tree','k-nearest','k nearest','knn','naive bayes','gaussian process',
      'random forest','random-forest','xgboost','extreme gradient','gradient boosting','gradient-boosted',
      'gradient boosted','lightgbm','light gbm','catboost','adaboost','ada-boost','bagging','boosting',
      'stacking','stacked','ensemble','super learner','super-learner','superlearner','voting classifier',
      'majority voting','extra trees','extra-trees','extremely randomized','bootstrap aggregat'
    ], '#c9ead4', 2),
    (v_project_id, 'outcome', array[
      'fugl-meyer','fugl meyer','fma','arat','action research arm','barthel','modified rankin','rankin scale',
      'mrs','fim','functional independence measure','motor recovery','motor impairment','motor function',
      'upper limb','upper extremity','upper-limb','activities of daily living','adl','functional outcome',
      'functional recovery'
    ], '#cfe6f0', 3),
    (v_project_id, 'timing', array[
      'acute','subacute','sub-acute','chronic','hyperacute','onset','admission','baseline','follow-up',
      'follow up','months post','weeks post','days post','longitudinal','discharge'
    ], '#fbe8c4', 4),
    (v_project_id, 'exclusion', array[
      'segmentation','diagnosis','diagnostic','detection','lesion','image classification',
      'in-hospital mortality','mortality','death','systematic review','meta-analysis','meta analysis',
      'scoping review','narrative review'
    ], '#f6d5cd', 5);

  -- Exclusion reasons (Rayyan-style default taxonomy) ------------------
  insert into public.exclusion_reasons (project_id, code, label, order_index) values
    (v_project_id, 'wrong_outcome', 'Desfecho errado', 1),
    (v_project_id, 'wrong_population', 'População errada', 2),
    (v_project_id, 'wrong_study_design', 'Desenho de estudo errado', 3),
    (v_project_id, 'wrong_intervention', 'Intervenção errada', 4),
    (v_project_id, 'fulltext_unavailable', 'Texto completo indisponível', 5),
    (v_project_id, 'retracted_article', 'Artigo retratado', 6);

  raise notice 'Demo project created: % (owner %)', v_project_id, v_owner_id;
end $$;
