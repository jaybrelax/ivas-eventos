"use server";

import { revalidatePath } from "next/cache";
import { ID } from "node-appwrite";
import { arquivoOtimizado } from "@/lib/imagem-servidor";
import { createAdminClient } from "@/lib/appwrite";
import { exigirSessao } from "@/lib/auth";
import { COMPROVANTES_BUCKET_ID } from "@/lib/config";
import { getEvento, getInstituto, listarTipos } from "@/lib/data";
import { conferirImagem } from "@/lib/imagem";
import { anexarComprovantePagamento, cancelarInscricao, contribuirNaHora, informarPagamento, inscrever, validarAnexoComprovante, validarInscricaoParaPagamento, type Resultado } from "@/lib/inscricoes";
import { usarBonusAniversario } from "@/lib/bonus-aniversario";
import { usarCreditoNaInscricao } from "@/lib/creditos";
import { lerValor } from "@/lib/pagamento-regras";

async function contexto(eventoId: string) {
  const [evento, tipos] = await Promise.all([getEvento(eventoId), listarTipos()]);
  return { evento, tipo: evento ? tipos.find((t) => t.$id === evento.tipo_id) : undefined };
}

function revalidar(eventoId: string, numero?: number | null) {
  revalidatePath(`/eventos/${eventoId}`);
  if (numero) revalidatePath(`/ritual/${numero}`);
  revalidatePath("/minha-conta");
  revalidatePath(`/admin/eventos/${eventoId}`);
}

/** A pessoa logada (equipe ou participante) confirma presença num evento aberto ao público. */
export async function confirmarParticipacaoAction(eventoId: string, usarCredito = true): Promise<Resultado> {
  const u = await exigirSessao(`/eventos/${eventoId}`);
  const { evento, tipo } = await contexto(eventoId);
  if (!evento) return { erro: "Evento não encontrado." };
  const r = await inscrever(evento, tipo, u.id, usarCredito);
  revalidar(eventoId, evento.ritual_numero_geral);
  return r;
}

/** Cancela a própria inscrição (até 4 h antes do início). */
export async function cancelarInscricaoAction(eventoId: string): Promise<Resultado> {
  const u = await exigirSessao(`/eventos/${eventoId}`);
  const { evento } = await contexto(eventoId);
  if (!evento) return { erro: "Evento não encontrado." };
  const r = await cancelarInscricao(evento, u.id);
  revalidar(eventoId, evento.ritual_numero_geral);
  return r;
}

/** Avisa que já contribuiu (comprovante opcional, reduzido no navegador antes do envio). */
export async function informarPagamentoAction(eventoId: string, inscricaoId: string, form: FormData): Promise<Resultado> {
  const u = await exigirSessao(`/eventos/${eventoId}`);
  const { evento, tipo } = await contexto(eventoId);
  if (!evento || !tipo?.conta_como_ritual) return { erro: "Este evento não aceita contribuição por esta etapa." };
  const valida = await validarInscricaoParaPagamento(inscricaoId, u.id, eventoId);
  if ("erro" in valida) return valida;
  // O valor vem da configuração do Instituto, não do navegador: o participante não escolhe quanto "pagou".
  const lido = lerValor((await getInstituto()).valor_contribuicao);
  if ("erro" in lido || lido.valor === null) return { erro: "A coordenação ainda não configurou o valor da contribuição." };
  const valor = lido.valor;

  let comprovanteFileId: string | null = null;
  const arquivo = form.get("comprovante");
  if (arquivo instanceof File && arquivo.size > 0) {
    const invalida = conferirImagem(arquivo, "comprovante");
    if (invalida) return { erro: invalida };
    try {
      const { storage } = createAdminClient();
      const novo = await storage.createFile({
        bucketId: COMPROVANTES_BUCKET_ID, fileId: ID.unique(), file: (await arquivoOtimizado(arquivo, arquivo.name, "comprovante")).input,
      });
      comprovanteFileId = novo.$id;
    } catch (e) {
      console.error("Comprovante:", e instanceof Error ? e.message : e);
      return { erro: "Não foi possível enviar o comprovante. Use PNG, JPG ou WEBP." };
    }
  }

  const r = await informarPagamento(inscricaoId, u.id, valor, comprovanteFileId);
  if (r.erro && comprovanteFileId) {
    const { storage } = createAdminClient();
    await storage.deleteFile({ bucketId: COMPROVANTES_BUCKET_ID, fileId: comprovanteFileId }).catch(() => {});
  }
  revalidar(eventoId, evento.ritual_numero_geral);
  revalidatePath(`/minha-conta/participacao/${inscricaoId}`);
  return r;
}

/** Anexa um comprovante à própria inscrição; se o Pix ainda não tinha sido informado, registra o aviso. */
export async function anexarComprovanteAction(eventoId: string, inscricaoId: string, form: FormData): Promise<Resultado> {
  const u = await exigirSessao(`/eventos/${eventoId}`);
  const { evento, tipo } = await contexto(eventoId);
  if (!evento || !tipo?.conta_como_ritual) return { erro: "Este evento não aceita contribuição por esta etapa." };
  const valida = await validarAnexoComprovante(inscricaoId, u.id, eventoId);
  if ("erro" in valida) return valida;

  const arquivo = form.get("comprovante");
  if (!(arquivo instanceof File) || arquivo.size === 0) return { erro: "Escolha uma imagem do comprovante antes de enviar." };
  const invalida = conferirImagem(arquivo, "comprovante");
  if (invalida) return { erro: invalida };
  let valor: number | null = valida.inscricao.pagamento === "informado" ? valida.inscricao.valor : null;
  if (valida.inscricao.pagamento !== "informado") {
    const lido = lerValor((await getInstituto()).valor_contribuicao);
    if ("erro" in lido || lido.valor === null) return { erro: "A coordenação ainda não configurou o valor da contribuição." };
    valor = lido.valor;
  }

  let comprovanteFileId: string | null = null;
  try {
    const { storage } = createAdminClient();
    const novo = await storage.createFile({
      bucketId: COMPROVANTES_BUCKET_ID,
      fileId: ID.unique(),
      file: (await arquivoOtimizado(arquivo, arquivo.name, "comprovante")).input,
    });
    comprovanteFileId = novo.$id;
  } catch (e) {
    console.error("Comprovante:", e instanceof Error ? e.message : e);
    return { erro: "Não foi possível enviar o comprovante. Use PNG, JPG ou WEBP." };
  }

  const r = await anexarComprovantePagamento(inscricaoId, u.id, comprovanteFileId, valor);
  if (r.erro) {
    const { storage } = createAdminClient();
    await storage.deleteFile({ bucketId: COMPROVANTES_BUCKET_ID, fileId: comprovanteFileId }).catch(() => {});
  }
  revalidar(eventoId, evento.ritual_numero_geral);
  revalidatePath(`/minha-conta/participacao/${inscricaoId}`);
  return r;
}

/** "Vou contribuir na hora": avisa que a contribuição será feita no dia do ritual (ou desfaz o aviso). */
export async function contribuirNaHoraAction(eventoId: string, inscricaoId: string, desfazer = false): Promise<Resultado> {
  const u = await exigirSessao(`/eventos/${eventoId}`);
  const r = await contribuirNaHora(inscricaoId, u.id, desfazer);
  revalidar(eventoId);
  return r;
}

/** Aplica o bônus anual do próprio participante. Não entra em pacotes ou relatórios financeiros. */
export async function usarBonusAniversarioAction(eventoId: string, inscricaoId: string): Promise<Resultado> {
  const u = await exigirSessao(`/eventos/${eventoId}`);
  const r = await usarBonusAniversario(inscricaoId, u);
  const evento = await getEvento(eventoId);
  if (evento) revalidar(eventoId, evento.ritual_numero_geral);
  return r;
}

/** O participante confirma que prefere gastar um crédito de pacote, quando o bônus de aniversário também está disponível. */
export async function usarCreditoDoParticipanteAction(eventoId: string, inscricaoId: string): Promise<Resultado> {
  const u = await exigirSessao(`/eventos/${eventoId}`);
  const { evento } = await contexto(eventoId);
  if (!evento) return { erro: "Evento não encontrado." };
  const r = await usarCreditoNaInscricao(u.id, inscricaoId, true);
  revalidar(eventoId, evento.ritual_numero_geral);
  return r;
}
