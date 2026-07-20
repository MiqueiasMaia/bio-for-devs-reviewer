# Revisão Sistemática

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

**Opção A — SQL editor (mais simples, sem instalar CLI):**

1. No painel do Supabase, abra **SQL Editor**.
2. Cole o conteúdo de cada arquivo em `supabase/migrations/`, em ordem
   (por nome de arquivo, de `0001_...` a `0010_...`), e execute (**Run**)
   um de cada vez.
3. Crie sua conta na aplicação (passo 3 acima) — isso cria seu `profile`
   automaticamente.
4. Volte ao SQL Editor, cole o conteúdo de `supabase/seed.sql` e execute.
   Isso cria o projeto de demonstração ("Ensemble ML no prognóstico
   pós-AVC") com você como proprietário.

**Opção B — Supabase CLI:**

```bash
npm install -g supabase
supabase login
supabase link --project-ref <seu-project-ref>
supabase db push
# depois de criar sua conta na aplicação:
# cole supabase/seed.sql no SQL Editor do painel (o CLI não roda seeds
# automaticamente contra um projeto remoto com `db push`)
```

## 5. Deploy na Vercel

1. Suba o repositório para o GitHub/GitLab/Bitbucket.
2. Em [vercel.com/new](https://vercel.com/new), importe o repositório.
   O framework preset **Vite** é detectado automaticamente.
3. Em **Environment Variables**, adicione:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only)
   - `ANTHROPIC_API_KEY` (server-only, necessária apenas se a triagem por IA
     estiver habilitada)
   - `ANTHROPIC_MODEL` (server-only, ex: `claude-opus-4-8`)
4. Clique **Deploy**. Nenhuma alteração de código é necessária após as
   variáveis de ambiente estarem configuradas.

### Triagem assistida por IA (`/api/ai-screen`)

Desabilitada por padrão (`settings.ai_screening_enabled = false`). Para
habilitar em um projeto: defina `ANTHROPIC_API_KEY` e `ANTHROPIC_MODEL` nas
variáveis de ambiente da Vercel, depois ative o toggle em **Configurações →
Geral** do projeto. A função lê os critérios/PICOTS armazenados no banco (via
`SUPABASE_SERVICE_ROLE_KEY`) e monta o prompt inteiramente a partir deles —
nada específico do tema da revisão fica no código. Para testar `/api`
localmente, use `vercel dev` (o `npm run dev` padrão só serve o SPA, sem as
Vercel Functions).

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
legacy/           # app original de referência (não faz parte do build)
```

## Segurança

- A `SUPABASE_SERVICE_ROLE_KEY` e a `ANTHROPIC_API_KEY` **nunca** são
  incluídas no bundle do cliente — são usadas apenas dentro de funções em
  `/api`, executadas no servidor da Vercel.
- Toda tabela no Postgres tem Row Level Security habilitada; o acesso aos
  dados de um projeto é controlado por associação em `project_members`.
