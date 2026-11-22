---
name: Rituais IVAS
description: Sistema de rituais do Instituto IVAS — roxo profundo, ouro e vidro pontual sobre cartões claros.
colors:
  mata-50: "#f5f2fb"
  mata-100: "#e8e1f5"
  mata-200: "#d0c2ea"
  mata-300: "#ad97d6"
  mata-400: "#8566bb"
  mata-500: "#6a449c"
  mata-600: "#55347f"
  mata-700: "#432966"
  mata-800: "#35204f"
  mata-900: "#251639"
  mata-950: "#170d26"
  ouro-100: "#f5ecd0"
  ouro-200: "#ecd9a3"
  ouro-400: "#d6b45e"
  ouro-500: "#c8a24a"
  ouro-600: "#a9853a"
  ouro-700: "#87692f"
  fundo: "#f6f6f3"
  guarnicao-violeta: "#6a3fd6"
  guarnicao-profundo: "#1c1040"
  guarnicao-data: "#4a31a6"
  guarnicao-escuro-bg: "#151022"
  guarnicao-escuro-card: "#1a1428"
  guarnicao-laranja: "#f97316"
typography:
  display:
    fontFamily: "Bricolage Grotesque, ui-sans-serif, system-ui, sans-serif"
  body:
    fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
  card-title:
    fontFamily: "Montserrat, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    letterSpacing: "-0.025em"
  label:
    fontFamily: "Inter Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
rounded:
  lg: "8px"
  xl: "12px"
  2xl: "16px"
  full: "9999px"
spacing:
  card-padding: "20px"
  card-padding-sm: "24px"
  control-height: "40px"
components:
  button-primary:
    backgroundColor: "{colors.mata-600}"
    textColor: "#ffffff"
    rounded: "{rounded.xl}"
    height: "{spacing.control-height}"
    padding: "0 16px"
  button-ouro:
    backgroundColor: "{colors.ouro-500}"
    textColor: "{colors.mata-950}"
    rounded: "{rounded.xl}"
    height: "{spacing.control-height}"
    padding: "0 16px"
  button-secondary:
    backgroundColor: "#ffffff"
    textColor: "#292524"
    rounded: "{rounded.xl}"
    height: "{spacing.control-height}"
    padding: "0 16px"
  card:
    backgroundColor: "#ffffff"
    rounded: "{rounded.2xl}"
    padding: "{spacing.card-padding}"
  input:
    backgroundColor: "#ffffff"
    textColor: "#1c1917"
    rounded: "{rounded.xl}"
    height: "{spacing.control-height}"
    padding: "0 12px"
  chip-app:
    backgroundColor: "#ffffff"
    textColor: "#57534e"
    rounded: "{rounded.full}"
    height: "36px"
    padding: "0 14px"
  chip-app-on:
    backgroundColor: "#3b2790"
    textColor: "#ffffff"
    rounded: "{rounded.full}"
---

# Design System: Rituais IVAS

## Overview

**Creative North Star: "O Santuário em Vidro"**

Um espaço calmo e luminoso: cartões claros e arejados sobre fundo quente, com roxo profundo como cor de presença e ouro como assinatura rara. O vidro translúcido aparece só onde o app precisa flutuar (dock, botões sobre capas), nunca como linguagem de toda a tela. A operação no local do ritual, em tablet e celular, manda: alvos grandes, contraste firme, movimento contido.

O app tem duas faces. A área pública e o painel admin usam a paleta `mata` + `ouro` sobre `fundo` claro. O app da Guarnição (`.app-guarnicao`) reinterpreta a mesma estrutura em violeta/índigo, com laranja para avisos de vaga, e tem tema claro, escuro e automático. Títulos em Cinzel dão o tom ritual; o resto é Inter, sóbrio e legível.

**Key Characteristics:**
- Roxo profundo (`mata`) como cor de ação; ouro como acento raro.
- Cartões brancos, bordas suaves, sombra ambiente discreta.
- Vidro translúcido e gradientes só em dock, capas e destaques.
- Cantos generosos (12–16px) e botões de 40px de altura.
- Movimento curto e com significado; respeita `prefers-reduced-motion`.

## Colors

Paleta de duas vozes: um roxo-mata frio e profundo e um ouro quente e contido, sobre neutros levemente quentes (`stone`) e um fundo `#f6f6f3`.

### Primary
- **Mata Profundo** (`mata-600` #55347f → `mata-800` #35204f): ação primária (gradiente vertical em `btn-primario`), interruptores ligados, foco de campos (`mata-400` + halo `mata-100`).
- **Mata Noite** (`mata-950` #170d26): texto sobre ouro e seleção de texto.

### Secondary
- **Ouro Ritual** (`ouro-500` #c8a24a; `ouro-400`→`ouro-600` no gradiente): botão de destaque (`btn-ouro`), anel de foco (`:focus-visible`), seleção (`ouro-200`). Texto ouro em fundo claro usa `ouro-700` (#87692f).

### Tertiary (app da Guarnição)
- **Violeta do Escudo** (`#6a3fd6`, escala `emerald-*` remapeada): ações e estados positivos dentro de `.app-guarnicao`.
- **Roxo Profundo** (`#1c1040`; coluna de datas `#4a31a6`; chip ativo `#3b2790`).
- **Laranja do Escudo** (`#f97316`): avisos de vaga e urgência.

### Neutral
- **Fundo Quente** (`#f6f6f3`): fundo geral do tema claro. Na Guarnição o fundo puxa para violeta (`stone-50` #f3f0fa).
- **Noite Violeta** (`#151022` fundo, `#1a1428` cartões): tema escuro da Guarnição; a escala `stone` é invertida.
- **Texto** (`#18201b` base; `stone-900` em títulos, `stone-500` em apoio).

### Named Rules
**A Regra do Ouro Raro.** Ouro é assinatura, não decoração: foco, um destaque por tela, selos de conclusão. Nunca como fundo de áreas grandes.

**A Regra da Mesma Estrutura.** Troca de tema ou de app muda valores de token, não a estrutura dos componentes. Cores de estado (vermelho de erro, laranja de vaga) mantêm o significado nos dois temas.

## Typography

**Display Font:** Bricolage Grotesque (com ui-sans-serif, system-ui)
**Body Font:** Inter Variable (com ui-sans-serif, system-ui)
**Card Font:** Montserrat (títulos de cartão)

**Character:** Bricolage Grotesque dá títulos com personalidade e leitura firme em tela pequena; Inter mantém a operação neutra e densa o bastante para tablet.

### Hierarchy
- **Display** (Bricolage Grotesque, peso 600-700, escala por contexto): títulos de página e de evento, capas.
- **Card Title** (Montserrat 700, 16px, tracking −0.025em): título de cartão (`cartao-titulo`, `titulo-card`).
- **Body** (Inter 400, 14px): texto corrente, tabelas, formulários.
- **Label** (Inter 500, 13px): rótulo de campo (`rotulo`); apoio em 12px (`ajuda`, `stone-500`).

### Named Rules
**A Regra do Display Contido.** Bricolage Grotesque só em títulos e marca, nunca em corpo, botões ou números de tabela.

## Layout

Container fluido, mobile-first, com cartões empilhados (padding 20px, 24px a partir de `sm`). Controles têm 40px de altura (chips 36px) para toque. O admin tem menu recolhível e layout adaptado a tablet. A Guarnição usa dock inferior flutuante e telas que entram deslizando da direita. Espaçamento segue a escala Tailwind (múltiplos de 4px).

## Elevation & Depth

Híbrido: camadas tonais + sombra suave nos cartões, e vidro apenas em elementos flutuantes. Cartões usam borda `stone-200/80` e sombra `cartao`; modais e gavetas usam `elevado`. No tema escuro as sombras ficam mais densas e os cartões mudam de tom em vez de ganhar brilho.

### Shadow Vocabulary
- **Cartão** (`box-shadow: 0 1px 2px rgb(20 42 29 / 0.04), 0 4px 16px -8px rgb(20 42 29 / 0.1)`): superfície em repouso.
- **Elevado** (`0 2px 4px rgb(20 42 29 / 0.04), 0 16px 40px -16px rgb(20 42 29 / 0.25)`): modais, gavetas.
- **Vidro** (`.vidro`): fundo `rgb(28 12 50 / 0.52)` com `backdrop-filter: blur(18px) saturate(170%)`, brilho de 1px no topo e borda de luz; só sobre imagens.
- **Dock** (`.dock-app`): gradiente roxo translúcido com sombra longa; no tema escuro vira violeta mais claro.

### Named Rules
**A Regra do Vidro Pontual.** Vidro só flutua sobre imagem ou conteúdo rolável (dock, ações sobre capa). Nunca em cartões de dados, tabelas ou formulários.

## Shapes

Linguagem arredondada e macia: botões e campos em 12px (`rounded-xl`), cartões em 16px (`rounded-2xl`), chips e dock em pílula (9999px). Interruptores são pílulas de 44×24px. Bordas de 1px em tons de pedra, nunca mais grossas que 2px; a borda animada (2px, 5px no destaque de reunião) é exceção reservada ao evento mais próximo.

## Components

### Buttons
- **Shape:** cantos de 12px, altura 40px, peso 600, `active:scale-[0.98]`.
- **Primary (`btn-primario`):** gradiente `mata-600`→`mata-800`, texto branco, brilho interno no topo.
- **Ouro (`btn-ouro`):** gradiente `ouro-400`→`ouro-600`, texto `mata-950`; um por tela.
- **Secondary:** fundo branco, borda `stone-200`, hover `stone-50`.
- **Ghost / Ícone:** sem fundo, hover `stone-900/5`; `btn-icone` é 40×40 e não se combina com outros `btn-*`.
- **Perigo:** branco com borda e texto vermelhos.
- **Disabled:** 50% de opacidade, sem eventos.

### Chips
- **Chip de filtro (`chip-app`):** pílula branca de 36px, anel `stone-200`, texto 13px/600; ativo em `#3b2790` com texto branco. Toque encolhe a 95%.
- **Chip de estado (`chip`):** pílula pequena (12px/600) para status.

### Cards / Containers
- **Corner Style:** 16px.
- **Background:** branco (escuro: `#1a1428`).
- **Shadow Strategy:** `cartao` em repouso.
- **Border:** 1px `stone-200/80`.
- **Internal Padding:** 20px (24px em `sm`+).

### Inputs / Fields
- **Style:** altura 40px, borda `stone-200`, fundo branco, cantos 12px, sombra de 1px.
- **Focus:** borda `mata-400` e halo de 4px `mata-100`; foco por teclado usa contorno ouro de 2px.
- **Error / Disabled:** erro com borda vermelha e fundo `red-50`; desabilitado em `stone-100`.
- Campos estilo Material (`campo-md`) vivem dentro de grupos que fornecem a moldura.

### Navigation
- **Dock inferior (Guarnição):** vidro roxo flutuante; o item ativo inverte o contraste.
- **Admin:** menu lateral recolhível; no tablet, layout próprio.
- **Segmentado:** grupo em pílula (Lista | Calendário), item ativo branco com sombra leve.

### Selo de confirmação (signature)
Roseta em SVG com halo, anel e check desenhados, partículas e brilho. Reservado à conclusão de inscrição e pagamento; respeita redução de movimento.

### Borda animada (signature)
Brilho em degradê (ouro, coral, lilás) que percorre a borda do cartão. Só para a próxima reunião ou destaque único.

## Do's and Don'ts

### Do:
- **Do** usar `mata-600→800` para a ação principal e reservar `btn-ouro` a um destaque por tela.
- **Do** manter alvos de toque de pelo menos 40px (36px em chips) e contraste AA nos dois temas.
- **Do** mudar tema alterando tokens (`--color-stone-*`, `--color-emerald-*`), não a estrutura dos componentes.
- **Do** respeitar `prefers-reduced-motion` em toda animação nova.
- **Do** escrever a interface em português do Brasil.

### Don't:
- **Don't** usar vidro, blur ou gradientes translúcidos em cartões de dados, tabelas ou formulários.
- **Don't** usar a fonte de título em corpo de texto, botões ou números de tabela.
- **Don't** usar ouro como fundo de áreas grandes nem em mais de um destaque por tela.
- **Don't** criar bordas coloridas animadas fora do evento mais próximo.
- **Don't** introduzir verde como cor de ação: dentro da Guarnição as classes `emerald-*` já são violeta.
