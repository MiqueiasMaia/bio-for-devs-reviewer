import { z } from 'zod'

/**
 * Shape of the JSON a reviewer pastes back after running the AI-setup
 * prompt (buildAiSetupPrompt) in an external AI tool. This is the one
 * untrusted-input boundary in the app that benefits from a real schema
 * (zod, already a project dependency) rather than the manual
 * field-by-field checks used elsewhere — the payload comes from a free-text
 * paste of whatever the reviewer's chosen AI tool produced, which is far
 * less predictable in shape than a same-origin Supabase response.
 */
export const aiSetupCriterionSchema = z.object({
  kind: z.enum(['inclusion', 'exclusion']),
  text: z.string().min(1),
  picotsDimension: z.enum(['P', 'I', 'C', 'O', 'T', 'S']).nullable().optional().default(null),
})

export const aiSetupHighlightTermSchema = z.object({
  category: z.string().min(1),
  terms: z.array(z.string().min(1)).min(1),
  color: z.string().min(1).optional().default('#94a3b8'),
})

export const aiSetupExclusionReasonSchema = z.object({
  code: z.string().min(1),
  label: z.string().min(1),
})

export const aiSetupResultSchema = z.object({
  criteria: z.array(aiSetupCriterionSchema).optional().default([]),
  highlightTerms: z.array(aiSetupHighlightTermSchema).optional().default([]),
  exclusionReasons: z.array(aiSetupExclusionReasonSchema).optional().default([]),
})

export type AiSetupCriterion = z.infer<typeof aiSetupCriterionSchema>
export type AiSetupHighlightTerm = z.infer<typeof aiSetupHighlightTermSchema>
export type AiSetupExclusionReason = z.infer<typeof aiSetupExclusionReasonSchema>
export type AiSetupResult = z.infer<typeof aiSetupResultSchema>
