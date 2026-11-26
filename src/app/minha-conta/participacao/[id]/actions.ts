"use server";

import { AppwriteException } from "node-appwrite";
import { revalidatePath } from "next/cache";
import { getUsuario } from "@/lib/auth";
import { createAdminClient } from "@/lib/appwrite";
import { DB_ID, TABLES } from "@/lib/config";
import { avaliacaoDaInscricao, inscricaoDoDono, podeDepor } from "@/lib/depoimentos";
import { validarNotas, validarTexto, type Notas } from "@/lib/depoimentos-regras";

async function contextoDono(inscricaoId: string) {
  const usuario = await getUsuario();
  if (!usuario) return { erro: "Entre na sua conta para continuar." } as const;
  const inscricao = await inscricaoDoDono(inscricaoId, usuario.id);
  if (!inscricao || !(await podeDepor(inscricao))) return { erro: "Esta participação não permite alterações." } as const;
  return { usuario, inscricao } as const;
}

export async function enviarDepoimento(inscricaoId: string, envioId: string, textoBruto: string, notasBrutas: Notas | null) {
  const dono = await contextoDono(inscricaoId);
  if ("erro" in dono) return dono;
  const { usuario, inscricao } = dono;
  const texto = validarTexto(textoBruto);
  if (!texto) return { erro: "Escreva entre 10 e 2.000 caracteres." };
  if (!/^[a-zA-Z0-9._-]{1,36}$/.test(envioId)) return { erro: "Identificador do envio inválido." };

  const { tablesDB } = createAdminClient();
  const base = { databaseId: DB_ID };
  try {
    const avaliacao = await avaliacaoDaInscricao(inscricaoId);
    if (!avaliacao) {
      const notas = validarNotas(notasBrutas);
      if (!notas) return { erro: "Avalie os cinco aspectos de 1 a 10, em intervalos de 0,5." };
      try {
        await tablesDB.createRow({ ...base, tableId: TABLES.avaliacoesRitual, rowId: inscricaoId, data: { evento_id: inscricao.evento_id, inscricao_id: inscricaoId, autor_id: usuario.id, ...notas } });
      } catch (e) {
        if (!(e instanceof AppwriteException && e.code === 409)) throw e;
      }
    }
    try {
      await tablesDB.createRow({ ...base, tableId: TABLES.depoimentosRitual, rowId: envioId, data: { evento_id: inscricao.evento_id, inscricao_id: inscricaoId, autor_id: usuario.id, texto } });
    } catch (e) {
      if (!(e instanceof AppwriteException && e.code === 409)) throw e;
      const existente = await tablesDB.getRow({ ...base, tableId: TABLES.depoimentosRitual, rowId: envioId }) as unknown as { autor_id: string; inscricao_id: string };
      if (existente.autor_id !== usuario.id || existente.inscricao_id !== inscricaoId) return { erro: "Identificador de envio já utilizado." };
    }
    revalidatePath(`/minha-conta/participacao/${inscricaoId}`);
    revalidatePath(`/admin/eventos/${inscricao.evento_id}`);
    return { ok: true };
  } catch (e) {
    console.error("Enviar depoimento:", e);
    return { erro: "Não foi possível enviar. Tente novamente." };
  }
}

export async function atualizarAvaliacao(inscricaoId: string, notasBrutas: Notas) {
  const dono = await contextoDono(inscricaoId);
  if ("erro" in dono) return dono;
  const notas = validarNotas(notasBrutas);
  if (!notas) return { erro: "Use notas de 1 a 10, em intervalos de 0,5." };
  const { tablesDB } = createAdminClient();
  try {
    const atual = await tablesDB.getRow({ databaseId: DB_ID, tableId: TABLES.avaliacoesRitual, rowId: inscricaoId }) as unknown as { autor_id: string };
    if (atual.autor_id !== dono.usuario.id) return { erro: "Esta avaliação não pertence a você." };
    await tablesDB.updateRow({ databaseId: DB_ID, tableId: TABLES.avaliacoesRitual, rowId: inscricaoId, data: notas });
    revalidatePath(`/minha-conta/participacao/${inscricaoId}`);
    revalidatePath(`/admin/eventos/${dono.inscricao.evento_id}`);
    return { ok: true };
  } catch (e) {
    console.error("Atualizar avaliação:", e);
    return { erro: "Não foi possível atualizar a avaliação." };
  }
}

export async function excluirAvaliacao(inscricaoId: string) {
  const dono = await contextoDono(inscricaoId);
  if ("erro" in dono) return dono;
  const { tablesDB } = createAdminClient();
  try {
    const atual = await tablesDB.getRow({ databaseId: DB_ID, tableId: TABLES.avaliacoesRitual, rowId: inscricaoId }) as unknown as { autor_id: string };
    if (atual.autor_id !== dono.usuario.id) return { erro: "Esta avaliação não pertence a você." };
    await tablesDB.deleteRow({ databaseId: DB_ID, tableId: TABLES.avaliacoesRitual, rowId: inscricaoId });
    revalidatePath(`/minha-conta/participacao/${inscricaoId}`);
    revalidatePath(`/admin/eventos/${dono.inscricao.evento_id}`);
    return { ok: true };
  } catch (e) {
    console.error("Excluir avaliação:", e);
    return { erro: "Não foi possível excluir a avaliação." };
  }
}

export async function atualizarTextoDepoimento(inscricaoId: string, depoimentoId: string, textoBruto: string) {
  const dono = await contextoDono(inscricaoId);
  if ("erro" in dono) return dono;
  const texto = validarTexto(textoBruto);
  if (!texto) return { erro: "Escreva entre 10 e 2.000 caracteres." };
  const { tablesDB } = createAdminClient();
  try {
    const atual = await tablesDB.getRow({ databaseId: DB_ID, tableId: TABLES.depoimentosRitual, rowId: depoimentoId }) as unknown as { autor_id: string; inscricao_id: string };
    if (atual.autor_id !== dono.usuario.id || atual.inscricao_id !== inscricaoId) return { erro: "Este depoimento não pertence a você." };
    await tablesDB.updateRow({ databaseId: DB_ID, tableId: TABLES.depoimentosRitual, rowId: depoimentoId, data: { texto } });
    revalidatePath(`/minha-conta/participacao/${inscricaoId}`);
    revalidatePath(`/admin/eventos/${dono.inscricao.evento_id}`);
    return { ok: true };
  } catch (e) {
    console.error("Atualizar depoimento:", e);
    return { erro: "Não foi possível atualizar o depoimento." };
  }
}

export async function excluirTextoDepoimento(inscricaoId: string, depoimentoId: string) {
  const dono = await contextoDono(inscricaoId);
  if ("erro" in dono) return dono;
  const { tablesDB } = createAdminClient();
  try {
    const atual = await tablesDB.getRow({ databaseId: DB_ID, tableId: TABLES.depoimentosRitual, rowId: depoimentoId }) as unknown as { autor_id: string; inscricao_id: string };
    if (atual.autor_id !== dono.usuario.id || atual.inscricao_id !== inscricaoId) return { erro: "Este depoimento não pertence a você." };
    await tablesDB.deleteRow({ databaseId: DB_ID, tableId: TABLES.depoimentosRitual, rowId: depoimentoId });
    revalidatePath(`/minha-conta/participacao/${inscricaoId}`);
    revalidatePath(`/admin/eventos/${dono.inscricao.evento_id}`);
    return { ok: true };
  } catch (e) {
    console.error("Excluir depoimento:", e);
    return { erro: "Não foi possível excluir o depoimento." };
  }
}
