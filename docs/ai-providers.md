# Configurando um provedor de IA para triagem assistida

Cada projeto configura seu próprio provedor, modelo e chave de API em
**Configurações → IA / Provedor** (visível só para o(a) proprietário(a) do
projeto). A chave é criptografada antes de ser salva e nunca é reexibida —
só um indicador de "chave configurada" aparece depois.

Depois de configurar, habilite o toggle "Habilitar triagem assistida por
IA" em **Configurações → Geral** (fica desabilitado até haver um provedor
configurado).

## Provedores suportados

| Provedor | Free tier | Modelos recomendados | Observações |
|---|---|---|---|
| **Google Gemini** (AI Studio) | Bem generoso | `gemini-2.5-flash`, `gemini-2.0-flash` | Melhor custo-benefício para triagem de texto; suporta JSON Schema nativo |
| **Groq** | Gratuito, com rate limits | Llama 3.x, Mixtral, Gemma | Extremamente rápido; confiabilidade do JSON mode varia por modelo |
| **OpenRouter** | Vários modelos com tag `:free` | Llama, Mistral, Gemini, etc. | Agrega vários provedores atrás de uma API OpenAI-compatible; confiabilidade de structured output varia conforme o modelo por trás |
| **Anthropic Claude** | Sem free tier (pago) | O modelo já usado no projeto | Melhor qualidade/confiabilidade de structured output; usa recursos específicos (thinking adaptativo, prompt caching) |

Nomes de modelo e condições de free tier mudam com frequência — confira a
disponibilidade atual no site de cada provedor antes de configurar.

## Onde obter cada chave

- **Google Gemini**: [aistudio.google.com/apikey](https://aistudio.google.com/apikey) — faça login com uma conta Google, clique em "Create API key".
- **Groq**: [console.groq.com/keys](https://console.groq.com/keys) — crie uma conta gratuita, gere uma chave em "API Keys".
- **OpenRouter**: [openrouter.ai/keys](https://openrouter.ai/keys) — crie uma conta, gere uma chave; ao escolher o modelo, prefira variantes com sufixo `:free` para não gerar custo.
- **Anthropic Claude**: [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) — requer conta com faturamento configurado (sem free tier).

## Onde colar

Configurações do projeto → aba **IA / Provedor** → selecione o provedor,
selecione o modelo na lista, cole a chave no campo "Chave de API" e salve.

## Consumo e custo

A mesma aba mostra tokens consumidos e custo estimado (em USD), com um
detalhamento por provedor/modelo caso o projeto tenha trocado de provedor
ao longo do tempo. O custo é calculado a partir da tabela `ai_pricing` no
banco (preços aproximados, atualizáveis diretamente no banco conforme os
provedores mudam suas tarifas) — chamadas de modelos sem preço cadastrado
aparecem sem custo estimado, mas continuam sendo contabilizadas em tokens.

## Auditoria e transparência

A aba **Auditoria de IA** (também só para o(a) proprietário(a)) mostra, por
artigo, a decisão da IA, o nível de confiança, quais critérios foram
considerados atendidos/não atendidos e a justificativa gerada — sem expor o
prompt bruto enviado ao modelo. Também mostra contadores agregados por
etapa (estilo PRISMA, com exportação em CSV) e a concordância entre a IA e
os revisores humanos.
