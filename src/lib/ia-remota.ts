import "server-only";
import { Client, ExecutionMethod, ExecutionStatus, Functions } from "node-appwrite";
import { createAdminClient, createSessionClient } from "./appwrite";
import { BUCKET_ID } from "./config";
import { prepararImagem } from "./imagem-servidor";

/**
 * Geração de imagens pela Appwrite Function compartilhada (functions/gerar-imagem), a mesma para
 * Eventos e Guarnição. A função lê a chave, o prompt e as logos no banco; o navegador nunca vê a chave.
 * Sem APPWRITE_FUNCTION_GERAR_IMAGEM_ID configurado, devolve null e o app gera localmente como antes.
 */
export type ResultadoImagemRemota = { ok: true; base64: string; tipo: string; nome: string } | { ok: false; erro: string };

export type EntradaGeracao = {
  titulo: string | null;
  descricao: string | null;
  /** Nome do tipo do evento (não o ID). */
  tipo?: string | null;
  data?: string | null;
  horaInicio?: string | null;
  numeroGeral?: number | string | null;
  enderecoId?: string | null;
  enderecoLivre?: string | null;
  ajustes?: string;
  /** Capa atual do evento, enviada como referência quando se quer ajustá-la. */
  capaFileId?: string;
};

const ESPERA_MAXIMA_MS = 170_000;
const INTERVALO_MS = 2_000;
const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function funcaoImagemId() {
  return process.env.APPWRITE_FUNCTION_GERAR_IMAGEM_ID?.trim() || null;
}

/** A função registra "IA_ERRO {json}" no log: o Appwrite não guarda o corpo de execuções assíncronas. */
export function erroDoLog(logs: string): string | null {
  const m = /IA_ERRO (\{.*\})/.exec(logs ?? "");
  if (!m) return null;
  try {
    const erro = (JSON.parse(m[1]) as { erro?: unknown }).erro;
    return typeof erro === "string" && erro ? erro : null;
  } catch {
    return null;
  }
}

export async function gerarCapaViaFuncao(entrada: EntradaGeracao): Promise<ResultadoImagemRemota | null> {
  const functionId = funcaoImagemId();
  if (!functionId) return null;

  const sessao = await createSessionClient();
  if (!sessao) return { ok: false, erro: "Sua sessão expirou. Entre novamente para gerar a imagem." };

  // O token vale poucos minutos e fica preso à sessão atual: a função confere quem é e se tem permissão.
  let jwt: string;
  try {
    const atual = await sessao.account.getSession({ sessionId: "current" });
    jwt = (await createAdminClient().users.createJWT({ userId: atual.userId, sessionId: atual.$id, duration: 600 })).jwt;
  } catch {
    return { ok: false, erro: "Sua sessão expirou. Entre novamente para gerar a imagem." };
  }
  const cliente = new Client().setEndpoint(process.env.APPWRITE_ENDPOINT!).setProject(process.env.APPWRITE_PROJECT_ID!).setJWT(jwt);
  const funcoes = new Functions(cliente);
  const { storage } = createAdminClient();

  let execucao;
  try {
    execucao = await funcoes.createExecution({ functionId, body: JSON.stringify(entrada), async: true, xpath: "/", method: ExecutionMethod.POST });
    const limite = Date.now() + ESPERA_MAXIMA_MS;
    while ((execucao.status === ExecutionStatus.Waiting || execucao.status === ExecutionStatus.Processing || execucao.status === ExecutionStatus.Scheduled) && Date.now() < limite) {
      await pausa(INTERVALO_MS);
      execucao = await funcoes.getExecution({ functionId, executionId: execucao.$id });
    }
  } catch (e) {
    console.error("Função de imagem (execução):", e instanceof Error ? e.message : e);
    return { ok: false, erro: "Não foi possível iniciar a geração da imagem. Tente de novo." };
  }

  if (execucao.status === ExecutionStatus.Waiting || execucao.status === ExecutionStatus.Processing || execucao.status === ExecutionStatus.Scheduled) {
    return { ok: false, erro: "A geração demorou demais. Tente de novo em instantes." };
  }
  if (execucao.status !== ExecutionStatus.Completed || execucao.responseStatusCode !== 200) {
    console.error("Função de imagem:", execucao.status, execucao.responseStatusCode, (execucao.errors ?? "").slice(0, 300));
    return { ok: false, erro: erroDoLog(execucao.logs) ?? "Não foi possível gerar a imagem. Tente de novo." };
  }

  // O resultado é um arquivo temporário (ID = ID da execução) no bucket privado.
  const fileId = execucao.$id;
  try {
    const arquivo = await storage.getFile({ bucketId: BUCKET_ID, fileId });
    const bruto = Buffer.from(await storage.getFileView({ bucketId: BUCKET_ID, fileId }));
    const extensao = /\.([a-z0-9]+)$/i.exec(arquivo.name)?.[1] ?? "webp";
    const { bytes } = await prepararImagem(bruto, `capa-ia.${extensao}`, "capa");
    return { ok: true, base64: bytes.toString("base64"), tipo: "image/webp", nome: "capa-ia.webp" };
  } catch (e) {
    console.error("Função de imagem (resultado):", e instanceof Error ? e.message : e);
    return { ok: false, erro: "A imagem veio em formato inesperado. Tente de novo." };
  } finally {
    await storage.deleteFile({ bucketId: BUCKET_ID, fileId }).catch(() => {});
  }
}
