import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createSessionClient } from "./appwrite";
import type { Perfil } from "./config";
import { ehParticipante, prefsDe, type FuncaoRitual } from "./usuarios";
import { suspensaoAtiva } from "./suspensao-guarnicao";
import type { Sexo } from "./types";
import type { Experiencia } from "./perfil-extra";

export type Usuario = {
  id: string; nome: string; email: string; perfil: Perfil | null; telefone: string | null; foto: string | null;
  funcaoRitual: FuncaoRitual; sexo: Sexo | null; endereco: string | null;
  /** CPF e data de nascimento são opcionais, preenchidos depois em "Meus dados". */
  cpf: string | null; dataNascimento: string | null;
  estado: string | null; cidade: string | null; profissao: string | null;
  experiencia: Experiencia | null; motivacao: string | null; expectativas: string | null;
  /** "equipe": tem perfil de painel (admin/coordenador/normal). "participante": só cadastro público. */
  tipo: "equipe" | "participante" | null;
  /** Guardião com candidaturas suspensas: até quando (ISO), ou null. */
  suspensoAte: string | null;
  /** Pedido de acesso à Guarnição aguardando a coordenação; cadastro pelo Google ainda por completar; cargo de guardião retirado. */
  aprovacaoPendente: boolean; cadastroIncompleto: boolean; cargoRemovido: boolean;
};

/** Conta já existente no IVAS que ainda pode solicitar a função de guardião. */
export function podeSolicitarGuarnicao(u: Pick<Usuario, "tipo" | "perfil" | "funcaoRitual" | "aprovacaoPendente"> & Partial<Pick<Usuario, "cargoRemovido">>): boolean {
  return !u.aprovacaoPendente && !u.cargoRemovido && u.funcaoRitual === "nenhuma" && (u.tipo === "participante" || u.perfil === "normal");
}

function perfilDe(labels: string[]): Perfil | null {
  if (labels.includes("admin")) return "admin";
  if (labels.includes("coordenador")) return "coordenador";
  if (labels.includes("normal")) return "normal";
  return null;
}

export const getUsuario = cache(async (): Promise<Usuario | null> => {
  const s = await createSessionClient();
  if (!s) return null;
  try {
    const u = await s.account.get();
    const perfil = perfilDe(u.labels ?? []);
    const p = prefsDe(u.prefs);
    return {
      id: u.$id, nome: u.name || u.email, email: u.email, perfil,
      telefone: p.telefone, foto: p.foto_file_id, funcaoRitual: p.funcao_ritual, sexo: p.sexo, endereco: p.endereco,
      cpf: p.cpf, dataNascimento: p.data_nascimento,
      estado: p.estado, cidade: p.cidade, profissao: p.profissao,
      experiencia: p.experiencia_ayahuasca, motivacao: p.motivacao, expectativas: p.expectativas,
      tipo: perfil ? "equipe" : ehParticipante(u.labels ?? []) ? "participante" : null,
      suspensoAte: suspensaoAtiva(p.guarnicao_suspenso_ate) ? p.guarnicao_suspenso_ate : null,
      aprovacaoPendente: p.aprovacao_pendente, cadastroIncompleto: p.cadastro_guarnicao_incompleto,
      cargoRemovido: p.guarnicao_cargo_removido,
    };
  } catch {
    return null;
  }
});

/** Garante login com perfil de equipe (painel) e, se informado, um dos perfis. Participante é mandado para a própria área. */
export async function exigir(perfis?: Perfil[]): Promise<Usuario & { perfil: Perfil }> {
  const u = await getUsuario();
  if (!u) redirect("/login");
  if (!u.perfil) {
    if (u.tipo === "participante") redirect("/minha-conta");
    redirect("/login?erro=sem-perfil");
  }
  if (perfis && !perfis.includes(u.perfil)) redirect("/admin/eventos?erro=sem-permissao");
  return u as Usuario & { perfil: Perfil };
}

/** Garante só uma sessão válida (equipe ou participante) — páginas públicas que exigem login, como Minha conta. */
export async function exigirSessao(next?: string): Promise<Usuario> {
  const u = await getUsuario();
  if (!u) redirect(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return u;
}

export function pode(u: { perfil: Perfil | null } | null, perfis: Perfil[]) {
  return !!u?.perfil && perfis.includes(u.perfil);
}
