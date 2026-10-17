import "server-only";
import { AppwriteException, Query } from "node-appwrite";
import { createAdminClient } from "./appwrite";
import { DB_ID, TABLES } from "./config";
import { getInstituto } from "./data";

/**
 * Próximos números de ritual.
 * - Geral: sequência única para todos os tipos que contam como ritual, começa em
 *   instituto.ritual_numero_inicial (500).
 * - Ano: reinicia em 1 a cada ano civil.
 */
export async function proximosNumeros(ano: number) {
  const { tablesDB } = createAdminClient();
  const [ultimoGeral, ultimoAno, instituto] = await Promise.all([
    tablesDB.listRows({
      databaseId: DB_ID,
      tableId: TABLES.eventos,
      queries: [Query.isNotNull("ritual_numero_geral"), Query.orderDesc("ritual_numero_geral"), Query.limit(1)],
      total: false,
    }),
    tablesDB.listRows({
      databaseId: DB_ID,
      tableId: TABLES.eventos,
      queries: [Query.equal("ritual_ano", ano), Query.orderDesc("ritual_numero_ano"), Query.limit(1)],
      total: false,
    }),
    getInstituto(),
  ]);
  const g = ultimoGeral.rows[0]?.ritual_numero_geral as number | undefined;
  const a = ultimoAno.rows[0]?.ritual_numero_ano as number | undefined;
  return {
    ritual_numero_geral: g ? g + 1 : instituto.ritual_numero_inicial,
    ritual_ano: ano,
    ritual_numero_ano: a ? a + 1 : 1,
  };
}

export function isConflito(e: unknown) {
  return e instanceof AppwriteException && e.code === 409;
}

/**
 * Executa `gravar` com os próximos números; se o índice único recusar
 * (dois cadastros ao mesmo tempo), recalcula e tenta de novo.
 */
export async function comNumeracao<T>(
  ano: number,
  gravar: (n: Awaited<ReturnType<typeof proximosNumeros>>) => Promise<T>,
  tentativas = 5,
): Promise<T> {
  for (let i = 0; i < tentativas; i++) {
    const n = await proximosNumeros(ano);
    try {
      return await gravar(n);
    } catch (e) {
      if (!isConflito(e) || i === tentativas - 1) throw e;
      await new Promise((r) => setTimeout(r, 80 + Math.random() * 200));
    }
  }
  throw new Error("Não foi possível numerar o ritual");
}
