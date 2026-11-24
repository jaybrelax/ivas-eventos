# Função compartilhada de geração de imagens

Uma única Appwrite Function gera as capas dos rituais para os **dois** sistemas (Eventos e Guarnição), que compartilham o mesmo projeto Appwrite. A chave da OpenAI, a estrutura do prompt, a direção artística e as logos ficam no banco (`ivas/instituto`, linha `ia`, configurada em Eventos › Configurações) e nunca chegam ao navegador.

## Como funciona

1. O app (servidor) pede ao Appwrite um token (JWT) curto, preso à sessão do usuário logado, e inicia uma **execução assíncrona** da função (`src/lib/ia-remota.ts` em cada app).
2. A função confere o token e exige a label `admin`, `coordenador` ou `mestre`.
3. Monta o prompt (`prompt.js`, `pedido.js`), sincroniza as logos uma única vez na OpenAI (`logos-instituto.mjs`, `enviar-logo.mjs`) e chama o endpoint de imagens. Com `capaFileId`, a capa atual entra como última referência (ajuste de imagem); `ajustes` é o texto do pedido.
4. O resultado é gravado como arquivo temporário no bucket privado `midia` (ID do arquivo = ID da execução, nome `ia-temp-…`). O app lê o arquivo, otimiza a imagem e **apaga** o temporário. A função também apaga temporários com mais de 1 hora.
5. Erros que o usuário deve ver são registrados no log da execução como `IA_ERRO {"erro":"…"}`, porque o Appwrite não guarda o corpo de execuções assíncronas.

Entrada (JSON): `titulo`, `descricao`, `tipo` (nome), `data` (AAAA-MM-DD), `horaInicio` (HH:mm), `numeroGeral`, `enderecoId` ou `enderecoLivre`, `ajustes`, `capaFileId`.

Marcadores do prompt: `{{art_direction}}`, `{{titulo_ritual}}`, `{{data_ritual}}`, `{{horario_ritual}}`, `{{numero_ritual}}`, `{{local_ritual}}`, `{{logo_ivas_fundo_claro}}`, `{{logo_ivas_fundo_escuro}}` e o legado `{{logo_ivas}}`. Marcador com dado ausente interrompe a geração com mensagem clara. As logos usam `logo_file_id` e `logo_escura_file_id` da linha `principal`; o cache dos File IDs da OpenAI fica em linhas `ia-logo-*` da mesma tabela.

## Publicar (uma vez, no Console do Appwrite ou pela CLI)

Confira cada item no Console, pois nomes de escopos e runtimes podem variar conforme a versão do Appwrite.

- **Function ID:** `gerar-imagem` · **Runtime:** Node 22 (ou o mais recente disponível) · **Entrypoint:** `src/main.js` · **Install command:** `npm install` · **Raiz:** esta pasta (`functions/gerar-imagem`).
- **Timeout:** 180 segundos ou mais (a OpenAI pode levar até 150 s). O padrão do Appwrite (15 s) interrompe a geração.
- **Execute access:** somente as labels `admin`, `coordenador` e `mestre`. **Não** habilitar domínio público.
- **Scopes da chave dinâmica:** leitura e escrita de linhas (tabelas `instituto` e `enderecos`) e de arquivos (bucket `midia`).
- **Logs:** habilitados (o app lê `IA_ERRO` do log).
- **Chave de API dos apps:** precisa do escopo de usuários com escrita (para gerar o token JWT).
- **Variável nos dois apps (Vercel):** `APPWRITE_FUNCTION_GERAR_IMAGEM_ID=gerar-imagem`. Enquanto estiver vazia, cada app continua gerando localmente, como antes.

Sem rodar a geração real: os testes (`node --test test/*.test.mjs`) cobrem prompt, marcadores, logos e montagem do pedido. A integração completa com Appwrite e OpenAI só pode ser conferida depois da publicação; faça uma geração de teste de baixa qualidade.
