# Rituais IVAS

Painel para gerenciar os eventos e rituais do Instituto IVAS: agenda, numeração automática dos rituais, configurações do Instituto e gerador de banners.

**Stack:** Next.js 16 (App Router) · Appwrite 2.5 (banco, login e arquivos) · Tailwind CSS 4

---

## Rodar localmente (Windows)

### 1. Pré-requisitos

- **Node.js 20.9 ou mais novo** (`node -v` no terminal)
- **Docker Desktop** rodando (para o Appwrite)

### 2. Subir o Appwrite (uma vez só)

Abra o PowerShell numa pasta onde o Appwrite vai morar (ex.: `J:\IVAS\APP\appwrite`, **fora** desta pasta do projeto) e rode:

```powershell
docker run -it --rm `
    --publish 20080:20080 `
    --volume /var/run/docker.sock:/var/run/docker.sock `
    --volume ${pwd}/appwrite:/usr/src/code/appwrite:rw `
    --entrypoint="install" `
    appwrite/appwrite:2.5.0
```

Abra **http://localhost:20080** e siga o assistente. A porta HTTP padrão é a 80; se ela estiver ocupada, escolha outra (ex.: 8080) nas configurações avançadas.

Depois de instalado:

1. Abra o console do Appwrite (http://localhost, ou http://localhost:8080 se mudou a porta) e crie sua conta.
2. Crie um projeto chamado **Rituais IVAS** com o ID `rituais-ivas`.
3. Em **Overview → Integrations → API keys**, crie uma chave com **todos os escopos** e copie.

### 3. Configurar o projeto

Nesta pasta (`RITUAIS_IVAS`), copie o arquivo de exemplo:

```powershell
copy .env.example .env.local
```

Abra o `.env.local` e preencha:

| Variável | O que colocar |
| --- | --- |
| `APPWRITE_ENDPOINT` | `http://localhost/v1` (ou `http://localhost:8080/v1` se mudou a porta) |
| `APPWRITE_PROJECT_ID` | `rituais-ivas` |
| `APPWRITE_API_KEY` | a chave criada no passo anterior |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | o seu login de Admin no painel |

### 4. Instalar, criar o banco e rodar

```powershell
npm install
npm run setup
npm run dev
```

- `npm run setup` cria o database `ivas`, as tabelas, os índices, o bucket de imagens, os 3 tipos de evento (Ritual normal, Reunião e Evento comemorativo) e o seu usuário Admin. Pode rodar de novo sem problema: o que já existe é pulado.
- Acesse **http://localhost:3000** e entre com o e-mail e a senha do `.env.local`.

### Primeiros passos no painel

1. **Configurações**: envie a logo (versão clara e escura), cadastre endereços, telefones, Instagram e a chave Pix (marque como padrão).
2. **Novo evento**: cadastre os eventos. Os tipos marcados como "Conta como ritual" recebem o número automaticamente.
3. **Banners**: escolha o período, ajuste o visual e clique em **Baixar PNG**.

---

## Regras de numeração dos rituais

- **Uma sequência só** para todos os tipos marcados como "Conta como ritual" (por padrão, Ritual normal). Começa em **500** (dá para mudar em Configurações enquanto nenhum ritual existir).
- **Número do ano**: reinicia em 1 a cada ano civil. Exibição: `R-0500 · 2026/01`.
- O número é dado na criação, na ordem de cadastro. O Admin pode ajustar manualmente na edição do evento.
- Eventos não têm status: marque **Evento em destaque** para realçá-lo na agenda. Cada evento pode ter uma **imagem de capa**.
- Se um evento deixa de ser ritual (troca de tipo), o número é liberado. Ritual excluído deixa um salto na sequência (a não ser que seja o último).
- O banco tem índices únicos: dois eventos nunca ficam com o mesmo número. Se dois cadastros saírem ao mesmo tempo, o sistema tenta de novo com o próximo número.

## Perfis

| Perfil | Acesso |
| --- | --- |
| **Admin** | Tudo: eventos, numeração manual, configurações, usuários, exclusões |
| **Coordenador** | Cria e edita eventos, vê o resumo, gera banners e salva modelos de banner |
| **Normal** | Acesso padrão de novos usuários: vê a agenda e o resumo e gera banners (as permissões de cada perfil serão definidas depois) |

O perfil é um *label* do usuário no Appwrite (`admin`, `coordenador` ou `normal`). Crie e altere usuários pela página **Usuários**.

Separado do perfil de acesso, cada usuário tem uma **Função do usuário** (Mestre, Guardião ou nenhuma) e um **Gênero**. Elas definem quem pode ser escalado em cada evento, em "Mestres e guardiões"; um Admin ou Coordenador também pode ser Mestre ou Guardião.

## Guarnição

Guardiões se candidatam às vagas de cada ritual (tipos que contam como ritual) pela página do evento.

- **Vagas por gênero:** cada evento tem vagas de guardiões (♂) e guardiãs (♀), padrão 2 e 2. O coordenador muda no grupo "Guarnição" do formulário do evento e pode fechar as candidaturas.
- **Ordem de chegada:** a candidatura vale na hora. Com as vagas cheias, a pessoa entra na **lista de espera**; quando alguém sai, o primeiro da espera assume a vaga sozinho.
- **Cancelamento:** o guardião cancela até **4 horas antes** do início. O coordenador inclui e retira guardiões a qualquer momento.
- Os guardiões veem quem mais se candidatou. A página **Guarnição** (menu, só coordenação e admin) resume as vagas dos próximos 90 dias.
- O histórico de participações aparece em **Meu perfil** e no painel de edição do usuário.
- Dados: tabela `candidaturas`; a lista `guardioes` do evento é mantida igual às candidaturas confirmadas.

## Créditos (pacotes)

O participante compra um **pacote** (ex.: 4 rituais por R$ 220) e recebe **créditos**: cada crédito vale 1 participação em ritual (tipo que conta como ritual e aceita inscrição pública). O pacote é a parte financeira; o controle é por crédito, com dono, situação e histórico próprios.

- **Compra:** em *Minha conta › Créditos* a pessoa escolhe um pacote do catálogo (*Configurações › Pacotes de créditos*), paga por Pix e toca em "Já paguei" (comprovante opcional). A coordenação confirma em *Créditos › Pacotes*, ou lança o pacote direto para a pessoa. Enquanto o pagamento não for confirmado, os créditos ficam **bloqueados** e não contam no saldo.
- **Uso:** quem ganha vaga confirmada num ritual usa o crédito disponível mais antigo, e a inscrição passa a "Crédito". Sem crédito, vale o fluxo avulso de sempre (Pix e comprovante). Um crédito só é usado uma vez: a coluna `creditos.trava` (1 = livre) é decrementada com mínimo 0, operação atômica no Appwrite, e só um consumo vence.
- **Cancelar:** cancelar a participação, trocar a contribuição para outra forma ou excluir o evento devolve o crédito ao pacote.
- **Saldo negativo:** quando o ritual começa e a pessoa está confirmada, sem crédito e sem contribuição avulsa confirmada, informada ou isenta, ela fica em **débito** (saldo = disponíveis − débitos). O débito some sozinho se a contribuição for resolvida ou a inscrição cancelada. Pacote novo **não quita** débito antigo sozinho: a coordenação usa *Quitar com crédito* em *Créditos › Débitos*.
- **Ceder:** o titular cede um crédito disponível a outra pessoa pelo e-mail dela. Crédito usado não se cede, e quem recebeu por cessão não cede de novo. A coordenação pode corrigir (na ficha do participante).
- **Histórico:** toda compra, uso, devolução, cessão e quitação vira uma linha em `movimentos_credito` (só acrescenta), com filtros por pessoa, ritual, pacote e data e exportação em CSV.
- **Banco:** rode uma vez `node --env-file=.env.local scripts/migrar-creditos.mjs` (`--check` só mostra o estado). Cria as tabelas `planos_pacote`, `pacotes`, `creditos` e `movimentos_credito`, a coluna `credito_id` em `inscricoes` e os valores novos de `pagamento` e do histórico, e preenche a trava dos créditos. `--remover-usos` apaga a tabela antiga `usos_credito` (só se vazia). `npm run setup` também cria tudo. Regras puras em `src/lib/creditos-regras.ts` (testes em `scripts/creditos-regras.test.mjs`).

## Estrutura

```
scripts/setup-appwrite.mjs     cria tabelas, índices, bucket, tipos e o Admin
src/lib/                       acesso ao Appwrite, sessão, numeração, Pix (BR Code), datas
src/app/login/                 login
src/app/(painel)/eventos/      agenda (lista e calendário), criar, editar, duplicar
src/app/(painel)/resumo/       contagem por tipo e por mês
src/app/(painel)/banners/      gerador de banners
src/app/(painel)/configuracoes Instituto, endereços, telefones, redes, Pix, tipos
src/app/(painel)/usuarios/     usuários e perfis
```

Toda leitura e gravação no Appwrite acontece no servidor do Next.js com a chave de API; o navegador só recebe o cookie de sessão (httpOnly). As tabelas não têm permissões públicas.

## Observações

- As fontes dos banners vêm do Google Fonts: o computador precisa de internet para elas aparecerem no PNG.
- O fundo em imagem do banner não é salvo no modelo, só usado na hora.
- Ainda não implementado (fica para a v1.1 do PRD): exportar PDF, carrossel automático quando os eventos não cabem.
