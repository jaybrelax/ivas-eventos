# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Participantes (público):** cadastram-se, se inscrevem em rituais, pagam e enviam comprovante. Uso principal no celular.
- **Equipe interna:** admin, coordenador, mestre e guardião. Gerenciam eventos, escalas, presença, reuniões, pagamentos e participantes. Uso em tablet, celular e desktop, inclusive no local do ritual.

## Product Purpose

Rituais IVAS é o sistema do Instituto IVAS para gerenciar rituais e eventos de ponta a ponta: agenda e numeração automática dos rituais, inscrição e pagamento, escala de mestres e guardiões, reuniões de equipe, consumo/dosagem de medicina, chamada ao vivo, banners e imagens de capa geradas com IA. Sucesso: a equipe opera o ritual sem planilhas paralelas e o participante se inscreve e paga sem ajuda.

## Positioning

Sistema feito para o fluxo ritual do IVAS, não um app genérico de eventos: numeração própria dos rituais, dosagem e consumo da medicina, papéis rituais (mestre, guardião) separados do perfil de acesso, reuniões de equipe com presença/justificativa.

## Operating Context

- Dois apps compartilham o backend Appwrite (Auth, banco, storage): Eventos (público + admin, este repositório, com rotas `/guarnicao`) e Guarnição independente (`RITUAIS_IVAS_guarnicao`).
- Deploy na Vercel; Appwrite é a fonte única de dados de evento, escala e configuração.
- Atualização ao vivo na gestão do evento e na chamada.

## Capabilities and Constraints

- Next.js 16 (App Router), Appwrite, Tailwind CSS 4. Ler `node_modules/next/dist/docs/` antes de codar (AGENTS.md).
- Labels de acesso: `admin`, `coordenador`, `normal`; `participante` = cadastro público; `mestre`/`guardiao` = função ritual; `first` = prioridade em listagens; `mock` = oculto das listagens. Manter separados perfil de acesso, participação pública e função ritual.
- Chave OpenAI e prompts de imagem ficam no servidor (Appwrite, tabela `instituto`); nunca no cliente.
- Idioma da interface: português do Brasil.

## Brand Commitments

Manter a identidade atual: tipografia Bricolage Grotesque (títulos) + Inter, roxo escuro com tema claro/escuro, logos do Instituto IVAS (versões fundo claro e escuro, no Storage Appwrite).

## Evidence on Hand

Logos e imagens em `IMG/`, `public/` e Storage Appwrite. Não há depoimentos, métricas ou casos documentados; não inventar.

## Product Principles

1. Operação no local vem primeiro: legível e tocável em tablet e celular, sob pouca luz e pressa.
2. Um dado, uma fonte: evento, escala e configuração vivem no Appwrite e não se duplicam entre os apps.
3. Papéis claros: cada pessoa vê e faz só o que seu papel permite.
4. Respeito ao contexto ritual: tom sóbrio, sem ruído promocional.
5. Participante conclui inscrição e pagamento sem suporte.

## Accessibility & Inclusion

Alvo WCAG 2.2 AA; contraste e áreas de toque adequados em tema claro e escuro; interface em pt-BR.
