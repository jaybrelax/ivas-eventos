import "server-only";
import { createAdminClient } from "./appwrite";
import { DB_ID, TABLES } from "./config";

/**
 * Avisa os apps abertos que a escala de um evento mudou: grava o instante numa linha da tabela `sinais`
 * (sem dados pessoais), que o Realtime do Appwrite entrega a quem está escutando. Nunca lança erro.
 */
export async function sinalizarMudanca(eventoId: string) {
  try {
    const { tablesDB } = createAdminClient();
    const base = { databaseId: DB_ID, tableId: TABLES.sinais, rowId: eventoId };
    const data = { momento: `${new Date().toISOString()}#${Math.random().toString(36).slice(2, 8)}` };
    await tablesDB.updateRow({ ...base, data }).catch(async (e: unknown) => {
      if ((e as { code?: number }).code !== 404) throw e;
      await tablesDB.createRow({ ...base, data });
    });
  } catch (e) {
    console.error("Tempo real:", e instanceof Error ? e.message : e);
  }
}
