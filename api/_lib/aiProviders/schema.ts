import { z } from 'zod'

/** Shared across every provider adapter — the same structured result shape
 * regardless of which model produced it. */
export const ScreeningResultSchema = z.object({
  decision: z.enum(['INCLUDE', 'UNCERTAIN', 'EXCLUDE']),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  criteria: z.array(
    z.object({
      criterion: z.string(),
      kind: z.enum(['inclusion', 'exclusion']),
      met: z.boolean(),
      note: z.string(),
    }),
  ),
})

export type ScreeningResult = z.infer<typeof ScreeningResultSchema>
