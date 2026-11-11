import "server-only";
import { fimPrazoPresenca, inicioDe, prazoCancelamento, presencasDaReuniao, regrasGuarnicao } from "./guarnicao";
import { mapaUsuarios } from "./usuarios";
import { dataHoraExtenso } from "./termo-justificativa";
import type { Evento, Sexo } from "./types";

/** Lista de presença de uma reunião, como a página do app a mostra (todos veem as três listas). */

export type PessoaReuniao = { id: string; nome: string; foto: string | null; /** Mestres ficam num bloco à parte em cada lista. */ mestre: boolean; sexo: Sexo | null; /** Foi guardião do dia (marcado pela coordenação ou por um mestre). */ guardiaoDoDia: boolean };
export type JustificadoReuniao = PessoaReuniao & { texto: string; /** Quando a justificativa foi registrada (data e hora por extenso). */ quando: string; /** Primeiro nome de quem registrou, se não foi o próprio guardião. */ por: string | null };

export type DadosReuniao = {
  eventoId: string;
  /** Data do ritual (AAAA-MM-DD). */
  dataEvento: string;
  confirmados: PessoaReuniao[];
  justificados: JustificadoReuniao[];
  /** Guardiões e mestres ativos que não marcaram presença nem justificaram. */
  semResposta: PessoaReuniao[];
  eu: { situacao: "confirmada" | "justificada" | null; justificativa: string | null };
  jaComecou: boolean;
  /** Passou o prazo para confirmar presença (início + horas configuradas). */
  presencaEncerrada: boolean;
  prazoPassou: boolean;
  prazoTexto: string;
};

function quando(d: Date) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
    .format(d)
    .replace(",", " às");
}

/** `verRegistradoPor`: só a coordenação vê quem registrou cada justificativa. */
export async function dadosReuniao(evento: Evento, euId: string, verRegistradoPor = false): Promise<DadosReuniao> {
  const [candidaturas, usuarios, { horas, horasPresenca }] = await Promise.all([presencasDaReuniao(evento), mapaUsuarios(), regrasGuarnicao()]);
  const pessoa = (id: string): PessoaReuniao => {
    const u = usuarios.get(id);
    return { id, nome: u?.nome ?? "Usuário removido", foto: u?.foto ?? null, mestre: u?.funcao === "mestre", sexo: u?.sexo ?? null, guardiaoDoDia: u?.funcao !== "mestre" && (evento.guardioes ?? []).includes(id) };
  };
  // Mestres primeiro; o mestre escalado que já saiu da conta (inativo ou removido) não entra automaticamente
  const confirmados = candidaturas
    .filter((c) => c.situacao === "confirmada" && (!c.$id.startsWith("auto-") || usuarios.get(c.usuario_id)?.ativo))
    .map((c) => pessoa(c.usuario_id))
    .sort((a, b) => Number(b.mestre) - Number(a.mestre));
  const justificados = candidaturas
    .filter((c) => c.situacao === "justificada")
    .map((c): JustificadoReuniao => ({
      ...pessoa(c.usuario_id),
      texto: c.justificativa ?? "",
      quando: c.$updatedAt ? dataHoraExtenso(new Date(c.$updatedAt)) : "",
      por: verRegistradoPor && c.alterado_por && c.alterado_por !== c.usuario_id ? (usuarios.get(c.alterado_por)?.nome.split(" ")[0] ?? null) : null,
    }));
  const respondeu = new Set(candidaturas.map((c) => c.usuario_id));
  const semResposta = [...usuarios.values()].filter((u) => u.ativo && (u.funcao === "guardiao" || u.funcao === "mestre") && !respondeu.has(u.id)).map((u) => pessoa(u.id));
  const minha = candidaturas.find((c) => c.usuario_id === euId);
  const agora = Date.now();
  return {
    eventoId: evento.$id,
    dataEvento: evento.data,
    confirmados,
    justificados,
    semResposta,
    eu: { situacao: minha?.situacao === "confirmada" || minha?.situacao === "justificada" ? minha.situacao : null, justificativa: minha?.situacao === "justificada" ? (minha.justificativa ?? "") : null },
    jaComecou: inicioDe(evento).getTime() <= agora,
    presencaEncerrada: fimPrazoPresenca(evento, horasPresenca).getTime() < agora,
    prazoPassou: prazoCancelamento(evento, horas).getTime() < agora,
    prazoTexto: quando(prazoCancelamento(evento, horas)),
  };
}
