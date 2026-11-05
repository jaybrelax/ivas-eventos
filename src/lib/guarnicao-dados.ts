import "server-only";
import { candidaturasDoEvento, inicioDe, prazoCancelamento, regrasGuarnicao, vagasDe } from "@/lib/guarnicao";
import { mapaUsuarios } from "@/lib/usuarios";
import { suspensaoAtiva } from "@/lib/suspensao-guarnicao";
import type { Evento, Sexo } from "@/lib/types";

export type PessoaGuarnicao = { id: string; nome: string; foto: string | null };
export type DadosGuarnicao = {
  eventoId: string;
  vagas: Record<Sexo, number>;
  abertas: boolean;
  jaComecou: boolean;
  prazoPassou: boolean;
  prazoTexto: string;
  confirmados: Record<Sexo, PessoaGuarnicao[]>;
  espera: Record<Sexo, PessoaGuarnicao[]>;
  eu: { id: string; guardiao: boolean; sexo: Sexo | null; situacao: "confirmada" | "espera" | null; posicaoEspera: number | null };
  gerenciar: boolean;
  disponiveis: (PessoaGuarnicao & { sexo: Sexo })[];
};

const SEXOS: Sexo[] = ["masculino", "feminino"];

function quando(d: Date) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
    .format(d)
    .replace(",", " às");
}

/** Monta o que o cartão da guarnição precisa para um evento e o usuário logado. */
export async function dadosGuarnicao(
  evento: Evento,
  eu: { id: string; funcaoRitual: string; sexo: Sexo | null; suspensoAte?: string | null },
  gerenciar: boolean,
): Promise<DadosGuarnicao> {
  const [candidaturas, usuarios, { horas }] = await Promise.all([candidaturasDoEvento(evento.$id), mapaUsuarios(), regrasGuarnicao()]);
  const pessoa = (id: string): PessoaGuarnicao => {
    const u = usuarios.get(id);
    return { id, nome: u?.nome ?? "Usuário removido", foto: u?.foto ?? null };
  };
  const confirmados = Object.fromEntries(SEXOS.map((s) => [s, [] as PessoaGuarnicao[]])) as Record<Sexo, PessoaGuarnicao[]>;
  const espera = Object.fromEntries(SEXOS.map((s) => [s, [] as PessoaGuarnicao[]])) as Record<Sexo, PessoaGuarnicao[]>;
  for (const c of candidaturas) (c.situacao === "confirmada" ? confirmados : espera)[c.sexo].push(pessoa(c.usuario_id));

  const minha = candidaturas.find((c) => c.usuario_id === eu.id);
  const inscritos = new Set(candidaturas.map((c) => c.usuario_id));
  const agora = Date.now();
  return {
    eventoId: evento.$id,
    vagas: vagasDe(evento),
    abertas: evento.candidaturas_abertas !== false,
    jaComecou: inicioDe(evento).getTime() <= agora,
    prazoPassou: prazoCancelamento(evento, horas).getTime() < agora,
    prazoTexto: quando(prazoCancelamento(evento, horas)),
    confirmados,
    espera,
    eu: {
      id: eu.id,
      guardiao: eu.funcaoRitual === "guardiao" && !suspensaoAtiva(eu.suspensoAte),
      sexo: eu.sexo,
      situacao: minha?.situacao === "confirmada" || minha?.situacao === "espera" ? minha.situacao : null,
      posicaoEspera: minha?.situacao === "espera" ? espera[minha.sexo].findIndex((p) => p.id === eu.id) + 1 : null,
    },
    gerenciar,
    disponiveis: gerenciar
      ? [...usuarios.values()]
          .filter((u) => u.ativo && u.funcao === "guardiao" && !suspensaoAtiva(u.suspensoAte) && u.sexo && !inscritos.has(u.id))
          .map((u) => ({ id: u.id, nome: u.nome, foto: u.foto, sexo: u.sexo! }))
      : [],
  };
}
