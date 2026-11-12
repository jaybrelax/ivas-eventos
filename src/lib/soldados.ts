import "server-only";
import { compararFirst } from "./ordenacao-first";
import { cache } from "react";
import { rituaisPassados } from "./guarnicao-estatisticas";
import { mapaUsuarios } from "./usuarios";
import { suspensaoAtiva } from "./suspensao-guarnicao";
import type { Funcao, Sexo } from "./types";

export type Soldado = {
  id: string; nome: string; foto: string | null; sexo: Sexo | null; funcao: Funcao;
  total: number; ultimo: string | null; suspensoAte: string | null; first: boolean;
};

/** A equipe da Guarnição: guardiões, guardiãs e mestres ativos, inclusive quem ainda não serviu. */
export const listarSoldados = cache(async (): Promise<Soldado[]> => {
  const [usuarios, passados] = await Promise.all([mapaUsuarios(), rituaisPassados()]);
  return [...usuarios.values()].flatMap((u): Soldado[] => {
    if (!u.ativo || u.mock || (u.funcao !== "guardiao" && u.funcao !== "mestre")) return [];
    const meus = passados.filter((e) => e.guardioes?.includes(u.id) || (u.funcao === "mestre" && e.mestres?.includes(u.id)));
    return [{
      id: u.id, nome: u.nome, foto: u.foto, sexo: u.sexo, funcao: u.funcao, first: u.first,
      total: meus.length, ultimo: meus[0]?.data ?? null,
      suspensoAte: u.funcao === "guardiao" && suspensaoAtiva(u.suspensoAte) ? u.suspensoAte : null,
    }];
  }).sort((a, b) => compararFirst(a, b) || a.nome.localeCompare(b.nome, "pt-BR"));
});
