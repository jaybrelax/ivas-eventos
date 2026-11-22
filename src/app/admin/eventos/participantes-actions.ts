"use server";

import { revalidatePath } from "next/cache";
import { exigir } from "@/lib/auth";
import { ID } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { LABEL_PARTICIPANTE, PODE } from "@/lib/config";
import { getEvento } from "@/lib/data";
import { definirPagamento, incluirParticipante, removerParticipante, type Resultado } from "@/lib/inscricoes";
import { lerValor } from "@/lib/pagamento-regras";

function revalidar(eventoId: string) {
  revalidatePath(`/admin/eventos/${eventoId}`);
  revalidatePath("/admin/eventos");
  revalidatePath("/admin/pagamentos");
  revalidatePath(`/eventos/${eventoId}`);
  revalidatePath("/minha-conta");
  revalidatePath("/admin/participantes", "layout");
}

/** Coordenador inclui um participante manualmente. */
export async function incluirParticipanteAction(eventoId: string, usuarioId: string): Promise<Resultado> {
  const u = await exigir(PODE.editarEventos);
  const evento = await getEvento(eventoId);
  if (!evento) return { erro: "Evento não encontrado." };
  const r = await incluirParticipante(evento, usuarioId, u.id);
  revalidar(eventoId);
  return r;
}

/**
 * Inclui alguém que ainda não tem cadastro: cria uma conta só com o nome (sem e-mail nem senha, então
 * não entra no sistema), marcada como participante e "avulso", e inscreve no evento. Assim a pessoa
 * aparece em todas as listas e contribuições como qualquer outra.
 */
export async function incluirAvulsoAction(eventoId: string, nomeBruto: string): Promise<Resultado> {
  const u = await exigir(PODE.editarEventos);
  const nome = String(nomeBruto ?? "").trim().replace(/\s+/g, " ").slice(0, 128);
  if (nome.length < 3) return { erro: "Digite o nome da pessoa (pelo menos 3 letras)." };
  const evento = await getEvento(eventoId);
  if (!evento) return { erro: "Evento não encontrado." };

  const { users } = createAdminClient();
  let userId: string | null = null;
  try {
    const conta = await users.create({ userId: ID.unique(), name: nome });
    userId = conta.$id;
    await users.updateLabels({ userId, labels: [LABEL_PARTICIPANTE, "avulso"] });
    await users.updatePrefs({ userId, prefs: { avulso: true, funcao_ritual: "nenhuma", incluido_por: u.id } });
  } catch (e) {
    if (userId) await users.delete({ userId }).catch(() => {});
    console.error("Incluir sem cadastro:", e instanceof Error ? e.message : e);
    return { erro: "Não foi possível incluir agora. Tente de novo." };
  }
  const r = await incluirParticipante(evento, userId, u.id);
  if (r.erro) await users.delete({ userId }).catch(() => {});
  revalidar(eventoId);
  return r.erro ? r : { ok: r.ok?.replace("Participante incluído", `${nome} incluído(a) sem cadastro`) ?? "Incluído." };
}

/** Coordenador cancela a participação de alguém (bloqueado se a contribuição já foi confirmada). */
export async function removerParticipanteAction(eventoId: string, usuarioId: string): Promise<Resultado> {
  const u = await exigir(PODE.editarEventos);
  const evento = await getEvento(eventoId);
  if (!evento) return { erro: "Evento não encontrado." };
  const r = await removerParticipante(evento, usuarioId, u.id);
  revalidar(eventoId);
  return r;
}

/** Coordenador confirma o pagamento de uma inscrição, com o valor recebido (vazio mantém o valor informado). */
export async function confirmarPagamentoAction(eventoId: string, inscricaoId: string, valorBruto?: unknown): Promise<Resultado> {
  const u = await exigir(PODE.editarEventos);
  const lido = lerValor(valorBruto);
  if ("erro" in lido) return { erro: lido.erro };
  const r = await definirPagamento(eventoId, inscricaoId, "pago", u.id, lido.valor);
  revalidar(eventoId);
  return r;
}

/** Coordenador marca a inscrição como isenta da contribuição. */
export async function isentarPagamentoAction(eventoId: string, inscricaoId: string): Promise<Resultado> {
  const u = await exigir(PODE.editarEventos);
  const r = await definirPagamento(eventoId, inscricaoId, "isento", u.id);
  revalidar(eventoId);
  return r;
}

/** Coordenador desfaz a confirmação/isenção, voltando o pagamento para pendente. */
export async function reabrirPagamentoAction(eventoId: string, inscricaoId: string): Promise<Resultado> {
  const u = await exigir(PODE.editarEventos);
  const r = await definirPagamento(eventoId, inscricaoId, "pendente", u.id);
  revalidar(eventoId);
  return r;
}
