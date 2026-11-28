import "server-only";
import {
  aceitaParticipantes, inicioDe, inscricoesDoEvento, prazoCancelamento, todasInscricoesAtivas, vagasParticipantesDe,
} from "@/lib/inscricoes";
import { detalhesDosCreditos, saldosDe } from "@/lib/creditos";
import { listarTodasAsPessoas, mapaUsuarios } from "@/lib/usuarios";
import { ocultarCpf } from "@/lib/cpf";
import { lerDoses, lerDosesEquipe } from "@/lib/doses";
import { bonusAniversarioDisponivel } from "@/lib/bonus-aniversario";
import type { ChavePix, Evento, Inscricao, TipoEvento } from "@/lib/types";
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
  podeIsentar = false,
  chavePix: ChavePix | null = null,
  visibilidade: { verDosagens?: boolean; verFinanceiro?: boolean } = {},
): Promise<DadosParticipantes | null> {
  if (!aceitaParticipantes(tipo)) return null;
  const verDosagens = gerenciar || visibilidade.verDosagens === true;
  const verFinanceiro = gerenciar || visibilidade.verFinanceiro === true;
  const [inscricoes, usuarios, pessoas, todas] = await Promise.all([
    inscricoesDoEvento(evento.$id),
    mapaUsuarios(),
    gerenciar ? listarTodasAsPessoas() : Promise.resolve([]),
    // Só a coordenação vê o "1° VEZ": quem já tem participação confirmada em outro evento não é primeira vez
    gerenciar ? todasInscricoesAtivas() : Promise.resolve([]),
  ]);
  // Créditos: saldo para a coordenação e origem do crédito para quem pode ver o financeiro.
  const [saldos, detalhesCredito] = verFinanceiro && tipo?.conta_como_ritual
    ? await Promise.all([
        gerenciar ? saldosDe(inscricoes.map((i) => i.usuario_id)).catch(() => null) : Promise.resolve(null),
        detalhesDosCreditos(inscricoes.flatMap((i) => (i.credito_id ? [i.credito_id] : []))).catch(() => new Map()),
      ])
    : [null, new Map()];
  // A data de nascimento nunca vai para o navegador: só traduzimos a regra em uma flag para a ação do painel.
  const bonusPorInscricao = new Map<string, boolean>();
  if (gerenciar && tipo?.conta_como_ritual) {
    const resultados = await Promise.all(inscricoes.map(async (i) => {
      const u = usuarios.get(i.usuario_id);
      const bonus = u
        ? await bonusAniversarioDisponivel({ id: u.id, dataNascimento: u.dataNascimento }, evento, tipo)
        : { disponivel: false };
      return [i.$id, bonus.disponivel] as const;
    }));
    resultados.forEach(([id, disponivel]) => bonusPorInscricao.set(id, disponivel));
  }
  const jaParticiparam = new Set(todas.filter((i) => i.situacao === "confirmada" && i.evento_id !== evento.$id).map((i) => i.usuario_id));
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
      pagamento: verFinanceiro ? i.pagamento : "pendente", inscricaoId: i.$id, comprovante: verFinanceiro ? i.comprovante_file_id : null,
      inscritoEm: i.$createdAt, valor: verFinanceiro ? i.valor : null, informadoEm: verFinanceiro ? i.informado_em : null, pagoEm: verFinanceiro ? i.pago_em : null,
      primeiraVez: gerenciar ? !!i.primeira_vez : false,
      jaParticipou: gerenciar ? jaParticiparam.has(i.usuario_id) : false,
      usouPacote: verFinanceiro && !!i.usou_pacote, pacoteObs: verFinanceiro && i.usou_pacote ? (i.observacao ?? null) : null,
      forma: verFinanceiro ? (i.pagamento === "credito" ? "pacote" : (i.forma_pagamento ?? null)) : null,
      creditoRotulo: verFinanceiro && i.credito_id ? (detalhesCredito.get(i.credito_id)?.rotulo ?? null) : null,
      creditoOrigem: verFinanceiro && i.credito_id ? (() => {
        const credito = detalhesCredito.get(i.credito_id);
        if (!credito) return null;
        const nomePacote = credito.pacoteNome;
        if (credito.recebidoDe) return { pacote: nomePacote, pessoa: `Recebido de ${usuarios.get(credito.recebidoDe)?.nome ?? "outra pessoa"}` };
        if (credito.compradorId !== i.usuario_id) return { pacote: nomePacote, pessoa: `Comprado originalmente por ${usuarios.get(credito.compradorId)?.nome ?? "outra pessoa"}` };
        return { pacote: nomePacote, pessoa: "Pacote comprado" };
      })() : null,
      saldoCredito: saldos?.get(i.usuario_id) ? { disponiveis: saldos.get(i.usuario_id)!.disponiveis, debitos: saldos.get(i.usuario_id)!.debitos, saldo: saldos.get(i.usuario_id)!.saldo } : null,
      bonusAniversarioDisponivel: gerenciar ? (bonusPorInscricao.get(i.$id) ?? false) : false,
      contato: c ? { email: c.email, telefone: c.telefone, cidade: c.cidade, estado: c.estado, sexo: c.sexo, desde: c.criadoEm, cpf: c.cpf ? ocultarCpf(c.cpf) || null : null } : null,
      doses: verDosagens ? lerDoses(i.doses) : [],
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
    podeIsentar: gerenciar && podeIsentar,
    chavePix: gerenciar ? chavePix : null,
    // Qualquer pessoa com conta (participante ou equipe) que ainda não está inscrita; contas de teste (mock) ficam de fora
    disponiveis: gerenciar
      ? pessoas.filter((p) => !inscritos.has(p.id) && !usuarios.get(p.id)?.mock).map((p) => ({ id: p.id, nome: p.nome, foto: p.foto })).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
      : [],
    dosesEquipe: verDosagens ? lerDosesEquipe(evento.doses_equipe) : {},
    valorContribuicao: verFinanceiro ? valorContribuicao : null,
    localPadrao: localPadrao?.estado && localPadrao.cidade ? { estado: localPadrao.estado, cidade: localPadrao.cidade } : null,
    temContribuicao: !!tipo?.conta_como_ritual,
  };
}
