import "server-only";
import { createAdminClient } from "./appwrite";
import { DB_ID, IA_ROW_ID, TABLES } from "./config";

export type ConfigIA = { chave: string | null; prompt: string };

/** Chave da OpenAI e prompt personalizado. Só para código de servidor: a chave nunca vai ao navegador. */
export async function getConfigIA(): Promise<ConfigIA> {
  const { tablesDB } = createAdminClient();
  try {
    const row = await tablesDB.getRow({ databaseId: DB_ID, tableId: TABLES.instituto, rowId: IA_ROW_ID });
    const r = row as unknown as { openai_api_key?: string | null; prompt_imagem?: string | null };
    return { chave: r.openai_api_key?.trim() || null, prompt: r.prompt_imagem?.trim() ?? "" };
  } catch {
    return { chave: null, prompt: "" };
  }
}

/** Só os fins de uma chave, para mostrar “sk-…a1b2” sem expor o valor. */
export function mascararChave(chave: string | null) {
  if (!chave) return null;
  return `${chave.slice(0, 3)}…${chave.slice(-4)}`;
}
