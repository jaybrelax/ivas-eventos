"use server";

import { prepararImagem } from "@/lib/imagem-servidor";
import { exigir } from "@/lib/auth";
import { PODE } from "@/lib/config";
import { listarTipos } from "@/lib/data";
import { getConfigIA } from "@/lib/ia";

export type ResultadoImagemIA = { ok: true; base64: string; tipo: string; nome: string } | { ok: false; erro: string };

const PROMPT_PADRAO =
  "Ilustração artística e elegante para divulgar um evento espiritual, em composição quadrada, com luz suave e cores harmoniosas. Sem texto, letras ou logotipos.";

/** Traduz os erros mais comuns da OpenAI para uma mensagem que o usuário entende. */
function mensagemDeErro(status: number, texto: string) {
  if (status === 401) return "A chave da OpenAI foi recusada. Confira em Configurações › Chaves API.";
  if (status === 429) return "Limite ou saldo da OpenAI esgotado. Confira o saldo da sua conta e tente de novo em instantes.";
  if (status === 403) return "A sua conta da OpenAI ainda não tem acesso à geração de imagens (pode exigir verificação da organização).";
  if (status === 400 && /safety|moderation|content_policy/i.test(texto)) return "A OpenAI recusou o pedido por política de conteúdo. Ajuste o título, a descrição ou o prompt.";
  if (status >= 500) return "A OpenAI está instável agora. Tente de novo em instantes.";
  return "A OpenAI não conseguiu gerar a imagem. Tente de novo.";
}

/**
 * Gera a capa do evento com a OpenAI a partir do prompt personalizado das Configurações somado
 * ao título, tipo e descrição do evento. Devolve a imagem já reduzida e em WEBP; o formulário
 * a coloca como capa e ela é salva junto com o evento.
 */
export async function gerarCapaComIA(entrada: { titulo: string; descricao: string; tipoId: string }): Promise<ResultadoImagemIA> {
  await exigir(PODE.editarEventos);
  const { chave, prompt } = await getConfigIA();
  if (!chave) return { ok: false, erro: "Cadastre a chave da OpenAI em Configurações › Chaves API." };

  const titulo = String(entrada.titulo ?? "").trim().slice(0, 120);
  const descricao = String(entrada.descricao ?? "").trim().slice(0, 1500);
  if (!titulo && !descricao) return { ok: false, erro: "Preencha o título ou a descrição do evento para a IA ter o que ilustrar." };
  const tipo = (await listarTipos()).find((t) => t.$id === entrada.tipoId)?.nome;

  const detalhes = [
    titulo && `Título do evento: ${titulo}`,
    tipo && `Tipo: ${tipo}`,
    descricao && `Descrição do evento:\n${descricao}`,
  ].filter(Boolean);
  const pedido = `${prompt || PROMPT_PADRAO}\n\n${detalhes.join("\n")}`;

  let resp: Response;
  try {
    resp = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-image-2.5-flare", prompt: pedido, size: "1024x1024", quality: "low", n: 1 }),
      signal: AbortSignal.timeout(150_000),
    });
  } catch (e) {
    console.error("OpenAI (rede):", e instanceof Error ? e.message : e);
    return { ok: false, erro: "A geração demorou demais ou a conexão falhou. Tente de novo." };
  }

  const corpo = await resp.text();
  if (!resp.ok) {
    console.error("OpenAI:", resp.status, corpo.slice(0, 300));
    return { ok: false, erro: mensagemDeErro(resp.status, corpo) };
  }

  try {
    const b64 = (JSON.parse(corpo) as { data?: { b64_json?: string }[] }).data?.[0]?.b64_json;
    if (!b64) throw new Error("sem imagem na resposta");
    const { bytes: otimizada } = await prepararImagem(Buffer.from(b64, "base64"), "capa-ia.png", "capa");
    return { ok: true, base64: otimizada.toString("base64"), tipo: "image/webp", nome: "capa-ia.webp" };
  } catch (e) {
    console.error("OpenAI (resposta):", e instanceof Error ? e.message : e);
    return { ok: false, erro: "A imagem veio em formato inesperado. Tente de novo." };
  }
}
