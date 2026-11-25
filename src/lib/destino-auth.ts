import { comParticiparAberto } from "./links";
import { ehDestinoAdmin, podeAcessarAdmin } from "./acesso-admin";
import type { Perfil } from "./config";

/** Destino interno normalizado, inclusive para impedir que /guarnicao/../ saia do app. */
export function destinoSeguro(next: unknown): string | null {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || /[\\\u0000-\u001f]/.test(next)) return null;
  try {
    const url = new URL(next, "https://ivas.local");
    if (url.origin !== "https://ivas.local") return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function ehDestinoGuarnicao(next: unknown): boolean {
  const destino = destinoSeguro(next);
  return destino !== null && /^\/guarnicao(?:\/|\?|#|$)/.test(destino);
}

/** O login e o cadastro da Guarnição só podem retornar para dentro desse app. */
export function destinoGuarnicao(next: unknown): string {
  const destino = destinoSeguro(next);
  return destino && ehDestinoGuarnicao(destino) ? destino : "/guarnicao";
}

export function destinoAposCadastro(next: unknown, guardiao: boolean, padrao: string, perfil: Perfil | null = null): string {
  if (guardiao || ehDestinoGuarnicao(next)) return destinoGuarnicao(next);
  const destino = destinoSeguro(next);
  if (destino && ehDestinoAdmin(destino) && !podeAcessarAdmin(perfil)) return padrao;
  return destino ? comParticiparAberto(destino) : padrao;
}
