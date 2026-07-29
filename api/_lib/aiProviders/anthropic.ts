import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { ScreeningResultSchema } from './schema.js'
import type { AIProviderCallArgs, AIProviderResult } from './types.js'

const outputFormat = zodOutputFormat(ScreeningResultSchema)

/** Unchanged from the single-provider version: messages.parse + structured
 * output + adaptive thinking + ephemeral system-prompt caching are all
 * Anthropic-specific features, kept only here. */
export async function callAnthropic(args: AIProviderCallArgs): Promise<AIProviderResult> {
  const anthropic = new Anthropic({ apiKey: args.apiKey })

  const response = await anthropic.messages.parse({
    model: args.model,
    max_tokens: 1500,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'medium', format: outputFormat },
    system: [{ type: 'text', text: args.systemPrompt, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: args.userMessage }],
  })

  if (!response.parsed_output) {
    throw new Error('Model did not return a valid structured result')
  }

  const parsed = response.parsed_output
  return {
    decision: parsed.decision,
    confidence: parsed.confidence,
    rationale: parsed.rationale,
    criteria: parsed.criteria,
    modelUsed: response.model,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  }
}
