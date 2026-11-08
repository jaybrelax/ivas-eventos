import "server-only";
import { createAdminClient } from "./appwrite";
import { DB_ID, INSTITUTO_ROW_ID, TABLES } from "./config";
import type { Instituto } from "./types";

/** Lê sem fallback de rede: se o Appwrite falhar, o cadastro não libera acesso por engano. */
export async function aprovacaoAutomaticaGuarnicao(): Promise<boolean> {
  const { tablesDB } = createAdminClient();
  const instituto = await tablesDB.getRow({ databaseId: DB_ID, tableId: TABLES.instituto, rowId: INSTITUTO_ROW_ID }) as Partial<Instituto>;
  return instituto.guarnicao_aprovacao_automatica !== false;
}
