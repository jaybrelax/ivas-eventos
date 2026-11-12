import "server-only";
import sharp from "sharp";
import { createAdminClient } from "./appwrite";
import { BUCKET_ID } from "./config";
import type { Evento } from "./types";

import { prepararImagem } from "@/lib/imagem-servidor";
import { TABLES } from "@/lib/config";
import type { Endereco } from "@/lib/types";
import { montarPromptIA, dataParaPrompt, horarioParaPrompt } from "@/lib/ia-prompt";
import { listarTipos, listar } from "@/lib/data";
import { getConfigIA, prepararLogosIA } from "@/lib/ia";

export type ResultadoImagemIA = { ok: true; base64: string; tipo: string; nome: string } | { ok: false; erro: string };

const PROMPT_PADRAO =
  "Ilustração artística e elegante para divulgar um evento espiritual, com luz suave e cores harmoniosas. Sem texto, letras ou logotipos.";

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
/** O chamador deve autorizar o editor e carregar o evento no servidor. */
export async function gerarImagemRitual(evento: Evento, ajustes = "", usarAtual = false): Promise<ResultadoImagemIA> {
  const entrada = { titulo: evento.titulo, descricao: evento.descricao, tipoId: evento.tipo_id, data: evento.data, horaInicio: evento.hora_inicio, numeroGeral: evento.ritual_numero_geral, enderecoId: evento.endereco_id, enderecoLivre: evento.endereco_livre };
  const { chave, prompt, opcoes } = await getConfigIA();
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
  const end = entrada.enderecoId && entrada.enderecoId !== "__livre" ? (await listar<Endereco>(TABLES.enderecos)).find(e => e.$id === entrada.enderecoId) : null;
  const local = end ? [end.apelido, end.endereco, end.cidade].filter(Boolean).join(" — ") : String(entrada.enderecoLivre ?? "").trim().slice(0, 500);
  const numero = Number(entrada.numeroGeral);
  let comando: string;
  let images: { file_id: string }[] = [];
  const valores = { art_direction: opcoes.art_direction, titulo_ritual: titulo, data_ritual: dataParaPrompt(String(entrada.data ?? "")), horario_ritual: horarioParaPrompt(String(entrada.horaInicio ?? "")), numero_ritual: Number.isSafeInteger(numero) && numero > 0 ? String(numero) : "", local_ritual: local };
  try {
    montarPromptIA(prompt, valores); // Valida os dados antes de sincronizar qualquer arquivo.
    const logos = await prepararLogosIA(prompt, chave, opcoes.logo_openai_file_id);
    comando = montarPromptIA(logos.prompt, valores);
    images = logos.images;
  } catch (e) { return { ok: false, erro: e instanceof Error ? e.message : "Não foi possível preparar os dados e as logos do ritual." }; }
  const usaLogo = images.length > 0;
  const referencias: ({ file_id: string } | { image_url: string })[] = [...images];
  if (usarAtual && evento.capa_file_id) {
    try {
      const { storage } = createAdminClient();
      const atual = await storage.getFileView({ bucketId: BUCKET_ID, fileId: evento.capa_file_id });
      const png = await sharp(Buffer.from(atual), { limitInputPixels: 40_000_000 }).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).png().toBuffer();
      referencias.push({ image_url: `data:image/png;base64,${png.toString("base64")}` });
    } catch { return { ok: false, erro: "Não foi possível ler a imagem atual. Tente gerar uma nova imagem sem usá-la como referência." }; }
  }
  const pedido = (comando || PROMPT_PADRAO) + "\n\n" + detalhes.join("\n") + (usaLogo ? "\nIncorpore as logos fornecidas, preservando sua identidade visual e seguindo a posição descrita." : "") + (usarAtual && evento.capa_file_id ? "\nA última imagem de referência é a capa atual do evento. Use-a como base para a edição." : "") + (ajustes.trim() ? "\nAjustes solicitados:\n" + ajustes.trim().slice(0, 2000) : "");
  if (pedido.length > 32000) return { ok: false, erro: "O prompt final ficou muito longo. Reduza a estrutura ou a direção artística nas configurações." };
  const parametros = { model: opcoes.model, prompt: pedido, size: opcoes.size, quality: opcoes.quality, output_format: opcoes.output_format, background: opcoes.background, moderation: opcoes.moderation, n: 1 };
  const corpoPedido = JSON.stringify({ ...parametros, ...(referencias.length ? { images: referencias } : {}) });

  let resp: Response;
  try {
    resp = await fetch(`https://api.openai.com/v1/images/${referencias.length ? "edits" : "generations"}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
      body: corpoPedido,
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
    const { bytes: otimizada } = await prepararImagem(Buffer.from(b64, "base64"), `capa-ia.${opcoes.output_format}`, "capa");
    return { ok: true, base64: otimizada.toString("base64"), tipo: "image/webp", nome: "capa-ia.webp" };
  } catch (e) {
    console.error("OpenAI (resposta):", e instanceof Error ? e.message : e);
    return { ok: false, erro: "A imagem veio em formato inesperado. Tente de novo." };
  }
}
