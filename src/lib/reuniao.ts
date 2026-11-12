import "server-only";
import { compararFirst } from "./ordenacao-first";
import { guardioesDaReuniao, fimPrazoPresenca, inicioDe, prazoCancelamento, presencasDaReuniao, regrasGuarnicao } from "./guarnicao";
import { mapaUsuarios } from "./usuarios";
import { dataHoraExtenso } from "./termo-justificativa";
import type { Evento, Sexo } from "./types";

/** Lista de presença de uma reunião, como a página do app a mostra (todos veem as três listas). */

export type PessoaReuniao = { id: string; nome: string; foto: string | null; /** Mestre escalado nesta reunião. */ mestre: boolean; /** Guardião escalado nesta reunião. */ escalado: boolean; podeSerGuardiaoDoDia: boolean; sexo: Sexo | null; /** Foi guardião do dia (marcado pela coordenação ou por um mestre). */ guardiaoDoDia: boolean };
export type JustificadoReuniao = PessoaReuniao & { texto: string; /** Quando a justificativa foi registrada (data e hora por extenso). */ quando: string; /** Primeiro nome de quem registrou, se não foi o próprio guardião. */ por: string | null };

export type DadosReuniao = {
  eventoId: string;
  /** Data do ritual (AAAA-MM-DD). */
  dataEvento: string;
  confirmados: PessoaReuniao[];
  mestresRitual: PessoaReuniao[];
  mestresDisponiveis: PessoaReuniao[];
  guardioesRitual: PessoaReuniao[];
  membrosDisponiveis: PessoaReuniao[];
  justificados: JustificadoReuniao[];
  /** Mestres e guardiões ativos que ainda não confirmaram nem justificaram esta reunião. */
  semResposta: PessoaReuniao[];
  /** Pessoas fora da escala que o gestor ainda pode incluir na presença. */
  disponiveis: PessoaReuniao[];
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
export async function dadosReuniao(evento: Evento, euId: string, verRegistradoPor = false, verDisponiveis = false): Promise<DadosReuniao> {
  const [candidaturas, usuarios, { horas, horasPresenca }] = await Promise.all([presencasDaReuniao(evento), mapaUsuarios(), regrasGuarnicao()]);
  const visivel = (id: string) => !usuarios.get(id)?.mock;
  const pessoa = (id: string): PessoaReuniao => {
    const u = usuarios.get(id);
    return { id, nome: u?.nome ?? "Usuário removido", foto: u?.foto ?? null, mestre: u?.funcao === "mestre", escalado: guardioesDaReuniao(evento).includes(id), podeSerGuardiaoDoDia: u?.funcao === "guardiao", sexo: u?.sexo ?? null, guardiaoDoDia: u?.funcao === "guardiao" && (evento.guardioes ?? []).includes(id) };
  };
  const ordenarPessoa = (a: PessoaReuniao, b: PessoaReuniao) => compararFirst(usuarios.get(a.id), usuarios.get(b.id));
  // Confirmações antigas sem horário mantêm ordem estável; novas escalas têm registro real.
  const confirmados = candidaturas
    .filter((c) => visivel(c.usuario_id) && c.situacao === "confirmada" && (!c.$id.startsWith("auto-") || usuarios.get(c.usuario_id)?.ativo))
    .sort((a, b) => compararFirst(usuarios.get(a.usuario_id), usuarios.get(b.usuario_id)) || Number(usuarios.get(b.usuario_id)?.funcao === "mestre") - Number(usuarios.get(a.usuario_id)?.funcao === "mestre") || a.ordem - b.ordem || (a.$createdAt ?? "").localeCompare(b.$createdAt ?? "") || a.usuario_id.localeCompare(b.usuario_id))
    .map((c) => pessoa(c.usuario_id));
  const justificados = candidaturas
    .filter((c) => visivel(c.usuario_id) && c.situacao === "justificada")
    .map((c): JustificadoReuniao => ({
      ...pessoa(c.usuario_id),
      texto: c.justificativa ?? "",
      quando: c.$updatedAt ? dataHoraExtenso(new Date(c.$updatedAt)) : "",
      por: verRegistradoPor && c.alterado_por && visivel(c.alterado_por) && c.alterado_por !== c.usuario_id ? (usuarios.get(c.alterado_por)?.nome.split(" ")[0] ?? null) : null,
    })).sort(ordenarPessoa);
  const respondeu = new Set(candidaturas.map((c) => c.usuario_id));
  const semResposta = [...usuarios.values()].filter((u) => u.ativo && !u.mock && (u.funcao === "guardiao" || u.funcao === "mestre") && !respondeu.has(u.id)).map((u) => pessoa(u.id)).sort(ordenarPessoa);
  const disponiveis = verDisponiveis ? semResposta : [];
  const minha = candidaturas.find((c) => c.usuario_id === euId);
  const agora = Date.now();
  return {
    eventoId: evento.$id,
    dataEvento: evento.data,
    confirmados,
    mestresRitual: (evento.mestres ?? []).filter(visivel).map(pessoa).sort(ordenarPessoa),
    mestresDisponiveis: verDisponiveis ? [...usuarios.values()].filter((u) => u.ativo && !u.mock && u.funcao === "mestre" && !(evento.mestres ?? []).includes(u.id)).map((u) => pessoa(u.id)).sort(ordenarPessoa) : [],
    guardioesRitual: guardioesDaReuniao(evento).filter(visivel).map(pessoa).sort(ordenarPessoa),
    membrosDisponiveis: verDisponiveis ? [...usuarios.values()].filter((u) => u.ativo && !u.mock && (u.funcao === "mestre" || u.funcao === "guardiao") && !guardioesDaReuniao(evento).includes(u.id)).map((u) => pessoa(u.id)).sort(ordenarPessoa) : [],
    justificados,
    semResposta,
    disponiveis,
    eu: { situacao: minha?.situacao === "confirmada" || minha?.situacao === "justificada" ? minha.situacao : null, justificativa: minha?.situacao === "justificada" ? (minha.justificativa ?? "") : null },
    jaComecou: inicioDe(evento).getTime() <= agora,
    presencaEncerrada: fimPrazoPresenca(evento, horasPresenca).getTime() < agora,
    prazoPassou: prazoCancelamento(evento, horas).getTime() < agora,
    prazoTexto: quando(prazoCancelamento(evento, horas)),
  };
}
