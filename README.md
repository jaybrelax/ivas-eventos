# Guarnição IVAS

Aplicativo dos guardiões do Instituto IVAS para acompanhar rituais, candidatar-se às vagas, consultar escalas, estatísticas e perfil. Este repositório contém apenas a interface e a lógica da Guarnição. A administração e a publicação de eventos pertencem ao projeto separado de Eventos.

## Rotas

- `/guarnicao`: próximos rituais e candidaturas.
- `/guarnicao/reunioes`: próxima reunião no topo e anteriores abaixo, com quatro reuniões por vez e botão para carregar mais. Reaproveita os cards da tela inicial e a busca por tema ou número.
- `/guarnicao/guardioes`: página **Soldados**, com guardiões, guardiãs e mestres ativos; busca por nome e filtros combinados por função e gênero. Os endereços existentes dos perfis foram preservados.
- `/guarnicao/escalas`: candidaturas e histórico dos guardiões; para mestres, todos os rituais em que foram escalados, próximos e anteriores.
- `/guarnicao/estatisticas`, `/guarnicao/pacotes`, `/guarnicao/perfil`: demais áreas do aplicativo.
- `/login-guarnicao` e `/cadastro`: entrada e criação de conta de guardião. Após autenticação, o retorno permanece em `/guarnicao` ou em uma rota interna solicitada.
- `/api/auth/google`: autenticação com Google.
- `/api/cron/lembretes`: lembretes de escala para guardiões, acionados pelo cron da Vercel.

Na visão de coordenação, **Configurações** permite ligar ou desligar a aprovação automática. Ela começa ligada. Desligada, novos cadastros por senha ou Google ficam pendentes e o coordenador os aprova na lista da mesma tela; o guardião só entra depois da aprovação.
Quem já tem uma conta no IVAS sem função de guardião usa a mesma conta para concluir o cadastro da Guarnição; não é criada uma conta duplicada.

## Acesso por labels do Auth

O acesso à Guarnição é decidido pelas labels da conta no Appwrite Auth: `admin` e `coordenador` liberam a visão de coordenação; `mestre` e `guardiao` liberam as respectivas funções. Quem tem mais de uma função pode alternar as visões disponíveis no Perfil. As labels `normal` e `participante`, isoladamente, não liberam este módulo. A preferência `funcao_ritual` continua gravada para interoperar com o sistema de Eventos, mas não concede acesso à Guarnição.

O cadastro com aprovação automática e a aprovação pela coordenação atribuem `guardiao`; a retirada do cargo remove essa label. Para contas anteriores à mudança, `npm run migrate:labels` mostra quantas labels faltam e `npm run migrate:labels -- --apply` as adiciona sem apagar as labels existentes. A migração foi aplicada ao projeto Appwrite conectado em 11/11/2026.

## Banco de dados

A Guarnição consulta os rituais e a equipe no **mesmo projeto Appwrite** usado pelo sistema de Eventos. Por isso, os modelos e algumas tabelas ainda usam os nomes `eventos`, `tipos_evento` e `instituto`. Este repositório não inclui as telas de administração de Eventos nem o script que cria ou altera sua estrutura no banco. As candidaturas, os sinais de atualização e as inscrições de notificações pertencem à Guarnição.

## Desenvolvimento

Requisitos: Node.js 20.9 ou superior e acesso ao projeto Appwrite existente.

1. `npm ci`
2. Copie `.env.example` para `.env.local` e preencha os valores do ambiente.
3. Execute `npm run migrate:approval` uma vez para criar a configuração de aprovação no Appwrite.
4. `npm run dev`

Validação: `npm run typecheck`, `npm run test:auth` e `npm run test:listas`.

## Publicação

Importe **este repositório** no projeto Vercel `ivas-guarnicao` da conta correta. Configure nele as variáveis de ambiente do Appwrite, OAuth Google, VAPID e cron conforme `.env.example`. O domínio esperado é `guarnicao.virtudes.net.br`. Não vincule ao projeto Vercel de Eventos/Rituais IVAS.
