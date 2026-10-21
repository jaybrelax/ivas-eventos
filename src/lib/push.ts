import "server-only";
import { createHash } from "node:crypto";
import webpush from "web-push";
import { ID, Query } from "node-appwrite";
import { createAdminClient } from "./appwrite";
import { DB_ID, TABLES } from "./config";
import { listar } from "./data";

/**
 * Notificações push do app da Guarnição (Web Push com chaves VAPID).
 * Cada aparelho inscrito vira uma linha em `push_inscricoes`; aparelhos que saíram (404/410) são apagados.
 */
type Inscricao = { $id: string; usuario_id: string; chave: string; endpoint: string; p256dh: string; auth: string };
export type AvisoPush = { titulo: string; corpo: string; url?: string; tag?: string };

const base = { databaseId: DB_ID, tableId: TABLES.push };
const chaveDe = (endpoint: string) => createHash("sha256").update(endpoint).digest("hex");

function configurado() {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:contato@virtudes.net.br", pub, priv);
  return true;
}

/** Guarda (ou atualiza) a inscrição deste aparelho para o usuário. */
export async function salvarInscricao(usuarioId: string, sub: { endpoint: string; keys: { p256dh: string; auth: string } }) {
  const { tablesDB } = createAdminClient();
  const chave = chaveDe(sub.endpoint);
  const dados = { usuario_id: usuarioId, chave, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth };
  const atual = await listar<Inscricao>(TABLES.push, [Query.equal("chave", chave), Query.limit(1)]);
  if (atual[0]) await tablesDB.updateRow({ ...base, rowId: atual[0].$id, data: dados });
  else await tablesDB.createRow({ ...base, rowId: ID.unique(), data: dados });
}

/** Remove a inscrição deste aparelho — só se for da própria pessoa. */
export async function removerInscricao(endpoint: string, usuarioId: string) {
  const { tablesDB } = createAdminClient();
  const atual = await listar<Inscricao>(TABLES.push, [Query.equal("chave", chaveDe(String(endpoint))), Query.equal("usuario_id", usuarioId), Query.limit(5)]);
  for (const r of atual) await tablesDB.deleteRow({ ...base, rowId: r.$id }).catch(() => {});
}

/** Envia um aviso para todos os aparelhos das pessoas indicadas. Nunca lança erro (aviso é complementar). */
export async function enviarPush(usuarioIds: string[], aviso: AvisoPush) {
  const ids = [...new Set(usuarioIds)].filter(Boolean);
  if (!ids.length || !configurado()) return 0;
  try {
    const { tablesDB } = createAdminClient();
    const inscricoes: Inscricao[] = [];
    for (let i = 0; i < ids.length; i += 100) {
      inscricoes.push(...(await listar<Inscricao>(TABLES.push, [Query.equal("usuario_id", ids.slice(i, i + 100))])));
    }
    const corpo = JSON.stringify({ titulo: aviso.titulo, corpo: aviso.corpo, url: aviso.url ?? "/guarnicao", tag: aviso.tag });
    let enviados = 0;
    await Promise.all(
      inscricoes.map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, corpo, { TTL: 60 * 60 * 12 });
          enviados++;
        } catch (e) {
          const status = (e as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) await tablesDB.deleteRow({ ...base, rowId: s.$id }).catch(() => {});
          else console.error("Push:", status ?? (e instanceof Error ? e.message : e));
        }
      }),
    );
    return enviados;
  } catch (e) {
    console.error("Push (geral):", e instanceof Error ? e.message : e);
    return 0;
  }
}
