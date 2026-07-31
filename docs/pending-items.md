# Itens pendentes

Levantamento feito em 2026-07-30. Lista o que está identificado como
incompleto ou em aberto no código, para acompanhamento futuro.

## 1. Login social (Google/GitHub/ORCID)

Os botões existem na tela de login, mas são propositalmente desabilitados —
`src/features/auth/ProviderButtons.tsx` tem `disabled` fixo em cada botão e
o comentário no arquivo confirma: "Third-party sign-in isn't implemented
yet". É só o layout final já desenhado, sem OAuth por trás.

**Para implementar**: configurar os provedores (Google, GitHub, ORCID) no
Supabase Auth e trocar os botões desabilitados por chamadas reais a
`supabase.auth.signInWithOAuth({ provider })`.

## 2. Convite de membro não envia e-mail

Em `src/features/projects/settings/api.ts` (`inviteMember`), convidar
alguém por e-mail só grava uma linha em `project_invites` — ou adiciona a
pessoa direto a `project_members` se ela já tiver conta com aquele e-mail.
Em nenhum dos dois casos um e-mail é disparado avisando o convidado; ele só
descobre o convite se souber entrar no app e checar, ou se for avisado por
fora (WhatsApp, e-mail manual etc.).

**Para implementar**: enviar um e-mail transacional no momento do convite
(ex.: via Supabase Edge Function + provedor de e-mail, ou
`supabase.auth.admin.inviteUserByEmail` quando a pessoa ainda não tem
conta), com link direto para o projeto.

## 3. Clareza sobre o checkbox "Incluir IA como avaliador" — ✅ implementado (2026-07-30)

No `AgreementCard`, o checkbox "Incluir IA como avaliador" controla se a
decisão da IA entra no cálculo de concordância/kappa — não inicia nem
indica que a triagem por IA está rodando. Um usuário relatou confusão:
marcou o checkbox, viu que ele "desmarcava sozinho" ao voltar à tela, e
não tinha como saber se o processo de triagem por IA de fato havia
iniciado.

Rótulo trocado para "Incluir decisão da IA no cálculo de concordância" e
adicionado um texto de apoio (visível abaixo do checkbox e como `title` no
hover) deixando explícito que ele não dispara a triagem e apontando para o
cartão "Triagem assistida por IA" na Visão Geral do projeto como o lugar
certo para isso. Só texto/rótulo — nenhuma lógica do `AgreementCard` foi
alterada.

## 4. Indicador de "última execução da IA" — ✅ implementado (2026-07-30)

Hoje não há, na interface, como saber se/quando a triagem por IA rodou
pela última vez para um projeto, sem ir conferir em `ai_usage_log` ou na
Auditoria de IA registro a registro.

Adicionado `fetchLastAiRunAt` (`features/aiScreening/api.ts`), que deriva o
timestamp de `MAX(ai_screenings.updated_at)` por projeto/etapa (a coluna
`stage` só existe em `ai_screenings`, não em `ai_usage_log`, daí a escolha
entre as duas fontes citadas acima). Exibido tanto no `AiScreeningCard`
(Visão Geral) quanto no cartão de estatísticas da Auditoria de IA, com
mensagem própria para "ainda não executada".

## 5. Recursos que o Rayyan tem e o Biofor Reviewers ainda não

Levantamento comparativo feito em 2026-07-30 (ver conversa que originou este
item). Rayyan (rayyan.ai) é a referência mais usada de mercado para triagem
de revisão sistemática; os pontos abaixo são lacunas reais, não
funcionalidades equivalentes com nome diferente.

### 5.1 App móvel (iOS/Android)

Rayyan permite triagem pelo celular via apps nativos. Biofor Reviewers é uma
SPA web (React + Vite) sem equivalente mobile.

**Decisão**: não vai ser nativo — app híbrido com React Native, reaproveitando
a lógica de domínio (`src/domain`) e as chamadas ao Supabase já existentes.
É a última etapa do roadmap (ver item 6.10): só faz sentido depois que o
pipeline de IA (triagem, extração, risco de viés) já tiver reduzido o
trabalho manual o suficiente para a missão das 2 semanas — um app mobile sem
isso só move onde o trabalho manual acontece, não reduz o trabalho em si.

### 5.2 Extensão de navegador para recuperação de texto completo

Rayyan tem extensão de navegador que ajuda a localizar/baixar o PDF de um
artigo direto da tela de triagem. Biofor depende de upload manual de PDF em
`fulltext`.

**Para implementar**: fora do escopo de uma extensão própria no curto prazo;
ver item 6.6 (Unpaywall) como alternativa mais barata que cobre boa parte do
mesmo ganho.

### 5.3 Integração com gerenciadores de referência (Zotero, Mendeley, EndNote)

Biofor importa RIS/NBIB/CSV (`src/features/imports`) mas não sincroniza com
bibliotecas externas — a importação é sempre um arquivo estático.

**Para implementar**: avaliar Zotero Web API (a mais aberta das três) para
importar/atualizar uma coleção por referência, antes de RIS/CSV manual.

### 5.4 Interface multi-idioma

Biofor é pt-BR fixo (`src/i18n/locales/pt-BR.ts`); Rayyan atende dezenas de
idiomas. Já existe uma camada de i18n no projeto, então o custo é
principalmente tradução de conteúdo, não arquitetura.

**Para implementar**: extrair chaves para `en.ts` (e outros conforme
demanda) usando a mesma estrutura de `pt-BR.ts`; adicionar seletor de idioma
no perfil/projeto.

### 5.5 Gestão de buscas/queries com relatório de deduplicação por fonte

Rayyan permite registrar cada busca (base + string + data) e mostra quantos
duplicados vieram de cada fonte na importação combinada. Biofor deduplica
por DOI/similaridade de título (`src/domain`) mas não guarda a proveniência
da busca nem reporta duplicados por fonte.

**Para implementar**: tabela `project_searches` (base, string de busca, data,
nº de resultados) associada a cada importação; relatório de deduplicação
cruzando `source_search_id` no PRISMA/painel do projeto.

### 5.6 Ranking/priorização de artigos por relevância (não coberto pela IA atual)

A triagem por IA do Biofor (`aiScreening`) classifica cada artigo
individualmente (include/exclude/uncertain) mas não reordena a fila para
mostrar primeiro os mais prováveis de inclusão — algo que Rayyan oferece via
seu modelo próprio treinado em milhões de triagens agregadas de todos os
usuários. Ver item 6.1 do benchmark de tendências (aprendizado ativo) para a
direção recomendada aqui — provavelmente substitui esta lacuna específica em
vez de replicar o modelo proprietário do Rayyan.

## 6. Benchmark de tendências de mercado para acelerar a revisão sistemática

Levantamento feito em 2026-07-30, motivado pela missão do produto: uma
equipe de pesquisa conseguir concluir uma revisão sistemática em 2 semanas.
Ordenado por impacto esperado nessa meta (maior alavanca primeiro), não por
ordem de implementação — decisão de sequenciamento fica para o planejamento.

### 6.1 Priorização por aprendizado ativo na fila de triagem — 🟡 MVP implementado (2026-07-31)

Reordena continuamente os artigos ainda não triados, colocando primeiro os
mais prováveis de inclusão, e permite encerrar a triagem mais cedo com
garantia estatística de recall — abordagem do
[ASReview](https://paperguide.ai/blog/ai-tools-for-systematic-review/),
com benchmark de 87,2% de redução de carga de trabalho mantendo recall
total. Diferente da IA atual do Biofor (`aiScreening`), que classifica cada
artigo isoladamente sem reordenar a fila. Resolve o item 5.6.

**Implementado (escopo reduzido, decisão registrada em conversa)**: só a
reordenação, sem critério de parada com garantia estatística de recall —
essa parte fica para uma iteração futura, dado o custo de validar
corretamente sem dados reais de múltiplas revisões. TF-IDF + regressão
logística leve, 100% cliente (`src/domain/activeLearning/`, com testes) —
sem dependência de ML, sem chamada a API externa, treinado sob demanda
("Retreinar e reordenar" no cartão da Visão Geral) sobre os registros já
decididos em título/resumo (INCLUDE/UNCERTAIN = relevante, EXCLUDE =
irrelevante), com pesos de classe para não colapsar na classe majoritária.
Requer no mínimo 10 decisões (≥3 por classe) antes de treinar. Os escores
(`records.relevance_score`, migração 0032, gravados em lote via
`set_relevance_scores`) reordenam a fila de título/resumo em
`fetchQueue` quando `active_learning_enabled` está ligado nas configurações
do projeto — não altera nem sugere nenhuma decisão, só a ordem.

### 6.2 Pré-preenchimento de extração de dados por IA

LLM lê o texto completo e sugere valores para os campos de extração
configurados no projeto; o extrator humano só valida/corrige em vez de
digitar do zero. Otto-SR reportou 93,1% de acurácia de extração por IA
contra 79,7% humano
([fonte](https://www.medrxiv.org/content/10.1101/2025.06.13.25329541v2)).
Maior alavanca isolada para `dataExtraction`, que hoje é 100% manual.

**Para implementar**: nova função serverless em `/api` (nos moldes de
`/api/ai-screen`) que recebe o texto completo + `extraction_fields` do
projeto e devolve um rascunho de `answers`; UI mostra o rascunho já
preenchido em `DataExtractionPage` com indicação clara de "sugerido pela
IA, revise antes de salvar".

### 6.3 Sugestão automática de julgamento de risco de viés por IA

LLM lê o texto completo e sugere resposta/julgamento por domínio PROBAST,
com justificativa citando o trecho do artigo — RobotReviewer atinge ~72% de
concordância com humanos nessa tarefa
([fonte](https://link.springer.com/article/10.1186/s12874-022-01649-y)).
Reduz o tempo de `riskOfBias`, hoje também 100% manual, sem substituir o
julgamento humano final.

**Para implementar**: mesma abordagem do item 6.2 (função serverless +
rascunho revisável), mas alimentando `RiskOfBiasPage` com uma sugestão por
domínio em vez de campo em branco.

### 6.4 Geração e tradução de string de busca entre bases

LLM gera uma string de busca inicial a partir do PICO/critérios já
cadastrados no projeto; tradução de sintaxe entre bases (PubMed/Ovid →
Cochrane, Embase, Web of Science, Scopus, EBSCO) no estilo do
[Polyglot Search Translator](https://jmla.pitt.edu/ojs/jmla/article/view/834).
Reduz a etapa de busca, hoje totalmente fora do Biofor (o app só recebe o
resultado já exportado de cada base).

**Para implementar**: tela nova em "Busca" que gera a string a partir dos
critérios/PICOTS do projeto e aplica as regras de tradução de sintaxe por
base (sem mapear termos de indexação como MeSH↔Emtree, que o próprio
Polyglot também não resolve).

### 6.5 Expansão por citação (snowballing) semi-automática — ✅ implementado (2026-07-30)

A partir dos artigos já incluídos, sugere artigos citados/citantes como
candidatos extras para triagem — abordagem popularizada por
[ResearchRabbit, Connected Papers e Litmaps](https://effortlessacademic.com/litmaps-vs-researchrabbit-vs-connected-papers-the-best-literature-review-tool-in-2025/).
Hoje o Biofor não tem nenhuma forma de achar estudos fora da importação
inicial.

Implementado em `api/snowball.ts`: para cada registro já INCLUDE (em
título/resumo ou texto completo) com DOI e ainda não expandido
(`records.snowball_expanded_at`, migração 0029), busca na OpenAlex os
trabalhos citados (`referenced_works`) e citantes (`filter=cites:`),
descarta os que já têm DOI no projeto, e insere o restante como novos
`records` com `source_db: 'snowballing'` — entram direto na fila de
título/resumo, igual a qualquer registro importado. Cartão
"Expansão por citação" na Visão Geral do projeto
(`features/snowballing/SnowballingCard.tsx`), com lote configurável (padrão
5, máx. 20 estudos incluídos por execução — cada seed processado só uma vez
por design, então rodar de novo sempre cobre o que faltou, sem repetir
trabalho). Parsing/reconstrução do abstract (a OpenAlex só devolve um índice
invertido, não o texto) em `src/domain/import/openAlex.ts`, com testes.
Requer `OPENALEX_EMAIL` no ambiente do servidor (mesma convenção do
`UNPAYWALL_EMAIL`).

### 6.6 Recuperação automática de PDF via Unpaywall — ✅ implementado (2026-07-30)

Antes de pedir upload manual em `fulltext`, tenta localizar automaticamente
uma versão de acesso aberto do artigo via
[API gratuita da Unpaywall](https://unpaywall.org/). Cobre boa parte do
ganho da extensão de navegador do Rayyan (item 5.2) sem precisar construir
uma extensão própria.

Função serverless (`api/unpaywall-fetch.ts`) já existia (commit `b33022f`,
29/07) mas exigia clique manual no botão "Buscar PDF em acesso aberto" —
não era automática de fato. Agora o `FulltextPanel` dispara a busca sozinho
ao abrir um registro na triagem de texto completo sem PDF anexado, e a
migração `0028_unpaywall_checked_at.sql` marca `records.unpaywall_checked_at`
após a primeira tentativa (sucesso ou falha) para nunca repetir a consulta
automaticamente no mesmo registro. O botão manual continua disponível como
"Buscar novamente" (retry) e o upload manual como fallback final.

### 6.7 Deduplicação semântica por embeddings

Complementa a deduplicação por DOI/similaridade de título já existente em
`src/domain`, pegando duplicatas com títulos bem diferentes (pré-print vs.
versão publicada, traduções, erratas).

**Para implementar**: gerar embedding de título+resumo na importação e
marcar como candidato a duplicado quando a similaridade de cosseno passar
de um limiar, entrando na mesma tela de revisão de duplicados que já existe.

### 6.8 Rascunho automático do relatório final

Gera automaticamente seções do relatório (metodologia, tabela de
características dos estudos incluídos, resumo dos achados) a partir dos
dados já extraídos no projeto — reduz uma etapa de escrita que costuma ser
subestimada no cronograma da revisão.

**Para implementar**: exportação adicional (ao lado do CSV/backup JSON já
existentes) que monta um documento (Markdown ou DOCX) combinando PRISMA,
extração e risco de viés já registrados.

### 6.9 Revisão sistemática "viva" (living systematic review)

Reexecuta triagem/extração automaticamente quando novos artigos aparecem
nas bases depois da revisão concluída, mantendo-a atualizada sem repetir o
processo do zero
([exemplo de engine viva com Claude](https://www.researchsquare.com/article/rs-9308492/v1)).
Relevante para reduzir o *próximo* ciclo de uma revisão já publicada, não o
primeiro — prioridade menor que os itens acima para a meta das 2 semanas.

**Para implementar**: job agendado que reexecuta a busca salva (depende do
item 6.4) periodicamente, roda a triagem por IA nos resultados novos e
notifica o time só dos candidatos a incluir.

### 6.10 App móvel híbrido (React Native)

Ver item 5.1 — decisão já tomada de ser híbrido (React Native) em vez de
nativo por plataforma, reaproveitando `src/domain` e as chamadas ao
Supabase. É a última etapa do roadmap: só compensa depois que os itens 6.1
a 6.3 já tiverem reduzido o trabalho manual, senão o app só muda onde a
triagem manual acontece, sem reduzir o volume dela.

**Para implementar**: projeto Expo separado consumindo os mesmos
`src/domain` (lógica pura, sem dependência de DOM) e o mesmo backend
Supabase; escopo inicial só triagem título/resumo (o caso de uso mais
mobile-friendly), não o app inteiro.

## 7. Lacunas estruturais que nenhuma ferramenta do mercado resolve bem

Levantamento feito em 2026-07-30 a partir de uma análise de metodologista
sênior, não de benchmark de concorrente — são pontos que Rayyan, Covidence,
ASReview, RobotReviewer e otto-SR também não cobrem hoje. O Biofor atende
tanto revisões de modelo preditivo/diagnóstico (PROBAST já é a ferramenta de
RoB usada) quanto qualquer outro tipo de revisão sistemática — os itens
abaixo (especialmente o 7.9) devem ser construídos de forma genérica, não
como especialização exclusiva num nicho.

### 7.1 Detecção de outcome switching

Cruzar os desfechos registrados no protocolo do estudo primário
(ClinicalTrials.gov, PROSPERO, ISRCTN) contra o que foi de fato reportado no
artigo publicado, sinalizando relato seletivo de desfecho — é o domínio 5 do
RoB2 e hoje é trabalho manual de detetive em qualquer ferramenta do mercado.

**Para implementar**: função serverless que, dado um NCT ID/registro
extraído do artigo, consulta a API do ClinicalTrials.gov e compara a lista
de desfechos registrados com os extraídos em `dataExtraction`, sinalizando
divergências para revisão humana.

### 7.2 Forense estatística de integridade de dados nos estudos incluídos — ✅ implementado (2026-07-30)

Testes tipo GRIM/SPRITE (consistência de médias/desvios-padrão reportados
com o N informado) para sinalizar possível erro ou fabricação de dados
antes que um estudo entre na síntese — relevante dado o crescimento de
retratações em periódicos que alimentam revisões sistemáticas.

Implementado em `src/domain/statForensics/grimSprite.ts` (função pura, com
testes): `checkGrim` reproduz o teste clássico de Brown & Heathers
(consistência da média reportada com N, respeitando as casas decimais
informadas); `computeSdFeasibleRange` calcula em forma fechada o DP mínimo e
máximo possíveis para N inteiros dentro de `[mínimo, máximo]` somando ao
valor implícito pela média — o pré-check de viabilidade em que o SPRITE
completo se baseia (não a busca iterativa inteira). Como
`extraction_fields` é livremente configurável por projeto (sem médias/DP/N
fixos no schema), foi adicionada a coluna opcional
`extraction_fields.stat_role` (migração 0030, mesmo padrão de
`criteria.picots_dimension`) para marcar qual campo numérico é a média, o
DP, o N e (opcionalmente) o mínimo/máximo da escala — configurável em
Configurações → Campos de extração, um campo por papel por projeto (várias
médias/desfechos por estudo fica fora do escopo desta primeira versão).
Quando há papéis suficientes marcados, um selo "Possível inconsistência
estatística" aparece no cabeçalho do registro em `DataExtractionPage` e
`RiskOfBiasPage` (que passou a consultar `v_extraction_field_status` só
para isso), sem bloquear a inclusão do estudo.

### 7.3 Checagem contínua de retratação — ✅ implementado (2026-07-30)

Cruzar cada estudo incluído com bases de retratação (Retraction Watch
Database, Crossref) e alertar se um estudo já incluído foi retratado ou
recebeu errata/expressão de preocupação depois da inclusão — inclusive após
a revisão estar "concluída".

Implementado em `api/check-retractions.ts`, consultando a API do Crossref
(campo `update-to`) pelo DOI de cada estudo incluído — `retraction`,
`partial_retraction`, `expression_of_concern`, `withdrawal` e `removal`
sinalizam o registro (`records.retraction_status`/`retraction_notice_doi`,
migração 0031); uma correção/errata comum não sinaliza. O selo nunca
regride para um status menos grave numa checagem posterior
(`isAtLeastAsSevere`, com testes). Sem envio de e-mail (a app ainda não tem
esse mecanismo — ver item §2): a "notificação" é o cartão "Vigilância de
retratação" na Visão Geral do projeto, sempre visível para quem abrir o
projeto, com a lista de estudos sinalizados e link para o aviso do
Crossref. Dois modos de disparo no mesmo endpoint: Vercel Cron (diário,
`vercel.json`, autenticado via `CRON_SECRET`) varre todos os projetos,
priorizando sempre os registros verificados há mais tempo
(`retraction_checked_at`); o botão "Verificar" no cartão roda sob demanda,
escopado ao projeto atual. Requer `CROSSREF_EMAIL` no ambiente do servidor
(mesma convenção do `UNPAYWALL_EMAIL`/`OPENALEX_EMAIL`).

### 7.4 Proveniência ponta-a-ponta da extração

Cada valor extraído (humano ou IA) devia ser um link clicável para o trecho
exato do PDF de onde veio, não só um campo de texto solto — muda a extração
de "confie em mim" para "confira você mesmo em 1 clique", relevante tanto
para auditoria interna quanto para defender a revisão numa submissão.

**Para implementar**: ao extrair (manual ou via IA, item 6.2), salvar
também a posição/trecho de origem no PDF (ex.: coordenadas de texto do
PDF.js) junto com `answers` em `data_extractions`; UI abre o PDF já
navegado até o trecho ao clicar no valor extraído.

### 7.5 Justificativa da IA ancorada na diretriz metodológica

Hoje a IA do Biofor (`aiScreening`, e a sugestão de RoB do item 6.3) escreve
justificativa em texto livre. Ancorar a justificativa citando a seção
específica da diretriz aplicável (ex.: Cochrane Handbook §7.2.3, ou o item
correspondente do PROBAST) separa uma sugestão "aceitável" de uma
"defensável" numa submissão para periódico ou órgão de HTA.

**Para implementar**: incluir o texto relevante das diretrizes (PROBAST,
Cochrane Handbook, PRISMA) como contexto RAG no prompt de
`aiScreening`/RoB, instruindo o modelo a citar a seção usada; exibir a
citação junto da justificativa em `aiAudit`.

### 7.6 Sinalização de fadiga de decisão do revisor

Monitorar velocidade/consistência das decisões de triagem de um revisor ao
longo de uma sessão e sinalizar quando a qualidade da decisão provavelmente
está caindo — fadiga de decisão é uma ameaça metodológica documentada e
nenhuma ferramenta do mercado hoje trata isso como sinal ativo.

**Para implementar**: métrica simples em `screening` (tempo entre decisões,
taxa de reversão de decisão) acumulada por sessão; acima de um limiar,
sugerir pausa ou uma leva de recalibração (reapresentar 3-5 decisões
recentes ambíguas para segunda checagem).

### 7.7 Fase de calibração ativa com feedback antes da triagem valer

Fase piloto formal onde os revisores triam um conjunto comum, o kappa é
medido, e cada discordância vem com feedback específico do porquê ("você
discordou do painel nesses artigos, veja o motivo") — hoje isso é feito
informalmente fora da ferramenta, quando é feito.

**Para implementar**: modo "calibração" em `screening` que roda antes da
triagem valer para o PRISMA — um subconjunto marcado com decisão de
referência (do owner ou por consenso), kappa calculado ao final e tela de
revisão item a item das discordâncias, reaproveitando `agreement`.

### 7.8 Memória entre revisões do mesmo grupo/portfólio

Quando o mesmo grupo de pesquisa roda várias revisões, reconhecer estudos
que aparecem em mais de uma (achados de busca sobrepostos) e reaproveitar
triagem/extração já feita — reduz retrabalho em programas de pesquisa que
produzem SRs em série. Nenhuma ferramenta do mercado trata revisões do
mesmo grupo como relacionadas; todas isolam cada projeto.

**Para implementar**: ao importar registros, checar por DOI contra
`records` de outros projetos do mesmo usuário/organização; se já houver
triagem/extração prévia para aquele DOI, oferecer copiar como ponto de
partida (sempre editável, nunca aplicado automaticamente sem revisão).

### 7.9 Suporte a múltiplos templates de extração/RoB por tipo de revisão

O Biofor já suporta critérios, PICOTS e taxonomia de exclusão totalmente
configuráveis por projeto, mas o RoB está fixo em PROBAST
(`src/features/riskOfBias`) — adequado para revisões de modelo
preditivo/prognóstico, mas não para RCT (RoB 2), estudo observacional
(ROBINS-I) ou acurácia diagnóstica (QUADAS-2). Da mesma forma, a extração de
dados hoje é campos genéricos configuráveis, sem um template pronto no
padrão CHARMS (o checklist específico para extração em revisões de modelo
preditivo). O objetivo aqui não é especializar o Biofor num nicho único, e
sim oferecer templates prontos para os tipos de revisão mais comuns,
mantendo a configuração livre por projeto como já é hoje.

**Para implementar**: biblioteca de templates (RoB 2, ROBINS-I, QUADAS-2,
PROBAST, CHARMS) que pré-preenche `extraction_fields` e os domínios de
`risk_of_bias_assessments` na criação do projeto, conforme o tipo de
revisão escolhido — projeto continua livre para editar tudo depois, nada
fica fixo no código.

## 8. Recomendação de periódicos para publicação (base CAPES)

Levantado em 2026-07-30 a partir de
`base_periodicos_acordos_capes_2026.csv`/`.xlsx`, já copiada para
`supabase/seed-data/` dentro do projeto (cópia idêntica ao arquivo original
de `phd/dev/`, ainda não versionada no git). Base com 5.049 periódicos
elegíveis para publicação com **APC 100% coberto** por acordos
transformativos vigentes da CAPES (Springer Nature, Elsevier, Wiley, IEEE,
ACS, ACM, Royal Society), compilada em 11/07/2026 — Fator de Impacto e
quartil JIF usam dados de 2024 publicados no JCR 2025 (série completa mais
recente disponível nas listas públicas/editoras na data da compilação).
Colunas relevantes: `Periódico`, `ISSN`/`eISSN`, `Editora ou imprint`,
`Campo principal`, `Assuntos ou subcampos`, `Fator de impacto`, `Fator de
impacto, 5 anos`, `Quartil JIF`, `URL do periódico`, `URL da
elegibilidade`.

**Funcionalidade**: ao concluir (ou durante) a revisão, sugerir periódicos
candidatos para submissão do manuscrito, rankeados por um índice — não é um
"melhor journal" genérico, é "melhor encaixe temático + qualidade, dentro
do universo de periódicos onde o pesquisador não paga APC do próprio
bolso". Como toda a base já é 100% APC coberto, o índice não precisa pesar
custo (constante); o diferencial é aderência temática + qualidade.

**Para implementar**:
1. Importar `supabase/seed-data/base_periodicos_acordos_capes_2026.csv`
   como tabela (`capes_journals`), guardando `data_compilacao` (2026-07-11)
   e `ano_dados_jif` (2024/JCR 2025) como metadados — a base muda quando a
   CAPES publica nova lista, então precisa ser reimportável, não hardcoded.
2. Calcular aderência temática comparando o texto do projeto (título,
   critérios de elegibilidade, PICOTS, palavras-chave dos estudos
   incluídos) contra `Campo principal`/`Assuntos ou subcampos` de cada
   periódico via embeddings — mesma abordagem de similaridade semântica do
   item 6.7 (deduplicação).
3. Compor um índice combinando aderência temática (maior peso), quartil JIF
   e fator de impacto normalizado dentro da área — fórmula e pesos a
   definir, mas deve ficar visível/explicável na UI (mostrar os
   componentes do score, não só o número final).
4. Nova tela no painel do projeto (ex. "Publicação") com a lista rankeada,
   filtros por área/quartil/editora, e link direto para `URL do periódico`
   e `URL da elegibilidade` de cada linha.
5. Sinalizar na UI quando a base estiver desatualizada (ex.: mais de 12
   meses da `data_compilacao`) e apontar para reimportação — acordos e
   quartis mudam ano a ano.
