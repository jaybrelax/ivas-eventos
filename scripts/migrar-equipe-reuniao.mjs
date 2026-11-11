import { Client, TablesDB } from "node-appwrite";

for (const nome of ["APPWRITE_ENDPOINT", "APPWRITE_PROJECT_ID", "APPWRITE_API_KEY"]) {
  if (!process.env[nome]) throw new Error(`Variável ausente: ${nome}`);
}

const db = new TablesDB(new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY));
const base = { databaseId: "ivas", tableId: "eventos" };
const key = "guardioes_escalados_reuniao";
let coluna = (await db.listColumns(base)).columns.find((item) => item.key === key);

if (process.argv.includes("--check")) {
  console.log(coluna ? `Coluna ${key}: ${coluna.status}` : `Coluna ${key}: ausente`);
  process.exit(0);
}

if (!coluna) {
  await db.createVarcharColumn({ ...base, key, size: 36, required: false, array: true });
  console.log(`Coluna ${key} criada.`);
} else if (coluna.type !== "string" || !coluna.array) {
  throw new Error(`A coluna ${key} já existe com outro formato.`);
}

for (let tentativa = 0; tentativa < 60; tentativa++) {
  coluna = (await db.listColumns(base)).columns.find((item) => item.key === key);
  if (coluna?.status === "available") {
    console.log(`Coluna ${key} pronta.`);
    process.exit(0);
  }
  if (coluna?.status === "failed") throw new Error(`Falha ao criar a coluna ${key}.`);
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
throw new Error(`Tempo esgotado ao aguardar a coluna ${key}.`);
