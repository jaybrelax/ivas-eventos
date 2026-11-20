export const PROMPT_PADRAO =
  "Ilustração artística e elegante para divulgar um evento espiritual, com luz suave e cores harmoniosas. Sem texto, letras ou logotipos.";

/** Traduz os erros mais comuns da OpenAI para uma mensagem que o usuário entende. */
export function mensagemOpenAI(status, texto = "") {
  if (status === 401) return "A chave da OpenAI foi recusada. Confira em Configurações › Chaves API.";
  if (status === 429) return "Limite ou saldo da OpenAI esgotado. Confira o saldo da sua conta e tente de novo em instantes.";
  if (status === 403) return "A sua conta da OpenAI ainda não tem acesso à geração de imagens (pode exigir verificação da organização).";
  if (status === 400 && /safety|moderation|content_policy/i.test(texto)) return "A OpenAI recusou o pedido por política de conteúdo. Ajuste o título, a descrição ou o prompt.";
  if (status >= 500) return "A OpenAI está instável agora. Tente de novo em instantes.";
  return "A OpenAI não conseguiu gerar a imagem. Tente de novo.";
}

/** Texto final enviado à OpenAI: prompt do Instituto + dados do evento + instruções sobre logos, capa atual e ajustes. */
export function montarPedido({ comando, detalhes, usaLogo, usaCapa, ajustes }) {
  const pedido =
    (comando || PROMPT_PADRAO) + "\n\n" + detalhes.join("\n") +
    (usaLogo ? "\nIncorpore as logos fornecidas, preservando sua identidade visual e seguindo a posição descrita." : "") +
    (usaCapa ? "\nA última imagem de referência é a capa atual do evento. Use-a como base para a edição." : "") +
    (String(ajustes ?? "").trim() ? "\nAjustes solicitados:\n" + String(ajustes).trim().slice(0, 2000) : "");
  if (pedido.length > 32000) throw new Error("O prompt final ficou muito longo. Reduza a estrutura ou a direção artística nas configurações.");
  return pedido;
}
