// Adiciona preferências e exclusão mútua das cessões sem alterar créditos ou finanças.
// node --env-file=.env.local scripts/migrar-preferencias-creditos.mjs
import assert from "node:assert/strict";
import { AppwriteException, Client, ID, TablesDB } from "node-appwrite";
const { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY } = process.env;
if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) throw new Error("Configure o acesso ao Appwrite.");
const db = new TablesDB(new Client().setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID).setKey(APPWRITE_API_KEY));
for (const [rotulo, executar] of [
  ["config_creditos", () => db.createTextColumn({ databaseId: "ivas", tableId: "instituto", key: "config_creditos", required: false })],
  ["travas_cessao", () => db.createTable({ databaseId: "ivas", tableId: "travas_cessao", name: "Travas de cessão", permissions: [], rowSecurity: false })],
  ["travas_cessao.ativa", () => db.createBooleanColumn({ databaseId: "ivas", tableId: "travas_cessao", key: "ativa", required: true })],
]) {
  try { await executar(); console.log(`${rotulo}: criado.`); }
  catch (e) { if (e instanceof AppwriteException && e.code === 409) console.log(`${rotulo}: já existe.`); else throw e; }
}
if (process.argv.includes("--verificar")) {
  const coluna = await db.getColumn({ databaseId: "ivas", tableId: "instituto", key: "config_creditos" });
  assert.equal(coluna.status, "available");
  const tabela = await db.getTable({ databaseId: "ivas", tableId: "travas_cessao" });
  assert.deepEqual(tabela.$permissions, []);
  const rowId = ID.unique();
  await db.createRow({ databaseId: "ivas", tableId: "travas_cessao", rowId, data: { ativa: true } });
  try {
    await assert.rejects(() => db.createRow({ databaseId: "ivas", tableId: "travas_cessao", rowId, data: { ativa: true } }), (e) => e instanceof AppwriteException && e.code === 409);
    console.log("Verificado: coluna disponível, trava privada e exclusão mútua funcionando. Nenhum crédito alterado.");
  } finally {
    await db.deleteRow({ databaseId: "ivas", tableId: "travas_cessao", rowId });
  }
}
