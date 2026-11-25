import "server-only";
import { Query } from "node-appwrite";
import { createAdminClient } from "./appwrite";
import { DB_ID, TABLES } from "./config";
import { apagarFotoDe, labelsComFuncao, perfilDosLabels, prefsDe } from "./usuarios";

type Linha = Record<string, unknown> & { $id: string };
export type ResultadoMescla = { ok?: string; erro?: string };

/** Lê a tabela inteira (de 500 em 500). As tabelas são pequenas e várias colunas de usuário não têm índice. */
async function todasAsLinhas(tableId: string): Promise<Linha[]> {
  const { tablesDB } = createAdminClient();
  const todas: Linha[] = [];
  let depois: string | null = null;
  for (;;) {
    const q: string[] = [Query.limit(500)];
    if (depois) q.push(Query.cursorAfter(depois));
    const res = await tablesDB.listRows({ databaseId: DB_ID, tableId, queries: q });
    todas.push(...(res.rows as unknown as Linha[]));
    if (res.rows.length < 500) return todas;
    depois = res.rows[res.rows.length - 1].$id;
  }
}

const trocar = (v: unknown, de: string, para: string) => (v === de ? para : v);
const trocarLista = (v: unknown, de: string, para: string): string[] => [...new Set((Array.isArray(v) ? (v as string[]) : []).map((x) => (x === de ? para : x)))];
const temId = (v: unknown, id: string) => (Array.isArray(v) ? (v as unknown[]).includes(id) : v === id);

/** Colunas de cada tabela que guardam o id de um usuário (texto simples). */
const COLUNAS: { tabela: string; colunas: string[] }[] = [
  { tabela: TABLES.inscricoes, colunas: ["usuario_id", "alterado_por"] },
  { tabela: TABLES.historicoInscricoes, colunas: ["usuario_id", "por"] },
  { tabela: TABLES.candidaturas, colunas: ["usuario_id", "alterado_por"] },
  { tabela: TABLES.push, colunas: ["usuario_id"] },
  { tabela: TABLES.pacotes, colunas: ["usuario_id", "confirmado_por", "criado_por"] },
  { tabela: TABLES.creditos, colunas: ["comprador_id", "titular_id", "cedido_de"] },
  { tabela: TABLES.movimentosCredito, colunas: ["usuario_id", "de_usuario", "para_usuario", "por"] },
];

/** Pessoa com e-mail e/ou senha: a que deve ficar quando a outra é uma conta rápida. */
export type ResumoConta = {
  id: string; nome: string; email: string | null; telefone: string | null; foto: string | null;
  comSenha: boolean; rapida: boolean; equipe: boolean; inscricoes: number; candidaturas: number; pacotes: number; creditos: number;
};

/** Números de uma conta para a tela de confirmação da mescla. */
export async function resumoDaConta(id: string): Promise<ResumoConta | null> {
  const { users } = createAdminClient();
  const u = await users.get({ userId: id }).catch(() => null);
  if (!u) return null;
  const [ins, cand, pac, cre] = await Promise.all([
    todasAsLinhas(TABLES.inscricoes), todasAsLinhas(TABLES.candidaturas), todasAsLinhas(TABLES.pacotes), todasAsLinhas(TABLES.creditos),
  ]);
  const p = prefsDe(u.prefs);
  return {
    id, nome: u.name || u.email || "Sem nome", email: u.email || null, telefone: p.telefone, foto: p.foto_file_id,
    comSenha: !!u.passwordUpdate, rapida: (u.labels ?? []).includes("avulso") || (u.prefs as Record<string, unknown>)?.avulso === true,
    equipe: !!perfilDosLabels(u.labels),
    inscricoes: ins.filter((r) => r.usuario_id === id).length,
    candidaturas: cand.filter((r) => r.usuario_id === id).length,
    pacotes: pac.filter((r) => r.usuario_id === id).length,
    creditos: cre.filter((r) => r.titular_id === id).length,
  };
}

/**
 * Junta duas contas da mesma pessoa: tudo o que está ligado à `origem` (inscrições, candidaturas, pacotes, créditos,
 * histórico, central, escalas, doses) passa para o `destino` e a origem é apagada.
 * Pode ser repetida se cair no meio: cada passo só mexe no que ainda aponta para a origem, e a conta só é apagada no fim.
 */
export async function mesclarContas(origemId: string, destinoId: string, porId: string): Promise<ResultadoMescla> {
  if (!origemId || !destinoId || origemId === destinoId) return { erro: "Escolha duas contas diferentes." };
  const { users, tablesDB } = createAdminClient();
  const [origem, destino] = await Promise.all([users.get({ userId: origemId }).catch(() => null), users.get({ userId: destinoId }).catch(() => null)]);
  if (!origem || !destino) return { erro: "Conta não encontrada." };
  if (perfilDosLabels(origem.labels)) return { erro: "A conta que será apagada tem acesso ao painel. Escolha-a como a que fica, ou tire o acesso antes." };

  const gravar = (tableId: string, rowId: string, data: Record<string, unknown>) => tablesDB.updateRow({ databaseId: DB_ID, tableId, rowId, data });
  const contagem: Record<string, number> = {};
  const conta = (nome: string) => { contagem[nome] = (contagem[nome] ?? 0) + 1; };

  // 1) Os dois não podem ter inscrição (ou candidatura) no mesmo evento: o banco só aceita uma por pessoa e evento
  const [inscricoes, candidaturas, eventos] = await Promise.all([todasAsLinhas(TABLES.inscricoes), todasAsLinhas(TABLES.candidaturas), todasAsLinhas(TABLES.eventos)]);
  const eventosDe = (linhas: Linha[], id: string) => new Set(linhas.filter((r) => r.usuario_id === id).map((r) => String(r.evento_id)));
  const repetidos = new Set<string>();
  for (const linhas of [inscricoes, candidaturas]) {
    const doDestino = eventosDe(linhas, destinoId);
    for (const ev of eventosDe(linhas, origemId)) if (doDestino.has(ev)) repetidos.add(ev);
  }
  if (repetidos.size) {
    const titulos = [...repetidos].map((ev) => String(eventos.find((e) => e.$id === ev)?.titulo ?? ev));
    return { erro: `As duas contas estão inscritas no mesmo evento: ${titulos.join(", ")}. Cancele uma das inscrições e tente de novo.` };
  }

  // 2) Colunas simples de cada tabela
  for (const { tabela, colunas } of COLUNAS) {
    const linhas = tabela === TABLES.inscricoes ? inscricoes : tabela === TABLES.candidaturas ? candidaturas : await todasAsLinhas(tabela);
    for (const l of linhas) {
      const mudar: Record<string, unknown> = {};
      for (const c of colunas) if (l[c] === origemId) mudar[c] = destinoId;
      if (!Object.keys(mudar).length) continue;
      if (tabela === TABLES.creditos) {
        const titular = (mudar.titular_id ?? l.titular_id) as string;
        const comprador = (mudar.comprador_id ?? l.comprador_id) as string;
        const cedido = (mudar.cedido_de ?? l.cedido_de) as string | null;
        // Cessão que virou da pessoa para ela mesma deixa de ser cessão
        if (titular === comprador || cedido === titular) { mudar.cedido_de = null; mudar.cedido_em = null; }
      }
      await gravar(tabela, l.$id, mudar);
      conta(tabela);
    }
  }

  // 3) Central do evento: autoria, conclusão, menções (coluna e texto)
  for (const post of await todasAsLinhas(TABLES.central)) {
    const mudar: Record<string, unknown> = {};
    if (post.autor_id === origemId) mudar.autor_id = destinoId;
    if (post.concluida_por === origemId) mudar.concluida_por = destinoId;
    if (temId(post.mencoes, origemId)) mudar.mencoes = trocarLista(post.mencoes, origemId, destinoId);
    if (typeof post.texto === "string" && post.texto.includes(`](${origemId})`)) mudar.texto = post.texto.split(`](${origemId})`).join(`](${destinoId})`);
    if (!Object.keys(mudar).length) continue;
    await gravar(TABLES.central, post.$id, mudar);
    conta(TABLES.central);
  }

  // 4) Eventos: escalas (mestres, guardiões, reunião), autoria e doses da equipe
  for (const e of eventos) {
    const mudar: Record<string, unknown> = {};
    for (const c of ["mestres", "guardioes", "guardioes_escalados_reuniao"]) if (temId(e[c], origemId)) mudar[c] = trocarLista(e[c], origemId, destinoId);
    for (const c of ["criado_por", "atualizado_por"]) if (e[c] === origemId) mudar[c] = trocar(e[c], origemId, destinoId);
    if (typeof e.doses_equipe === "string" && e.doses_equipe.includes(origemId)) {
      try {
        const doses = JSON.parse(e.doses_equipe) as Record<string, unknown[]>;
        if (doses[origemId]) {
          doses[destinoId] = [...(doses[destinoId] ?? []), ...doses[origemId]];
          delete doses[origemId];
          mudar.doses_equipe = JSON.stringify(doses);
        }
      } catch { /* JSON inválido: deixa como está */ }
    }
    if (!Object.keys(mudar).length) continue;
    await gravar(TABLES.eventos, e.$id, mudar);
    conta(TABLES.eventos);
  }

  // 5) Conta: dados da origem preenchem o que falta no destino; função e marcas; registro da mescla
  const prefsO = (origem.prefs ?? {}) as Record<string, unknown>;
  const prefsD = (destino.prefs ?? {}) as Record<string, unknown>;
  const vazio = (v: unknown) => v === undefined || v === null || v === "" || v === false;
  const novas: Record<string, unknown> = { ...prefsD };
  for (const [k, v] of Object.entries(prefsO)) {
    if (["avulso", "incluido_por", "contas_mescladas", "foto_file_id", "funcao_ritual"].includes(k)) continue;
    if (vazio(novas[k]) && !vazio(v)) novas[k] = v;
  }
  // Foto: a do destino; se não tiver, a da origem (e a que sobrar é apagada)
  if (vazio(prefsD.foto_file_id) && !vazio(prefsO.foto_file_id)) novas.foto_file_id = prefsO.foto_file_id;
  else if (!vazio(prefsO.foto_file_id)) await apagarFotoDe(origemId).catch(() => {});
  // Função de mestre/guardião: o destino ganha a da origem se não tiver nenhuma
  let labels = [...new Set([...(destino.labels ?? []), ...((origem.labels ?? []).includes("participante") ? ["participante"] : [])])];
  const funcaoD = prefsDe(destino.prefs).funcao_ritual;
  const funcaoO = prefsDe(origem.prefs).funcao_ritual;
  if (funcaoD === "nenhuma" && funcaoO !== "nenhuma") { novas.funcao_ritual = funcaoO; labels = labelsComFuncao(labels, funcaoO); }
  novas.contas_mescladas = [...(Array.isArray(prefsD.contas_mescladas) ? (prefsD.contas_mescladas as unknown[]) : []), { id: origemId, nome: origem.name || origem.email || "", email: origem.email || null, em: new Date().toISOString(), por: porId }].slice(-20);
  await users.updatePrefs({ userId: destinoId, prefs: novas });
  await users.updateLabels({ userId: destinoId, labels });

  // 6) Só agora a origem sai. Se o destino não tem e-mail, fica com o da origem (precisa liberar o e-mail antes)
  const emailOrigem = origem.email || "";
  await users.delete({ userId: origemId });
  if (emailOrigem && !destino.email) await users.updateEmail({ userId: destinoId, email: emailOrigem }).catch((e) => console.error("Mescla: e-mail não passou para a conta que ficou:", e instanceof Error ? e.message : e));

  const partes = [
    contagem[TABLES.inscricoes] && `${contagem[TABLES.inscricoes]} inscrição(ões)`,
    contagem[TABLES.pacotes] && `${contagem[TABLES.pacotes]} pacote(s)`,
    contagem[TABLES.creditos] && `${contagem[TABLES.creditos]} crédito(s)`,
    contagem[TABLES.candidaturas] && `${contagem[TABLES.candidaturas]} candidatura(s)`,
  ].filter(Boolean);
  return { ok: `Contas mescladas${partes.length ? `: passaram ${partes.join(", ")}` : ""}.` };
}
