/** URL do ritual no app da Guarnição: usa o número geral (/guarnicao/ritual/532); sem número, o id do evento. */
export function urlRitualGuarnicao(e: { $id: string; ritual_numero_geral?: number | null }) {
  return `/guarnicao/ritual/${e.ritual_numero_geral ?? e.$id}`;
}

/** Mesma rota pública usada pelo aplicativo de Eventos. */
export function urlPublicaEvento(e: { $id: string; ritual_numero_geral?: number | null }, tipo?: { conta_como_ritual: boolean } | null) {
  const ritual = !!e.ritual_numero_geral && (tipo ? tipo.conta_como_ritual : true);
  return ritual ? `/ritual/${e.ritual_numero_geral}` : `/eventos/${e.$id}`;
}

/** O trecho da URL é um número geral de ritual (e não um id do Appwrite)? */
export function ehNumeroRitual(trecho: string) {
  return /^\d{1,7}$/.test(trecho);
}
