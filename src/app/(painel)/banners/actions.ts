"use server";

import { revalidatePath } from "next/cache";
import { ID } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { exigir } from "@/lib/auth";
import { DB_ID, TABLES } from "@/lib/config";

export async function salvarModelo(nome: string, config: string, id?: string) {
  await exigir(["admin", "mestre"]);
  const n = nome.trim().slice(0, 80);
  if (!n) return { erro: "Dê um nome ao modelo." };
  const { tablesDB } = createAdminClient();
  const base = { databaseId: DB_ID, tableId: TABLES.modelos };
  const row = id
    ? await tablesDB.updateRow({ ...base, rowId: id, data: { nome: n, config } })
    : await tablesDB.createRow({ ...base, rowId: ID.unique(), data: { nome: n, config } });
  revalidatePath("/banners");
  return { ok: "Modelo salvo.", id: row.$id };
}

export async function excluirModelo(id: string) {
  await exigir(["admin", "mestre"]);
  const { tablesDB } = createAdminClient();
  await tablesDB.deleteRow({ databaseId: DB_ID, tableId: TABLES.modelos, rowId: id });
  revalidatePath("/banners");
  return { ok: "Modelo excluído." };
}
