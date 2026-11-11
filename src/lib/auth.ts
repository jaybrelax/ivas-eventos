import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createSessionClient } from "./appwrite";
import type { Perfil } from "./config";
import { ehParticipante, funcaoDosLabels, prefsDe, type FuncaoRitual } from "./usuarios";
import type { Sexo } from "./types";
import type { Experiencia } from "./perfil-extra";
import { suspensaoAtiva } from "./suspensao-guarnicao";

export type Usuario = {
  id: string; nome: string; email: string; perfil: Perfil | null; telefone: string | null; foto: string | null;
  funcaoRitual: FuncaoRitual; sexo: Sexo | null; endereco: string | null;
  /** CPF e data de nascimento são opcionais, preenchidos depois em "Meus dados". */
  cpf: string | null; dataNascimento: string | null;
  estado: string | null; cidade: string | null; profissao: string | null;
  experiencia: Experiencia | null; motivacao: string | null; expectativas: string | null;
  aprovacaoPendente: boolean; cadastroIncompleto: boolean;
  suspensoAte: string | null; cargoRemovido: boolean;
  /** "equipe": tem perfil de painel (admin/coordenador/normal). "participante": só cadastro público. */
  tipo: "equipe" | "participante" | null;
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
      telefone: p.telefone, foto: p.foto_file_id, funcaoRitual: funcaoDosLabels(u.labels), sexo: p.sexo, endereco: p.endereco,
      cpf: p.cpf, dataNascimento: p.data_nascimento,
      estado: p.estado, cidade: p.cidade, profissao: p.profissao,
      experiencia: p.experiencia_ayahuasca, motivacao: p.motivacao, expectativas: p.expectativas,
      aprovacaoPendente: p.aprovacao_pendente, cadastroIncompleto: p.cadastro_guarnicao_incompleto,
      suspensoAte: suspensaoAtiva(p.guarnicao_suspenso_ate) ? p.guarnicao_suspenso_ate : null,
      cargoRemovido: p.guarnicao_cargo_removido,
      tipo: perfil ? "equipe" : ehParticipante(u.labels ?? []) ? "participante" : null,
    };
  } catch {
    return null;
  }
});

/** Garante uma sessão válida para editar os dados do próprio usuário. */
export async function exigirSessao(next?: string): Promise<Usuario> {
  const u = await getUsuario();
  if (!u) redirect(`/login-guarnicao${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return u;
}
