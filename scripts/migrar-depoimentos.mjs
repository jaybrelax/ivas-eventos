// node --env-file=.env.local scripts/migrar-depoimentos.mjs [--check]
import { AppwriteException, Client, TablesDB } from "node-appwrite";

const client = new Client().setEndpoint(process.env.APPWRITE_ENDPOINT).setProject(process.env.APPWRITE_PROJECT_ID).setKey(process.env.APPWRITE_API_KEY);
const db = new TablesDB(client);
const databaseId = "ivas";
const tabelas = [
  { id: "avaliacoes_ritual", nome: "Avaliações após o ritual", notas: true },
  { id: "depoimentos_ritual", nome: "Depoimentos após o ritual", notas: false },
];
const ignorarExistente = async (nome, fn) => {
  try { await fn(); console.log(`Criado ${nome}`); }
  catch (e) { if (e instanceof AppwriteException && e.code === 409) console.log(`Já existe ${nome}`); else throw e; }
};

for (const tabela of tabelas) {
  const base = { databaseId, tableId: tabela.id };
  if (process.argv.includes("--check")) {
    const atual = await db.listColumns(base).catch((e) => { if (e instanceof AppwriteException && e.code === 404) return null; throw e; });
    console.log(`${tabela.id}: ${atual ? atual.columns.map((c) => `${c.key} ${c.status}`).join(", ") : "ausente"}`);
    continue;
  }
  await ignorarExistente(tabela.id, () => db.createTable({ ...base, name: tabela.nome, permissions: [], rowSecurity: false }));
  for (const chave of ["evento_id", "inscricao_id", "autor_id"]) {
    await ignorarExistente(`${tabela.id}.${chave}`, () => db.createVarcharColumn({ ...base, key: chave, size: 36, required: true }));
  }
  if (tabela.notas) {
    for (const chave of ["ritual", "mestres", "guardioes", "ambiente", "musica"]) {
      await ignorarExistente(`${tabela.id}.${chave}`, () => db.createFloatColumn({ ...base, key: chave, required: true, min: 1, max: 10 }));
    }
  } else {
    await ignorarExistente(`${tabela.id}.texto`, () => db.createVarcharColumn({ ...base, key: "texto", size: 2000, required: true }));
  }
  for (let tentativa = 0; tentativa < 60; tentativa++) {
    const { columns } = await db.listColumns(base);
    if (columns.some((c) => c.status === "failed")) throw new Error(`Falha nas colunas de ${tabela.id}`);
    if (columns.every((c) => c.status === "available")) break;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  for (const chave of ["evento_id", "inscricao_id"]) {
    await ignorarExistente(`${tabela.id}.ix_${chave}`, () => db.createIndex({ ...base, key: `ix_${chave}`, type: "key", columns: [chave] }));
  }
}
