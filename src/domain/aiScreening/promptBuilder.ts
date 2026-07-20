export interface CriterionInput {
  kind: 'inclusion' | 'exclusion'
  text: string
  picotsDimension: string | null
}

export interface ExclusionReasonInput {
  code: string
  label: string
}

export interface RecordInput {
  title: string
  authors: string
  abstract: string | null
  year: number | null
}

/**
 * Builds the AI-screening system prompt entirely from a project's own
 * stored criteria/exclusion-reason configuration — nothing about any
 * specific review topic is hardcoded here. The model is asked to evaluate
 * each criterion individually (a checklist) rather than jump straight to a
 * decision, which is both more auditable and more accurate.
 */
export function buildSystemPrompt(
  criteria: CriterionInput[],
  exclusionReasons: ExclusionReasonInput[],
): string {
  const inclusion = criteria.filter((c) => c.kind === 'inclusion')
  const exclusion = criteria.filter((c) => c.kind === 'exclusion')

  const formatCriterion = (c: CriterionInput) =>
    `- ${c.text}${c.picotsDimension ? ` [PICOTS: ${c.picotsDimension}]` : ''}`

  const reasonsList = exclusionReasons.map((r) => `- ${r.code}: ${r.label}`).join('\n')

  return [
    'You are assisting with title/abstract screening for a systematic literature review.',
    'Evaluate the given study against EVERY criterion below individually before deciding.',
    '',
    'INCLUSION CRITERIA (the study should satisfy all of these):',
    inclusion.map(formatCriterion).join('\n') || '(none defined)',
    '',
    'EXCLUSION CRITERIA (the study should be excluded if any of these apply):',
    exclusion.map(formatCriterion).join('\n') || '(none defined)',
    '',
    'EXCLUSION REASON TAXONOMY (use these exact codes when decision is EXCLUDE):',
    reasonsList || '(none defined)',
    '',
    'Instructions:',
    '- For each criterion, decide whether it is met, not met, or unclear from the title/abstract alone.',
    '- Favor recall: when genuinely unclear, prefer UNCERTAIN over a confident guess.',
    '- decision must be one of INCLUDE, UNCERTAIN, or EXCLUDE.',
    '- If decision is EXCLUDE, rationale must reference at least one exclusion reason code from the taxonomy above.',
    '- confidence is a number between 0 and 1.',
  ].join('\n')
}

export function buildUserMessage(record: RecordInput): string {
  return [
    `Título: ${record.title || '(sem título)'}`,
    `Autores: ${record.authors || '(não informado)'}`,
    `Ano: ${record.year ?? '(não informado)'}`,
    `Resumo: ${record.abstract || '(resumo não disponível — avalie apenas pelo título)'}`,
  ].join('\n')
}
