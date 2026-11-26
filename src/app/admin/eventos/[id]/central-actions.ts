"use server";

import { revalidatePath } from "next/cache";
import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { CENTRAL_BUCKET_ID, DB_ID, TABLES } from "@/lib/config";
import { exigirCentral } from "@/lib/central";
import { filtrarMencoes, IMAGENS_MAX, TIPOS_CENTRAL, type TipoCentral } from "@/lib/central-texto";
import { conferirImagem } from "@/lib/imagem";
import { arquivoOtimizado } from "@/lib/imagem-servidor";
import { pessoasMencionaveis, type LinhaCentral } from "./central-dados";

type Resultado = { ok?: string; erro?: string };

const base = { databaseId: DB_ID, tableId: TABLES.central };
const revalidar = (eventoId: string) => revalidatePath(`/admin/eventos/${eventoId}`);
/** O nome do arquivo guarda o autor: só quem enviou a foto pode usá-la num post ou descartá-la. */
const prefixo = (userId: string) => `central-${userId}-`;

async function lerPost(eventoId: string, postId: string) {
  const { tablesDB } = createAdminClient();
  const row = (await tablesDB.getRow({ ...base, rowId: postId }).catch(() => null)) as unknown as LinhaCentral | null;
  return row && row.evento_id === eventoId ? row : null;
}

async function apagarFotos(ids: string[]) {
  const { storage } = createAdminClient();
  await Promise.all(ids.map((fileId) => storage.deleteFile({ bucketId: CENTRAL_BUCKET_ID, fileId }).catch(() => {})));
}

/** Envia uma foto (já reduzida no navegador); o servidor otimiza de novo, tira EXIF/GPS e grava em WEBP. */
export async function enviarImagemCentral(eventoId: string, form: FormData): Promise<{ id?: string; erro?: string }> {
  const g = await exigirCentral(eventoId);
  if (g.erro !== undefined) return { erro: g.erro };
  const arquivo = form.get("foto");
  if (!(arquivo instanceof File) || arquivo.size === 0) return { erro: "Escolha uma imagem." };
  const invalida = conferirImagem(arquivo, "galeria");
  if (invalida) return { erro: invalida };
  try {
    const { input } = await arquivoOtimizado(arquivo, `${prefixo(g.u.id)}${Date.now().toString(36)}.webp`, "galeria");
    const novo = await createAdminClient().storage.createFile({ bucketId: CENTRAL_BUCKET_ID, fileId: ID.unique(), file: input });
    return { id: novo.$id };
  } catch (e) {
    console.error("Central (foto):", e instanceof Error ? e.message : e);
    return { erro: "Não foi possível enviar a foto. Tente de novo." };
  }
}

/** Descarta uma foto enviada mas ainda não publicada (ou removida do rascunho). */
export async function descartarImagemCentral(eventoId: string, fileId: string): Promise<Resultado> {
  const g = await exigirCentral(eventoId);
  if (g.erro !== undefined) return { erro: g.erro };
  const { storage } = createAdminClient();
  const arquivo = await storage.getFile({ bucketId: CENTRAL_BUCKET_ID, fileId }).catch(() => null);
  if (!arquivo || !arquivo.name.startsWith(prefixo(g.u.id))) return { erro: "Foto não encontrada." };
  // Se já estiver num post publicado, não apaga por aqui
  const { tablesDB } = createAdminClient();
  const usada = await tablesDB.listRows({ ...base, queries: [Query.contains("imagens", fileId), Query.limit(1)] }).catch(() => null);
  if (usada?.total) return { erro: "Esta foto já faz parte de um post." };
  await storage.deleteFile({ bucketId: CENTRAL_BUCKET_ID, fileId }).catch(() => {});
  return { ok: "Foto removida." };
}

type Entrada = { tipo: string; texto: string; imagens?: string[] };

function validarTipo(tipo: string): TipoCentral | null {
  return (TIPOS_CENTRAL as readonly string[]).includes(tipo) ? (tipo as TipoCentral) : null;
}

export async function criarPost(eventoId: string, entrada: Entrada): Promise<Resultado> {
  const g = await exigirCentral(eventoId);
  if (g.erro !== undefined) return { erro: g.erro };
  const tipo = validarTipo(String(entrada?.tipo ?? ""));
  if (!tipo) return { erro: "Escolha o tipo do post." };
  const pessoas = await pessoasMencionaveis(g.evento, g.somenteLeitura);
  const { texto, mencoes } = filtrarMencoes(String(entrada?.texto ?? ""), pessoas.map((p) => p.id));
  const pedidas = [...new Set((Array.isArray(entrada?.imagens) ? entrada.imagens : []).map(String))].slice(0, IMAGENS_MAX);
  if (!texto && !pedidas.length) return { erro: "Escreva algo ou anexe uma foto." };

  // Só aceita fotos enviadas pela própria pessoa
  const { storage, tablesDB } = createAdminClient();
  const imagens: string[] = [];
  for (const id of pedidas) {
    const arq = await storage.getFile({ bucketId: CENTRAL_BUCKET_ID, fileId: id }).catch(() => null);
    if (arq?.name.startsWith(prefixo(g.u.id))) imagens.push(id);
  }
  if (pedidas.length && !imagens.length && !texto) return { erro: "As fotos não foram encontradas. Envie de novo." };

  try {
    await tablesDB.createRow({ ...base, rowId: ID.unique(), data: { evento_id: eventoId, autor_id: g.u.id, tipo, texto, mencoes, imagens, fixado: false } });
  } catch (e) {
    console.error("Central (criar):", e instanceof Error ? e.message : e);
    const msg = e instanceof Error ? e.message : "";
    return { erro: /could not be found|not found/i.test(msg) ? "A Central ainda não foi ativada no banco de dados." : "Não foi possível publicar. Tente de novo." };
  }
  revalidar(eventoId);
  return { ok: tipo === "tarefa" ? "Tarefa criada." : "Publicado." };
}

/** Só o autor edita: texto, tipo e menções (as fotos ficam como estão). */
export async function editarPost(eventoId: string, postId: string, entrada: Entrada): Promise<Resultado> {
  const g = await exigirCentral(eventoId);
  if (g.erro !== undefined) return { erro: g.erro };
  if (g.somenteLeitura) return { erro: "Seu acesso permite publicar na Central, mas não editar publicações." };
  const post = await lerPost(eventoId, postId);
  if (!post) return { erro: "Post não encontrado." };
  if (post.autor_id !== g.u.id) return { erro: "Só quem publicou pode editar." };
  const tipo = validarTipo(String(entrada?.tipo ?? ""));
  if (!tipo) return { erro: "Escolha o tipo do post." };
  const pessoas = await pessoasMencionaveis(g.evento);
  const { texto, mencoes } = filtrarMencoes(String(entrada?.texto ?? ""), pessoas.map((p) => p.id));
  if (!texto && !(post.imagens ?? []).length) return { erro: "O post não pode ficar vazio." };
  // Deixou de ser tarefa: limpa a conclusão
  const extra = tipo !== "tarefa" ? { concluida_por: null, concluida_em: null } : {};
  await createAdminClient().tablesDB.updateRow({ ...base, rowId: postId, data: { tipo, texto, mencoes, editado_em: new Date().toISOString(), ...extra } });
  revalidar(eventoId);
  return { ok: "Post atualizado." };
}

/** O autor ou a gestão do evento exclui; as fotos saem do armazenamento junto. */
export async function excluirPost(eventoId: string, postId: string): Promise<Resultado> {
  const g = await exigirCentral(eventoId);
  if (g.erro !== undefined) return { erro: g.erro };
  if (g.somenteLeitura) return { erro: "Seu acesso permite publicar na Central, mas não excluir publicações." };
  const post = await lerPost(eventoId, postId);
  if (!post) return { erro: "Post não encontrado." };
  if (post.autor_id !== g.u.id && !g.gestao) return { erro: "Só quem publicou ou a coordenação pode excluir." };
  await createAdminClient().tablesDB.deleteRow({ ...base, rowId: postId });
  await apagarFotos(post.imagens ?? []);
  revalidar(eventoId);
  return { ok: "Post excluído." };
}

/** Qualquer pessoa da equipe do evento conclui (ou reabre) uma tarefa. */
export async function concluirTarefa(eventoId: string, postId: string, feito: boolean): Promise<Resultado> {
  const g = await exigirCentral(eventoId);
  if (g.erro !== undefined) return { erro: g.erro };
  if (g.somenteLeitura) return { erro: "Seu acesso permite publicar na Central, mas não alterar tarefas." };
  const post = await lerPost(eventoId, postId);
  if (!post || post.tipo !== "tarefa") return { erro: "Tarefa não encontrada." };
  const data = feito ? { concluida_por: g.u.id, concluida_em: new Date().toISOString() } : { concluida_por: null, concluida_em: null };
  await createAdminClient().tablesDB.updateRow({ ...base, rowId: postId, data });
  revalidar(eventoId);
  return { ok: feito ? "Tarefa concluída." : "Tarefa reaberta." };
}

/** Só a gestão do evento fixa um post no topo. */
export async function fixarPost(eventoId: string, postId: string, fixado: boolean): Promise<Resultado> {
  const g = await exigirCentral(eventoId);
  if (g.erro !== undefined) return { erro: g.erro };
  if (g.somenteLeitura) return { erro: "Seu acesso permite publicar na Central, mas não fixar publicações." };
  if (!g.gestao) return { erro: "Só a coordenação do evento pode fixar." };
  const post = await lerPost(eventoId, postId);
  if (!post) return { erro: "Post não encontrado." };
  await createAdminClient().tablesDB.updateRow({ ...base, rowId: postId, data: { fixado } });
  revalidar(eventoId);
  return { ok: fixado ? "Post fixado no topo." : "Post desafixado." };
}
