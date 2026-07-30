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

## 3. Clareza sobre o checkbox "Incluir IA como avaliador"

No `AgreementCard`, o checkbox "Incluir IA como avaliador" controla se a
decisão da IA entra no cálculo de concordância/kappa — não inicia nem
indica que a triagem por IA está rodando. Um usuário relatou confusão:
marcou o checkbox, viu que ele "desmarcava sozinho" ao voltar à tela, e
não tinha como saber se o processo de triagem por IA de fato havia
iniciado.

**Para implementar**: ajustar o rótulo/texto de apoio do checkbox para
deixar explícito que ele é sobre o cálculo de concordância, não sobre
disparar a triagem — e apontar para onde de fato se inicia a triagem
(`AiScreeningCard`, na Visão Geral do projeto).

## 4. Indicador de "última execução da IA"

Hoje não há, na interface, como saber se/quando a triagem por IA rodou
pela última vez para um projeto, sem ir conferir em `ai_usage_log` ou na
Auditoria de IA registro a registro.

**Para implementar**: mostrar, no `AiScreeningCard` (Visão Geral) e/ou na
aba de Auditoria de IA, um timestamp da última execução bem-sucedida
(derivável de `MAX(created_at)` em `ai_usage_log` ou `ai_screenings` por
projeto/etapa).
