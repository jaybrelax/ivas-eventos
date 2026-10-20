import "server-only";
import {
  aceitaParticipantes, inicioDe, inscricoesDoEvento, prazoCancelamento, vagasParticipantesDe,
} from "@/lib/inscricoes";
import { listarParticipantes, mapaUsuarios } from "@/lib/usuarios";
import type { Evento, TipoEvento } from "@/lib/types";
import type { DadosParticipantes, PessoaParticipante } from "./Participantes";

function quando(d: Date) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
    .format(d)
    .replace(",", " às");
}

/** Monta o que o cartão de Participantes precisa para um evento e o usuário logado. */
export async function dadosParticipantes(
  evento: Evento,
  tipo: TipoEvento | undefined,
  valorContribuicao: number | null,
  gerenciar: boolean,
): Promise<DadosParticipantes | null> {
  if (!aceitaParticipantes(tipo)) return null;
  const [inscricoes, usuarios, participantes] = await Promise.all([inscricoesDoEvento(evento.$id), mapaUsuarios(), gerenciar ? listarParticipantes() : Promise.resolve([])]);
  const pessoa = (id: string): PessoaParticipante => {
    const u = usuarios.get(id);
    return { id, nome: u?.nome ?? "Usuário removido", foto: u?.foto ?? null };
  };

  const confirmados = inscricoes
    .filter((i) => i.situacao === "confirmada")
    .map((i) => ({ ...pessoa(i.usuario_id), pagamento: i.pagamento, inscricaoId: i.$id, comprovante: i.comprovante_file_id }));
  const espera = inscricoes
    .filter((i) => i.situacao === "espera")
    .map((i) => ({ ...pessoa(i.usuario_id), pagamento: i.pagamento, inscricaoId: i.$id, comprovante: i.comprovante_file_id }));

  const inscritos = new Set(inscricoes.map((i) => i.usuario_id));
  const agora = Date.now();

  return {
    eventoId: evento.$id,
    vagas: vagasParticipantesDe(evento),
    abertas: evento.candidaturas_abertas !== false,
    jaComecou: inicioDe(evento).getTime() <= agora,
    prazoPassou: prazoCancelamento(evento).getTime() < agora,
    prazoTexto: quando(prazoCancelamento(evento)),
    confirmados,
    espera,
    gerenciar,
    disponiveis: gerenciar ? participantes.filter((p) => !inscritos.has(p.id)).map((p) => ({ id: p.id, nome: p.nome, foto: p.foto })) : [],
    valorContribuicao,
    temContribuicao: !!tipo?.conta_como_ritual,
  };
}
