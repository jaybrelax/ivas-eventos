import "server-only";
import {
  aceitaParticipantes, inicioDe, inscricoesDoEvento, prazoCancelamento, vagasParticipantesDe,
} from "@/lib/inscricoes";
import { listarParticipantes, listarTodasAsPessoas, mapaUsuarios } from "@/lib/usuarios";
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
): Promise<DadosParticipantes | null> {
  if (!aceitaParticipantes(tipo)) return null;
  const [inscricoes, usuarios, participantes, pessoas] = await Promise.all([
    inscricoesDoEvento(evento.$id),
    mapaUsuarios(),
    gerenciar ? listarParticipantes() : Promise.resolve([]),
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
      contato: c ? { email: c.email, telefone: c.telefone, cidade: c.cidade, estado: c.estado, sexo: c.sexo, desde: c.criadoEm } : null,
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
    disponiveis: gerenciar ? participantes.filter((p) => !inscritos.has(p.id)).map((p) => ({ id: p.id, nome: p.nome, foto: p.foto })) : [],
    valorContribuicao,
    temContribuicao: !!tipo?.conta_como_ritual,
  };
}
