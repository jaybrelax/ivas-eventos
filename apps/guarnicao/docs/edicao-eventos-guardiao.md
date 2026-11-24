# Edição de eventos no app Guardião

O menu na capa aparece para administradores, coordenadores e mestres com cadastro completo e aprovado. A mesma política é conferida no servidor antes de qualquer gravação ou geração. Mestres podem editar os eventos acessíveis no aplicativo, conforme solicitado; isso não altera as permissões anteriores de gerenciamento das escalas.

O editor de informações altera somente título, descrição, data, horário, endereço e tipo, além do autor da alteração. Equipes, vagas, inscrições e outros campos são preservados. A troca entre reunião e ritual é recusada quando existe equipe ou histórico de participações: essa conversão exige revisão no admin de Eventos. A numeração usa o mesmo procedimento do aplicativo de Eventos.

O editor de imagem permite enviar outra capa, gerar uma nova com IA e solicitar ajustes usando a capa salva como referência. Prévia, otimização e salvamento são etapas separadas. O envio é limitado a PNG/JPG/WebP; uma capa inválida é recusada também no servidor. Falhas de gravação limpam o novo upload. A capa anterior é preservada no Storage, pois pode ser referenciada por um evento copiado.

Os editores usam `dialog` nativo para foco e teclado, com tela cheia, rolagem e áreas seguras. O retorno do salvamento atualiza o endereço canônico e a página, e emite o sinal de Realtime. Uma versão de evento alterada desde a abertura do modal é recusada para evitar sobrescrever dados sem aviso.

A geração reaproveita o fluxo atual do editor de Eventos e consulta a mesma configuração no banco: chave, estrutura, direção artística, opções e cache das logos. A chamada à OpenAI é feita no servidor. A publicação e integração da Function Appwrite compartilhada continuam pendentes; esta implementação não publica a Function nem os aplicativos.

Validação: `npm run typecheck`, `npm run build`, `node --test scripts/edicao-evento.test.mjs`, `npm run test:auth` e `npm run test:listas`. Os testes simulam Appwrite e OpenAI; o teste de otimização usa Sharp com uma imagem local. Não foi realizada uma geração paga nem uma gravação de evento real. A interface foi conferida no navegador local nos modos claro e escuro. A busca da home e a capa expansível foram verificadas separadamente.
