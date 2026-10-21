import "server-only";
import { Query } from "node-appwrite";
import { createAdminClient } from "./appwrite";
import { DB_ID, TABLES } from "./config";
import { inicioDe } from "./guarnicao";
import { listarEventos, listarTipos } from "./data";
import type { Evento } from "./types";

export type ItemRenumeracao = {
  id: string;
  titulo: string;
  data: string;
  hora: string;
  geralAtual: number | null;
  geralNovo: number;
  anoAtual: number | null;
  numeroAnoAtual: number | null;
  anoNovo: number;
  numeroAnoNovo: number;
};

export type PlanoRenumeracao =
  | { ok: true; base: { titulo: string; geral: number; numeroAno: number | null; ano: number | null }; itens: ItemRenumeracao[]; semMudanca: number }
  | { ok: false; erro: string };

/**
 * Plano para renumerar, em ordem de data e hora, os rituais que vêm depois do evento indicado:
 * ele mantém o número e os seguintes recebem N+1, N+2… Só entram tipos que contam como ritual.
 * O número do ano continua dentro do mesmo ano e recomeça em 1 num ano novo.
 */
export async function planejarRenumeracao(eventoId: string): Promise<PlanoRenumeracao> {
  const [eventos, tipos] = await Promise.all([listarEventos(), listarTipos()]);
  const ehRitual = new Set(tipos.filter((t) => t.conta_como_ritual).map((t) => t.$id));
  const rituais = eventos.filter((e) => ehRitual.has(e.tipo_id));
  const base = rituais.find((e) => e.$id === eventoId);
  if (!base) return { ok: false, erro: "Este evento não conta como ritual." };
  if (!base.ritual_numero_geral) return { ok: false, erro: "Este ritual ainda não tem número. Salve o evento primeiro." };

  const chave = (e: Evento) => inicioDe(e).getTime();
  const ordem = (a: Evento, b: Evento) => chave(a) - chave(b) || (a.ritual_numero_geral ?? 1e9) - (b.ritual_numero_geral ?? 1e9) || a.$id.localeCompare(b.$id);
  const ordenados = [...rituais].sort(ordem);
  const pos = ordenados.findIndex((e) => e.$id === base.$id);
  const antes = ordenados.slice(0, pos);
  const depois = ordenados.slice(pos + 1);

  const N = base.ritual_numero_geral;
  const novosGerais = new Set(depois.map((_, i) => N + 1 + i));
  const choque = antes.find((e) => e.ritual_numero_geral && e.ritual_numero_geral >= N && novosGerais.has(e.ritual_numero_geral));
  if (choque) {
    return { ok: false, erro: `O ritual "${choque.titulo}" (${choque.data}) é anterior a este mas tem o Nº ${choque.ritual_numero_geral}. Corrija a numeração dele antes.` };
  }

  const anoBase = base.ritual_ano ?? Number(base.data.slice(0, 4));
  let ultimoAno = anoBase;
  let ultimoNumAno = base.ritual_numero_ano ?? 1;
  const itens: ItemRenumeracao[] = [];
  let semMudanca = 0;
  depois.forEach((e, i) => {
    const ano = Number(e.data.slice(0, 4));
    let numAno: number;
    if (ano === ultimoAno) numAno = ultimoNumAno + 1;
    else numAno = Math.max(0, ...antes.filter((x) => x.ritual_ano === ano).map((x) => x.ritual_numero_ano ?? 0)) + 1;
    ultimoAno = ano;
    ultimoNumAno = numAno;
    const geral = N + 1 + i;
    if (e.ritual_numero_geral === geral && e.ritual_ano === ano && e.ritual_numero_ano === numAno) return void semMudanca++;
    itens.push({
      id: e.$id, titulo: e.titulo, data: e.data, hora: e.hora_inicio,
      geralAtual: e.ritual_numero_geral, geralNovo: geral,
      anoAtual: e.ritual_ano, numeroAnoAtual: e.ritual_numero_ano, anoNovo: ano, numeroAnoNovo: numAno,
    });
  });
  return { ok: true, base: { titulo: base.titulo, geral: N, numeroAno: base.ritual_numero_ano, ano: base.ritual_ano }, itens, semMudanca };
}

/**
 * Aplica o plano em duas fases: primeiro leva cada evento a um número provisório (alto e livre) e só então grava
 * o número final. Assim os índices únicos nunca colidem no meio do caminho, nem quando os números só se trocam de lugar.
 */
export async function aplicarRenumeracao(plano: Extract<PlanoRenumeracao, { ok: true }>) {
  if (!plano.itens.length) return 0;
  const { tablesDB } = createAdminClient();
  const base = { databaseId: DB_ID, tableId: TABLES.eventos };
  const maior = (await tablesDB.listRows({ ...base, queries: [Query.isNotNull("ritual_numero_geral"), Query.orderDesc("ritual_numero_geral"), Query.limit(1)], total: false })).rows[0]?.ritual_numero_geral as number | undefined;
  const provisorio = Math.max(maior ?? 0, ...plano.itens.map((i) => i.geralNovo)) + 1000;
  for (const [i, it] of plano.itens.entries()) {
    await tablesDB.updateRow({ ...base, rowId: it.id, data: { ritual_numero_geral: provisorio + i, ritual_ano: it.anoNovo, ritual_numero_ano: 100000 + i } });
  }
  for (const it of plano.itens) {
    await tablesDB.updateRow({ ...base, rowId: it.id, data: { ritual_numero_geral: it.geralNovo, ritual_ano: it.anoNovo, ritual_numero_ano: it.numeroAnoNovo } });
  }
  return plano.itens.length;
}
