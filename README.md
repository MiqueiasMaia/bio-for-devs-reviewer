# Biofor Reviewers

Ferramenta web para condução de revisões sistemáticas de literatura seguindo o
fluxo PRISMA 2020, com triagem cega, múltiplos revisores e pré-triagem
assistida por IA. Interface em português (pt-BR).

## Funcionalidades

- Múltiplos projetos, papéis (proprietário/revisor/visualizador) e convite de
  membros por e-mail.
- Critérios de elegibilidade, PICOTS (destaques configuráveis) e taxonomia de
  motivos de exclusão — tudo editável por projeto, nada fixo no código.
- Importação de RIS, NBIB (PubMed) e CSV (com mapeamento de colunas e
  compatibilidade com o triador legado), deduplicação por DOI e similaridade
  de título com tela de revisão.
- Triagem cega com atalhos de teclado (I/U/E, ←/→), destaques PICOTS,
  motivos de exclusão, notas com autosave e fallback offline em
  localStorage, fila por revisor, e triagem de texto completo com upload de
  PDF.
- Resolução de conflitos, concordância entre revisores (kappa de Cohen/
  Fleiss), diagrama PRISMA 2020 (SVG/PNG) com contagens ao vivo, e painel do
  projeto.
- Triagem assistida por IA (opcional, por projeto) via função serverless.
- Exportação de decisões (CSV), backup completo do projeto (JSON) e
  referências dos estudos incluídos (RIS/BibTeX).

## Stack

- **Frontend**: React 18 + Vite + TypeScript, React Router v6, TanStack Query,
  Zustand, Tailwind CSS v4.
- **Backend**: Supabase (Postgres + Auth + Row Level Security + Storage).
- **Funções serverless**: Vercel Functions em `/api` (Node) — usadas apenas
  para operações que exigem a service-role key ou a chave da Anthropic.
- **Deploy**: Vercel (SPA estática + `/api`).

## Pré-requisitos

- Node.js 20+
- Uma conta gratuita no [Supabase](https://supabase.com)
- Uma conta na [Vercel](https://vercel.com) (para deploy)

## 1. Criar o projeto Supabase

1. Acesse [supabase.com/dashboard](https://supabase.com/dashboard) → **New
   project**.
2. Escolha organização, nome (ex: `revisao-sistematica`), senha do banco e
   região. Aguarde a criação (~2 min).
3. Em **Project Settings → API Keys**, copie:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **Publishable key** (`sb_publishable_...`) → `VITE_SUPABASE_ANON_KEY`
   - **Secret key** (`sb_secret_...`) → `SUPABASE_SERVICE_ROLE_KEY` (nunca
     exponha esta chave no cliente)

   > Projetos mais antigos podem mostrar as chaves legadas **anon** e
   > **service_role** (JWTs) em vez de publishable/secret — ambos os pares
   > funcionam da mesma forma nas variáveis acima.

## 2. Configurar variáveis de ambiente localmente

```bash
cp .env.example .env.local
# edite .env.local com os valores copiados acima
```

## 3. Instalar dependências e rodar localmente

```bash
npm install
npm run dev
```

Abra http://localhost:5173.

## 4. Aplicar o schema do banco (migrations)

Nada de copiar e colar SQL manualmente no painel — as migrations são
aplicadas por um script (`scripts/db-migrate.mjs`), que conecta direto no
Postgres do projeto e registra o que já rodou em `public._app_migrations`
(rodar de novo é sempre seguro; migrations e o seed já aplicados são
pulados).

1. Em **Project Settings → Database → Connect → URI**, copie a connection
   string (já vem com a senha do banco) e defina `SUPABASE_DB_URL` no seu
   `.env.local` (ver `.env.example`).
2. Aplique as migrations:

   ```bash
   npm run db:migrate
   ```

3. Crie sua conta na aplicação (passo 3 acima) — isso cria seu `profile`
   automaticamente.
4. Rode o seed (cria o projeto de demonstração "Ensemble ML no prognóstico
   pós-AVC" com você como proprietário — só funciona depois que existe pelo
   menos um usuário, criado no passo anterior):

   ```bash
   npm run db:seed
   ```

`SUPABASE_DB_URL` é usada **só** por esses dois scripts, localmente — nunca
pelo app em si (que continua falando com o Supabase via
`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` e, no servidor, via
`SUPABASE_SERVICE_ROLE_KEY`).

## 5. Deploy na Vercel

1. Suba o repositório para o GitHub/GitLab/Bitbucket.
2. Em [vercel.com/new](https://vercel.com/new), importe o repositório.
   O framework preset **Vite** é detectado automaticamente.
3. Em **Environment Variables**, adicione:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only)
   - `AI_KEY_ENCRYPTION_SECRET` (server-only, necessária apenas se algum
     projeto for habilitar triagem por IA — ver seção abaixo)
4. Clique **Deploy**. Nenhuma alteração de código é necessária após as
   variáveis de ambiente estarem configuradas.

### Triagem assistida por IA (`/api/ai-screen`)

Desabilitada por padrão (`settings.ai_screening_enabled = false`). Diferente
de uma chave global do servidor, **cada projeto configura seu próprio
provedor, modelo e chave de API** na aba **Configurações → IA / Provedor**
(só o(a) proprietário(a) do projeto vê essa aba) — a chave fica criptografada
no banco (`pgp_sym_encrypt`) e só é decriptada dentro de uma function
server-side no momento da chamada. Provedores suportados: Google Gemini,
Groq, OpenRouter e Anthropic Claude — ver
[`docs/ai-providers.md`](docs/ai-providers.md) para onde obter cada chave e
recomendações de modelo (vários têm free tier). A única variável de ambiente
do servidor necessária pra isso é `AI_KEY_ENCRYPTION_SECRET` (uma string
aleatória qualquer, só usada como segredo simétrico — nunca fica no banco).
Depois de configurar um provedor, ative o toggle em **Configurações →
Geral** do projeto (fica desabilitado até haver um provedor configurado). A
função lê os critérios/PICOTS armazenados no banco (via
`SUPABASE_SERVICE_ROLE_KEY`) e monta o prompt inteiramente a partir deles —
nada específico do tema da revisão fica no código. Cada chamada registra
tokens consumidos e custo estimado (tabela `ai_pricing`, editável direto no
banco), visíveis na mesma aba, e o painel de auditoria em **Auditoria de
IA** (também owner-only) mostra decisão/critérios/justificativa por artigo,
estatísticas agregadas exportáveis e concordância com os revisores humanos.
Para testar `/api` localmente, use `vercel dev` (o `npm run dev` padrão só
serve o SPA, sem as Vercel Functions).

## Scripts

```bash
npm run dev        # servidor de desenvolvimento
npm run build      # build de produção (type-check + vite build)
npm run preview    # servir o build localmente
npm run test       # rodar testes (Vitest)
npm run test:watch # testes em modo watch
npm run lint        # oxlint
```

## Estrutura do projeto

```
src/
  components/     # componentes de UI compartilhados
  domain/         # lógica pura testável (parsers, dedup, kappa, highlight, ...)
  features/       # módulos por domínio (auth, projects, screening, ...)
  i18n/           # camada de internacionalização (pt-BR)
  lib/            # clientes (Supabase, React Query) e utilitários
supabase/
  migrations/     # schema SQL versionado (tabelas, RLS, views, RPCs)
  seed.sql        # dados de demonstração (projeto exemplo com PICOTS/critérios)
api/              # Vercel Functions (server-only) — /api/ai-screen (triagem por IA)
scripts/          # tooling local — db-migrate.mjs (aplica migrations/seed via SUPABASE_DB_URL)
legacy/           # app original de referência (não faz parte do build)
```

## Segurança

- A `SUPABASE_SERVICE_ROLE_KEY` e a `AI_KEY_ENCRYPTION_SECRET` **nunca** são
  incluídas no bundle do cliente — são usadas apenas dentro de funções em
  `/api`, executadas no servidor da Vercel. As chaves de API de IA de cada
  projeto ficam criptografadas no banco (`pgp_sym_encrypt`) e só são
  decriptadas dentro dessas mesmas funções, nunca em uma query acessível
  pelo client.
- Toda tabela no Postgres tem Row Level Security habilitada; o acesso aos
  dados de um projeto é controlado por associação em `project_members`.
