import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createSessionClient } from "./appwrite";
import type { Perfil } from "./config";
import { prefsDe, type FuncaoRitual } from "./usuarios";
import type { Sexo } from "./types";

export type Usuario = {
  id: string; nome: string; email: string; perfil: Perfil | null; telefone: string | null; foto: string | null;
  funcaoRitual: FuncaoRitual; sexo: Sexo | null;
};

function perfilDe(labels: string[]): Perfil | null {
  if (labels.includes("admin")) return "admin";
  if (labels.includes("coordenador")) return "coordenador";
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
      telefone: p.telefone, foto: p.foto_file_id, funcaoRitual: p.funcao_ritual, sexo: p.sexo,
    };
  } catch {
    return null;
  }
});

/** Garante login e, se informado, um dos perfis. */
export async function exigir(perfis?: Perfil[]): Promise<Usuario & { perfil: Perfil }> {
  const u = await getUsuario();
  if (!u) redirect("/login");
  if (!u.perfil) redirect("/login?erro=sem-perfil");
  if (perfis && !perfis.includes(u.perfil)) redirect("/eventos?erro=sem-permissao");
  return u as Usuario & { perfil: Perfil };
}

export function pode(u: { perfil: Perfil | null } | null, perfis: Perfil[]) {
  return !!u?.perfil && perfis.includes(u.perfil);
}
