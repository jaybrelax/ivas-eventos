import type { Perfil } from "./config";

export type PerfilAdmin = Extract<Perfil, "admin" | "coordenador">;

export function podeAcessarAdmin(perfil: Perfil | null): perfil is PerfilAdmin {
  return perfil === "admin" || perfil === "coordenador";
}

export function ehDestinoAdmin(destino: string): boolean {
  return /^\/admin(?:\/|[?#]|$)/.test(destino);
}

/** O perfil normal sempre entra na agenda pública; somente admin e coordenação podem seguir para /admin. */
export function destinoAposLogin(perfil: Perfil | null, next: string | null): string {
  if (perfil === "normal") return "/eventos";
  if (next && (!ehDestinoAdmin(next) || podeAcessarAdmin(perfil))) return next;
  return podeAcessarAdmin(perfil) ? "/admin/eventos" : "/minha-conta";
}
