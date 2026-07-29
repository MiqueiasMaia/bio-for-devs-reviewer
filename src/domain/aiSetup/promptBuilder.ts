export interface AiSetupPromptInput {
  projectName: string
  prosperoId: string | null
  protocolText: string
}

const JSON_SHAPE_EXAMPLE = `{
  "criteria": [
    { "kind": "inclusion", "text": "Estudos com pacientes adultos (>=18 anos)", "picotsDimension": "P" },
    { "kind": "exclusion", "text": "Estudos apenas com resumo, sem texto completo disponível", "picotsDimension": null }
  ],
  "highlightTerms": [
    { "category": "population", "terms": ["adulto", "idoso", "paciente"], "color": "#94a3b8" }
  ],
  "exclusionReasons": [
    { "code": "no_full_text", "label": "Texto completo não disponível" }
  ]
}`

/**
 * Builds a self-contained prompt the reviewer runs in any external AI tool
 * of their choice (this app never calls an AI provider for this feature —
 * per the user's explicit choice of "app generates the prompt, reviewer
 * runs it externally"). The AI's JSON reply is pasted back in and parsed
 * against aiSetupResultSchema.
 */
export function buildAiSetupPrompt(input: AiSetupPromptInput): string {
  return [
    'Você está ajudando a configurar os critérios de elegibilidade de uma revisão sistemática de literatura.',
    '',
    `Projeto: ${input.projectName}`,
    ...(input.prosperoId ? [`Registro PROSPERO: ${input.prosperoId}`] : []),
    '',
    'PROTOCOLO / OBJETIVO DA REVISÃO (fornecido pelo revisor):',
    input.protocolText.trim() || '(nenhum texto fornecido — peça ao revisor para colar o protocolo, objetivo ou pergunta de pesquisa antes de continuar)',
    '',
    'A partir do protocolo acima, gere um JSON com EXATAMENTE este formato (mesmas chaves, mesmos tipos):',
    JSON_SHAPE_EXAMPLE,
    '',
    'Instruções:',
    '- "criteria": liste critérios de inclusão E de exclusão, um por item. "picotsDimension" é uma das letras P (população), I (intervenção), C (comparação), O (desfecho/outcome), T (tempo), S (desenho do estudo/setting), ou null se não se aplicar.',
    '- "highlightTerms": agrupe termos-chave por categoria (ex.: population, intervention, outcome) para destacar em título/resumo durante a triagem. "color" é um código hex; pode omitir.',
    '- "exclusionReasons": a taxonomia de motivos de exclusão que os revisores usarão ao excluir um registro. "code" deve ser curto e sem espaços (ex.: "wrong_population").',
    '- Responda APENAS com o JSON, sem texto adicional, sem markdown, sem blocos de código.',
  ].join('\n')
}
