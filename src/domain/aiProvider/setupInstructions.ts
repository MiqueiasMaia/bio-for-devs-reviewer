import type { AIProvider } from '@/types/domain'

export interface ProviderSetupInstructions {
  keyUrl: string
  keyUrlLabel: string
  freeTierNote: string
  steps: string[]
}

/**
 * Per-provider step-by-step setup guide shown inline in the settings tab
 * (AiProviderTab) — updates live as the reviewer picks a provider, so they
 * never have to leave the app or read a generic doc to figure out where
 * to get a key.
 */
export const PROVIDER_SETUP_INSTRUCTIONS: Record<AIProvider, ProviderSetupInstructions> = {
  google: {
    keyUrl: 'https://aistudio.google.com/apikey',
    keyUrlLabel: 'aistudio.google.com/apikey',
    freeTierNote: 'Free tier bem generoso, sem cartão de crédito necessário.',
    steps: [
      'Acesse aistudio.google.com/apikey e faça login com uma conta Google.',
      'Clique em "Create API key" (crie um projeto novo do Google Cloud se for solicitado).',
      'Copie a chave gerada e cole no campo "Chave de API" abaixo.',
    ],
  },
  groq: {
    keyUrl: 'https://console.groq.com/keys',
    keyUrlLabel: 'console.groq.com/keys',
    freeTierNote: 'Gratuito, com limites de requisições por minuto/dia.',
    steps: [
      'Crie uma conta gratuita em console.groq.com.',
      'No menu, acesse "API Keys" e clique em "Create API Key".',
      'Copie a chave gerada agora (ela só é exibida uma vez) e cole no campo abaixo.',
    ],
  },
  openrouter: {
    keyUrl: 'https://openrouter.ai/keys',
    keyUrlLabel: 'openrouter.ai/keys',
    freeTierNote: 'Prefira modelos com sufixo ":free" na lista para não gerar custo.',
    steps: [
      'Crie uma conta em openrouter.ai.',
      'Acesse "Keys" no menu e clique em "Create Key".',
      'Copie a chave gerada, escolha um modelo com ":free" no nome abaixo e cole a chave no campo "Chave de API".',
    ],
  },
  anthropic: {
    keyUrl: 'https://console.anthropic.com/settings/keys',
    keyUrlLabel: 'console.anthropic.com/settings/keys',
    freeTierNote: 'Sem free tier — a conta precisa ter um método de pagamento configurado.',
    steps: [
      'Acesse console.anthropic.com e configure um método de pagamento (Settings → Billing).',
      'Acesse "API Keys" e clique em "Create Key".',
      'Copie a chave gerada e cole no campo "Chave de API" abaixo.',
    ],
  },
}
