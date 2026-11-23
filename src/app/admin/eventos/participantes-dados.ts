import "server-only";
import {
  aceitaParticipantes, inicioDe, inscricoesDoEvento, prazoCancelamento, vagasParticipantesDe,
} from "@/lib/inscricoes";
import { listarTodasAsPessoas, mapaUsuarios } from "@/lib/usuarios";
import { mascararCpf } from "@/lib/cpf";
import { lerDoses, lerDosesEquipe } from "@/lib/doses";
import type { Evento, Inscricao, TipoEvento } from "@/lib/types";
import type { DadosParticipantes, ItemParticipanteInscrito, PessoaParticipante } from "./Participantes";

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
  /** Estado e cidade do Instituto: já vêm preenchidos ao informar os dados de um participante. */
  localPadrao?: { estado: string | null; cidade: string | null },
): Promise<DadosParticipantes | null> {
  if (!aceitaParticipantes(tipo)) return null;
  const [inscricoes, usuarios, pessoas] = await Promise.all([
    inscricoesDoEvento(evento.$id),
    mapaUsuarios(),
    gerenciar ? listarTodasAsPessoas() : Promise.resolve([]),
  ]);
  const contatoPorId = new Map(pessoas.map((p) => [p.id, p]));
  const pessoa = (id: string): PessoaParticipante => {
    const u = usuarios.get(id);
    return { id, nome: u?.nome ?? "Usuário removido", foto: u?.foto ?? null };
  };
  // Contato só vai para quem gerencia (o cartão é renderizado no navegador)
  const item = (i: Inscricao): ItemParticipanteInscrito => {
    const c = gerenciar ? contatoPorId.get(i.usuario_id) : undefined;
    return {
      ...pessoa(i.usuario_id),
      pagamento: i.pagamento, inscricaoId: i.$id, comprovante: i.comprovante_file_id,
      inscritoEm: i.$createdAt, valor: i.valor, informadoEm: i.informado_em, pagoEm: i.pago_em,
      usouPacote: !!i.usou_pacote, pacoteObs: i.usou_pacote ? (i.observacao ?? null) : null,
      contato: c ? { email: c.email, telefone: c.telefone, cidade: c.cidade, estado: c.estado, sexo: c.sexo, desde: c.criadoEm, cpf: c.cpf ? mascararCpf(c.cpf) : null } : null,
      doses: gerenciar ? lerDoses(i.doses) : [],
    };
  };

  const confirmados = inscricoes.filter((i) => i.situacao === "confirmada").map(item);
  const espera = inscricoes.filter((i) => i.situacao === "espera").map(item);

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
    // Qualquer pessoa com conta (participante ou equipe) que ainda não está inscrita; contas de teste (mock) ficam de fora
    disponiveis: gerenciar
      ? pessoas.filter((p) => !inscritos.has(p.id) && !usuarios.get(p.id)?.mock).map((p) => ({ id: p.id, nome: p.nome, foto: p.foto })).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
      : [],
    dosesEquipe: gerenciar ? lerDosesEquipe(evento.doses_equipe) : {},
    valorContribuicao,
    localPadrao: localPadrao?.estado && localPadrao.cidade ? { estado: localPadrao.estado, cidade: localPadrao.cidade } : null,
    temContribuicao: !!tipo?.conta_como_ritual,
  };
}
