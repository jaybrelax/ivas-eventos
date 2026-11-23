// Cria só o que a Central do evento precisa: a tabela `central_posts` (colunas e índices) e o bucket
// privado `central`. Não mexe em nenhuma outra tabela. Pode rodar de novo: o que já existe é pulado.
// Uso:  node --env-file=.env.local scripts/migrar-central.mjs            (cria)
//       node --env-file=.env.local scripts/migrar-central.mjs --check    (só mostra o estado)

import { AppwriteException, Client, Storage, TablesDB } from "node-appwrite";

for (const nome of ["APPWRITE_ENDPOINT", "APPWRITE_PROJECT_ID", "APPWRITE_API_KEY"]) {
  if (!process.env[nome]) throw new Error(`Variável ausente: ${nome}`);
}

const client = new Client().setEndpoint(process.env.APPWRITE_ENDPOINT).setProject(process.env.APPWRITE_PROJECT_ID).setKey(process.env.APPWRITE_API_KEY);
const db = new TablesDB(client);
const storage = new Storage(client);
const DB = "ivas";
const TABELA = "central_posts";
const BUCKET = "central";

const existe = (e) => e instanceof AppwriteException && e.code === 409;
const sumiu = (e) => e instanceof AppwriteException && e.code === 404;
async function talvez(rotulo, fn) {
  try { await fn(); console.log("  ✓", rotulo); }
  catch (e) { if (existe(e)) console.log("  ·", rotulo, "(já existe)"); else throw e; }
}

if (process.argv.includes("--check")) {
  try {
    const { columns } = await db.listColumns({ databaseId: DB, tableId: TABELA });
    const { indexes } = await db.listIndexes({ databaseId: DB, tableId: TABELA });
    console.log(`Tabela ${TABELA}: ${columns.length} colunas (${columns.map((c) => `${c.key}:${c.status}`).join(", ")})`);
    console.log(`Índices: ${indexes.map((i) => `${i.key}:${i.status}`).join(", ") || "nenhum"}`);
  } catch (e) {
    if (sumiu(e)) console.log(`Tabela ${TABELA}: ausente`); else throw e;
  }
  try { await storage.getBucket({ bucketId: BUCKET }); console.log(`Bucket ${BUCKET}: ok`); }
  catch (e) { if (sumiu(e)) console.log(`Bucket ${BUCKET}: ausente`); else throw e; }
  process.exit(0);
}

const base = { databaseId: DB, tableId: TABELA };
console.log(`Tabela ${TABELA}`);
await talvez("tabela", () => db.createTable({ ...base, name: "Central do evento", permissions: [], rowSecurity: false }));
await talvez("coluna evento_id", () => db.createVarcharColumn({ ...base, key: "evento_id", size: 36, required: true }));
await talvez("coluna autor_id", () => db.createVarcharColumn({ ...base, key: "autor_id", size: 36, required: true }));
await talvez("coluna tipo", () => db.createEnumColumn({ ...base, key: "tipo", elements: ["aviso", "lembrete", "ocorrencia", "tarefa"], required: false, xdefault: "aviso" }));
await talvez("coluna texto", () => db.createVarcharColumn({ ...base, key: "texto", size: 4000, required: false }));
await talvez("coluna mencoes", () => db.createVarcharColumn({ ...base, key: "mencoes", size: 36, required: false, array: true }));
await talvez("coluna imagens", () => db.createVarcharColumn({ ...base, key: "imagens", size: 36, required: false, array: true }));
await talvez("coluna fixado", () => db.createBooleanColumn({ ...base, key: "fixado", required: false, xdefault: false }));
await talvez("coluna concluida_por", () => db.createVarcharColumn({ ...base, key: "concluida_por", size: 36, required: false }));
await talvez("coluna concluida_em", () => db.createDatetimeColumn({ ...base, key: "concluida_em", required: false }));
await talvez("coluna editado_em", () => db.createDatetimeColumn({ ...base, key: "editado_em", required: false }));

// Os índices só podem ser criados com as colunas prontas
for (let n = 0; n < 60; n++) {
  const { columns } = await db.listColumns(base);
  if (columns.some((c) => c.status === "failed")) throw new Error("Coluna com falha: " + columns.filter((c) => c.status === "failed").map((c) => c.key).join(", "));
  if (columns.every((c) => c.status === "available")) break;
  await new Promise((r) => setTimeout(r, 1000));
}
await talvez("índice ix_central_evento", () => db.createIndex({ ...base, key: "ix_central_evento", type: "key", columns: ["evento_id"] }));
// Sem índice em `mencoes`/`imagens`: o Appwrite não indexa colunas de lista (as buscas por eles funcionam sem índice).

console.log("Storage");
await talvez(`bucket ${BUCKET}`, () =>
  storage.createBucket({
    bucketId: BUCKET, name: "Fotos da Central do evento", permissions: [], fileSecurity: false,
    maximumFileSize: 3 * 1024 * 1024, allowedFileExtensions: ["png", "jpg", "jpeg", "webp"],
  }),
);
console.log("Pronto.");
