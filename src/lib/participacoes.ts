import "server-only";
import { listarEventos } from "./data";
import { hoje } from "./format";
import type { Candidatura, Evento, ItemParticipacao } from "./types";

/**
 * Junta as candidaturas ativas com os eventos. Mostra as confirmadas (passadas e futuras)
 * e as de espera ainda por acontecer; espera em evento que já passou não conta como participação.
 * Ordem: mais recente primeiro.
 */
export async function participacoesComEventos(candidaturas: Candidatura[]): Promise<ItemParticipacao[]> {
  if (!candidaturas.length) return [];
  const ids = [...new Set(candidaturas.map((c) => c.evento_id))];
  const eventos: Evento[] = [];
  for (let i = 0; i < ids.length; i += 100) eventos.push(...(await listarEventos({ ids: ids.slice(i, i + 100) })));
  const porId = new Map(eventos.map((e) => [e.$id, e]));
  const hj = hoje();
  return candidaturas
    .flatMap((c): ItemParticipacao[] => {
      const e = porId.get(c.evento_id);
      if (!e || (c.situacao !== "confirmada" && c.situacao !== "espera")) return [];
      const passado = e.data < hj;
      if (passado && c.situacao === "espera") return [];
      return [{ eventoId: e.$id, titulo: e.titulo, data: e.data, hora: e.hora_inicio, situacao: c.situacao, passado }];
    })
    .sort((a, b) => (b.data + b.hora).localeCompare(a.data + a.hora));
}

/** Agrupa as participações por usuário (página de Usuários). */
export async function participacoesPorUsuario(candidaturas: Candidatura[]) {
  const itens = await participacoesComEventos(candidaturas);
  const porEvento = new Map(itens.map((i) => [i.eventoId, i]));
  const mapa = new Map<string, ItemParticipacao[]>();
  for (const c of candidaturas) {
    const base = porEvento.get(c.evento_id);
    if (!base) continue;
    if (base.passado && c.situacao === "espera") continue;
    const lista = mapa.get(c.usuario_id) ?? [];
    lista.push({ ...base, situacao: c.situacao as "confirmada" | "espera" });
    mapa.set(c.usuario_id, lista);
  }
  for (const lista of mapa.values()) lista.sort((a, b) => (b.data + b.hora).localeCompare(a.data + a.hora));
  return mapa;
}
