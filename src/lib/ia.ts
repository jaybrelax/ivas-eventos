import "server-only";
import sharp from "sharp";
import { prepararLogosInstituto, cacheLogosAppwrite } from "./ia-logos-instituto.mjs";
import { createAdminClient } from "./appwrite";
import { BUCKET_ID, DB_ID, IA_ROW_ID, TABLES } from "./config";

export type OpcoesImagem = { model: string; size: string; quality: string; output_format: string; background: string; moderation: string; logo_file_id: string; logo_openai_file_id: string; logo_origem_file_id: string; art_direction: string };
export const OPCOES_IMAGEM_PADRAO: OpcoesImagem = { model: "gpt-image-2.5-flare", size: "1024x1024", quality: "low", output_format: "webp", background: "auto", moderation: "auto", logo_file_id: "", logo_openai_file_id: "", logo_origem_file_id: "", art_direction: "" };
export type ConfigIA = { chave: string | null; prompt: string; opcoes: OpcoesImagem };
function opcoesSalvas(valor: unknown): OpcoesImagem {
  try { const obj = JSON.parse(typeof valor === "string" ? valor : "{}"); return { ...OPCOES_IMAGEM_PADRAO, ...obj, art_direction: typeof obj?.art_direction === "string" ? obj.art_direction : "", logo_file_id: typeof obj?.logo_file_id === "string" ? obj.logo_file_id.trim() : "" }; }
  catch { return OPCOES_IMAGEM_PADRAO; }
}

/** Chave da OpenAI e prompt personalizado. Só para código de servidor: a chave nunca vai ao navegador. */
export async function getConfigIA(): Promise<ConfigIA> {
  const { tablesDB } = createAdminClient();
  try {
    const row = await tablesDB.getRow({ databaseId: DB_ID, tableId: TABLES.instituto, rowId: IA_ROW_ID });
    const r = row as unknown as { openai_api_key?: string | null; prompt_imagem?: string | null; config_imagem?: string | null };
    return { chave: r.openai_api_key?.trim() || null, prompt: r.prompt_imagem?.trim() ?? "", opcoes: opcoesSalvas(r.config_imagem) };
  } catch {
    return { chave: null, prompt: "", opcoes: OPCOES_IMAGEM_PADRAO };
  }
}

/** Só os fins de uma chave, para mostrar “sk-…a1b2” sem expor o valor. */
export function mascararChave(chave: string | null) {
  if (!chave) return null;
  return `${chave.slice(0, 3)}…${chave.slice(-4)}`;
}

/** Lê a logo no servidor e rasteriza SVG, preservando a transparência. */
export async function logoParaIA(fileId: string): Promise<Blob> {
  const { storage } = createAdminClient();
  const arquivo = await storage.getFile({ bucketId: BUCKET_ID, fileId });
  if (arquivo.sizeOriginal > 10 * 1024 * 1024 || !/\.(png|jpe?g|webp|svg)$/i.test(arquivo.name)) throw new Error("Logo inválida. Use PNG, JPG, WebP ou SVG de até 10 MB.");
  const bytes = await storage.getFileView({ bucketId: BUCKET_ID, fileId });
  const png = await sharp(Buffer.from(bytes), { limitInputPixels: 40_000_000 }).rotate().resize({ width: 2048, height: 2048, fit: "inside", withoutEnlargement: true }).png().toBuffer();
  return new Blob([new Uint8Array(png)], { type: "image/png" });
}

/** Consulta metadados sem reenviar a imagem. */
export async function verificarLogoOpenAI(chave: string, fileId: string) {
  if (!/^file-[A-Za-z0-9_-]{1,190}$/.test(fileId)) throw new Error("Informe um File ID da OpenAI que comece com file-.");
  const resposta = await fetch("https://api.openai.com/v1/files/" + encodeURIComponent(fileId), { headers: { Authorization: "Bearer " + chave }, signal: AbortSignal.timeout(20_000), cache: "no-store" });
  if (!resposta.ok) throw new Error("Não foi possível acessar a logo na OpenAI. Confira o File ID e se a chave tem acesso ao mesmo projeto.");
  const arquivo = await resposta.json();
  if (!/\.(png|jpe?g|webp)$/i.test(arquivo.filename || "") || arquivo.bytes > 10 * 1024 * 1024 || (arquivo.expires_at && arquivo.expires_at * 1000 <= Date.now())) throw new Error("A logo na OpenAI deve ser PNG, JPG ou WebP de até 10 MB e não pode estar expirada.");
}

export async function enviarLogoOpenAI(chave: string, appwriteId: string): Promise<string> {
  const form = new FormData();
  form.set("purpose", "user_data");
  form.set("file", await logoParaIA(appwriteId), "ivas_logo.png");
  const resposta = await fetch("https://api.openai.com/v1/files", { method: "POST", headers: { Authorization: "Bearer " + chave }, body: form, signal: AbortSignal.timeout(60_000) });
  if (!resposta.ok) throw new Error("Não foi possível enviar a logo à OpenAI. Confira a chave e tente novamente.");
  const arquivo = await resposta.json();
  if (typeof arquivo.id !== "string" || !/^file-[A-Za-z0-9_-]+$/.test(arquivo.id)) throw new Error("A OpenAI não retornou um File ID válido.");
  return arquivo.id;
}

/** Sincroniza apenas as versões citadas no prompt; o cache fica em linhas próprias do banco. */
export async function prepararLogosIA(prompt: string, chave: string, manualId: string) {
  const { tablesDB, storage } = createAdminClient();
  return prepararLogosInstituto(prompt, chave, manualId, {
    ...cacheLogosAppwrite(tablesDB),
    obterArquivo: (fileId: string) => storage.getFile({ bucketId: BUCKET_ID, fileId }),
    enviar: (fileId: string) => enviarLogoOpenAI(chave, fileId),
  });
}
