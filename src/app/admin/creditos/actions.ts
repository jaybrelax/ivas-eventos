"use server";

import { revalidatePath } from "next/cache";
import { ID } from "node-appwrite";
import { arquivoOtimizado } from "@/lib/imagem-servidor";
import { conferirImagem } from "@/lib/imagem";
import { exigir } from "@/lib/auth";
import { COMPROVANTES_BUCKET_ID, PODE } from "@/lib/config";
import {
  cancelarPacote, confirmarPacote, editarPacote, excluirPacote, lancarPacote, listarPlanos, quitarDebito, type ResultadoCredito,
} from "@/lib/creditos";
import type { SituacaoPacote } from "@/lib/types";
import { lerQuantidade } from "@/lib/creditos-regras";
import { createAdminClient } from "@/lib/appwrite";
import { lerValor } from "@/lib/pagamento-regras";

function revalidar() {
  revalidatePath("/admin/creditos");
  revalidatePath("/admin/participantes", "layout");
  revalidatePath("/admin/eventos", "layout");
  revalidatePath("/admin/pagamentos");
  revalidatePath("/minha-conta");
}

/** Envolve a ação: confere a permissão da coordenação, trata erro inesperado e atualiza as telas. */
async function executar(fn: (porId: string) => Promise<ResultadoCredito>): Promise<ResultadoCredito> {
  const eu = await exigir(PODE.editarEventos);
  try {
    const r = await fn(eu.id);
    revalidar();
    return r;
  } catch (e) {
    console.error("Créditos:", e instanceof Error ? e.message : e);
    return { erro: "Não foi possível concluir agora. Tente de novo." };
  }
}

export async function confirmarPacoteAction(pacoteId: string) {
  return executar((por) => confirmarPacote(por, String(pacoteId)));
}

export async function cancelarPacoteAction(pacoteId: string) {
  return executar((por) => cancelarPacote(por, String(pacoteId)));
}

/** Edita o pacote: nome, valor, observação, número de créditos, situação do pagamento e comprovante. */
export async function editarPacoteAction(pacoteId: string, form: FormData) {
  return executar(async (por) => {
    const q = lerQuantidade(form.get("quantidade"));
    if ("erro" in q) return { erro: q.erro };
    const situacao = String(form.get("situacao") ?? "");
    if (!["pendente", "informado", "pago", "cancelado"].includes(situacao)) return { erro: "Situação inválida." };
    const nome = String(form.get("nome") ?? "").trim().slice(0, 80);
    if (!nome) return { erro: "Dê um nome ao pacote." };
    const v = lerValor(form.get("valor"));
    if ("erro" in v) return { erro: v.erro };
    const observacao = String(form.get("observacao") ?? "").trim().slice(0, 500) || null;

    // Comprovante: arquivo novo troca o atual; "remover" apaga
    let comprovanteFileId: string | null | undefined;
    const { storage } = createAdminClient();
    const arquivo = form.get("comprovante");
    if (arquivo instanceof File && arquivo.size > 0) {
      const invalida = conferirImagem(arquivo, "comprovante");
      if (invalida) return { erro: invalida };
      try {
        comprovanteFileId = (await storage.createFile({
          bucketId: COMPROVANTES_BUCKET_ID, fileId: ID.unique(), file: (await arquivoOtimizado(arquivo, arquivo.name, "comprovante")).input,
        })).$id;
      } catch (e) {
        console.error("Comprovante do pacote:", e instanceof Error ? e.message : e);
        return { erro: "Não foi possível enviar o comprovante. Use PNG, JPG ou WEBP." };
      }
    } else if (form.get("remover_comprovante") === "on") comprovanteFileId = null;

    const r = await editarPacote(por, String(pacoteId), { quantidade: q.quantidade, situacao: situacao as SituacaoPacote, nome, valor: v.valor, observacao, comprovanteFileId });
    // Não gravou: o arquivo recém-enviado não fica órfão
    if (r.erro && typeof comprovanteFileId === "string") await storage.deleteFile({ bucketId: COMPROVANTES_BUCKET_ID, fileId: comprovanteFileId }).catch(() => {});
    return r;
  });
}

export async function excluirPacoteAction(pacoteId: string) {
  return executar((por) => excluirPacote(por, String(pacoteId)));
}

/** Quita um débito (ritual que a pessoa já frequentou) com um crédito dela. */
export async function quitarDebitoAction(inscricaoId: string) {
  return executar((por) => quitarDebito(por, String(inscricaoId)));
}

/** Lança um pacote para uma pessoa (venda feita fora do app). Marcado como pago, já libera os créditos. */
export async function lancarPacoteAction(form: FormData): Promise<ResultadoCredito> {
  return executar(async (por) => {
    const usuarioId = String(form.get("usuario_id") ?? "");
    if (!usuarioId) return { erro: "Escolha a pessoa." };
    const { users } = createAdminClient();
    const conta = await users.get({ userId: usuarioId }).catch(() => null);
    if (!conta) return { erro: "Pessoa não encontrada." };

    const planoId = String(form.get("plano_id") ?? "");
    let nome = String(form.get("nome") ?? "").trim().slice(0, 80);
    let quantidade: number;
    let valor: number | null;
    if (planoId && planoId !== "personalizado") {
      const plano = (await listarPlanos()).find((p) => p.$id === planoId);
      if (!plano) return { erro: "Pacote não encontrado." };
      nome = plano.nome;
      quantidade = plano.quantidade;
      valor = plano.valor;
    } else {
      if (!nome) return { erro: "Dê um nome ao pacote." };
      const q = lerQuantidade(form.get("quantidade"));
      if ("erro" in q) return { erro: q.erro };
      const v = lerValor(form.get("valor"));
      if ("erro" in v) return { erro: v.erro };
      quantidade = q.quantidade;
      valor = v.valor;
    }
    const observacao = String(form.get("observacao") ?? "").trim().slice(0, 500) || null;
    const pago = form.get("pago") === "on";
    const r = await lancarPacote(por, usuarioId, { planoId: planoId && planoId !== "personalizado" ? planoId : null, nome, quantidade, valor, observacao }, pago);
    return { ok: r.ok, erro: r.erro };
  });
}
