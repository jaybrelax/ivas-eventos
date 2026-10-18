import type { Evento, TipoEvento } from "./types";

/**
 * Endereço público do evento: rituais usam o número geral (/ritual/525);
 * os demais tipos seguem com o id (/evento/abc123).
 */
export function urlPublicaEvento(e: Pick<Evento, "$id" | "ritual_numero_geral">, tipo?: Pick<TipoEvento, "conta_como_ritual"> | null) {
  const ritual = !!e.ritual_numero_geral && (tipo ? tipo.conta_como_ritual : true);
  return ritual ? `/ritual/${e.ritual_numero_geral}` : `/eventos/${e.$id}`;
}
