import type { RobAnswer, RobJudgment } from '@/types/domain'

/**
 * PROBAST (Prediction model Risk Of Bias ASsessment Tool) — static
 * definition of its 4 domains and their signalling questions. No
 * auto-computed judgment here: PROBAST has the assessor pick each domain's
 * risk-of-bias (and, where applicable, applicability) judgment themselves,
 * informed by the signalling-question answers — we mirror that rather than
 * guessing at an algorithm and risking getting the methodology wrong.
 *
 * `labelKey`/`questionKey` are plain strings (not typed as TranslationKey)
 * to keep this module framework-free, same as `interpretKappa` in
 * agreement/api.ts — callers cast with `as TranslationKey` when passing to
 * `t()`.
 */
export interface ProbastQuestion {
  id: string
  questionKey: string
}

export interface ProbastDomainConfig {
  id: 'participants' | 'predictors' | 'outcome' | 'analysis'
  labelKey: string
  signallingQuestions: ProbastQuestion[]
  /** PROBAST does not judge applicability for the Analysis domain. */
  hasApplicability: boolean
}

export const PROBAST_DOMAINS: ProbastDomainConfig[] = [
  {
    id: 'participants',
    labelKey: 'riskOfBias.domainParticipants',
    hasApplicability: true,
    signallingQuestions: [
      { id: 'p1', questionKey: 'riskOfBias.q_participants_1' },
      { id: 'p2', questionKey: 'riskOfBias.q_participants_2' },
    ],
  },
  {
    id: 'predictors',
    labelKey: 'riskOfBias.domainPredictors',
    hasApplicability: true,
    signallingQuestions: [
      { id: 'p1', questionKey: 'riskOfBias.q_predictors_1' },
      { id: 'p2', questionKey: 'riskOfBias.q_predictors_2' },
      { id: 'p3', questionKey: 'riskOfBias.q_predictors_3' },
    ],
  },
  {
    id: 'outcome',
    labelKey: 'riskOfBias.domainOutcome',
    hasApplicability: true,
    signallingQuestions: [
      { id: 'o1', questionKey: 'riskOfBias.q_outcome_1' },
      { id: 'o2', questionKey: 'riskOfBias.q_outcome_2' },
      { id: 'o3', questionKey: 'riskOfBias.q_outcome_3' },
      { id: 'o4', questionKey: 'riskOfBias.q_outcome_4' },
      { id: 'o5', questionKey: 'riskOfBias.q_outcome_5' },
      { id: 'o6', questionKey: 'riskOfBias.q_outcome_6' },
    ],
  },
  {
    id: 'analysis',
    labelKey: 'riskOfBias.domainAnalysis',
    hasApplicability: false,
    signallingQuestions: [
      { id: 'a1', questionKey: 'riskOfBias.q_analysis_1' },
      { id: 'a2', questionKey: 'riskOfBias.q_analysis_2' },
      { id: 'a3', questionKey: 'riskOfBias.q_analysis_3' },
      { id: 'a4', questionKey: 'riskOfBias.q_analysis_4' },
      { id: 'a5', questionKey: 'riskOfBias.q_analysis_5' },
      { id: 'a6', questionKey: 'riskOfBias.q_analysis_6' },
      { id: 'a7', questionKey: 'riskOfBias.q_analysis_7' },
      { id: 'a8', questionKey: 'riskOfBias.q_analysis_8' },
      { id: 'a9', questionKey: 'riskOfBias.q_analysis_9' },
    ],
  },
]

export const ROB_ANSWER_OPTIONS: RobAnswer[] = ['yes', 'probably_yes', 'probably_no', 'no', 'no_information']

export const ROB_JUDGMENT_OPTIONS: RobJudgment[] = ['low', 'unclear', 'high']
