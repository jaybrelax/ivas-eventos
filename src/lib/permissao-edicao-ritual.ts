import type { Usuario } from "./auth";

export function podeEditarRitual(u: Pick<Usuario, "perfil" | "funcaoRitual" | "aprovacaoPendente" | "cadastroIncompleto"> | null): boolean {
  return !!u && !u.aprovacaoPendente && !u.cadastroIncompleto && (u.perfil === "admin" || u.perfil === "coordenador" || u.funcaoRitual === "mestre");
}
