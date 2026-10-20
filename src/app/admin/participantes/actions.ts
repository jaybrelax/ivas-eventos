"use server";

import { revalidatePath } from "next/cache";
import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { exigir } from "@/lib/auth";
import { COMPROVANTES_BUCKET_ID, DB_ID, PODE, TABLES } from "@/lib/config";
import { getEvento, listar } from "@/lib/data";
import { reorganizarInscricoes } from "@/lib/inscricoes";
import type { Inscricao } from "@/lib/types";
import { apagarFotoDe, ehParticipante, salvarContato } from "@/lib/usuarios";

/**
 * Exclui o participante da plataforma: a conta, a foto, as inscrições e os comprovantes.
 * As vagas que ele ocupava vão para o próximo da lista de espera.
 */
export async function excluirParticipante(userId: string): Promise<{ ok?: string; erro?: string }> {
  const eu = await exigir(["admin"]);
  const { users, tablesDB, storage } = createAdminClient();
  try {
    const conta = await users.get({ userId });
    if (!ehParticipante(conta.labels)) return { erro: "Só é possível excluir aqui contas de participante." };

    const inscricoes = await listar<Inscricao>(TABLES.inscricoes, [Query.equal("usuario_id", userId)]);
    const eventosAfetados = new Set(inscricoes.filter((i) => i.situacao !== "cancelada").map((i) => i.evento_id));
    for (const i of inscricoes) {
      if (i.comprovante_file_id) await storage.deleteFile({ bucketId: COMPROVANTES_BUCKET_ID, fileId: i.comprovante_file_id }).catch(() => {});
      await tablesDB.deleteRow({ databaseId: DB_ID, tableId: TABLES.inscricoes, rowId: i.$id });
    }
    for (const id of eventosAfetados) {
      const evento = await getEvento(id);
      if (evento) await reorganizarInscricoes(evento, eu.id);
    }

    await apagarFotoDe(userId);
    await users.delete({ userId });
  } catch (e) {
    console.error("Excluir participante:", e instanceof Error ? e.message : e);
    return { erro: "Não foi possível excluir agora. Tente de novo." };
  }
  revalidatePath("/admin", "layout");
  revalidatePath("/eventos", "layout");
  return { ok: "Participante excluído." };
}

export type ResultadoEdicao = { ok?: string; erro?: string } | undefined;

/** Coordenação corrige os dados de um participante (nome, e-mail, contato, documentos e o que ele contou). */
export async function editarParticipante(userId: string, _: ResultadoEdicao, form: FormData): Promise<ResultadoEdicao> {
  await exigir(PODE.editarEventos);
  const nome = String(form.get("nome") ?? "").trim().replace(/\s+/g, " ").slice(0, 128);
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!nome) return { erro: "Informe o nome." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { erro: "Informe um e-mail válido." };

  const { users } = createAdminClient();
  try {
    const conta = await users.get({ userId });
    if (!ehParticipante(conta.labels)) return { erro: "Essa conta não é de participante." };
    if (conta.name !== nome) await users.updateName({ userId, name: nome });
    if (conta.email.toLowerCase() !== email) {
      try {
        await users.updateEmail({ userId, email });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "";
        return { erro: msg.includes("already") || msg.includes("exists") ? "Já existe outra conta com esse e-mail." : "Não foi possível trocar o e-mail." };
      }
    }
  } catch (e) {
    console.error("Editar participante:", e instanceof Error ? e.message : e);
    return { erro: "Não foi possível salvar agora. Tente de novo." };
  }

  const r = await salvarContato(userId, form);
  if (r.erro) return { erro: r.erro };
  revalidatePath("/admin/participantes", "layout");
  return { ok: "Dados atualizados." };
}
