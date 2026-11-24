import { Client, TablesDB } from "node-appwrite";

for (const nome of ["APPWRITE_ENDPOINT", "APPWRITE_PROJECT_ID", "APPWRITE_API_KEY"]) {
  if (!process.env[nome]) throw new Error(`Variável ausente: ${nome}`);
}

const db = new TablesDB(new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY));
const base = { databaseId: "ivas", tableId: "instituto" };
const key = "guarnicao_aprovacao_automatica";
const existente = (await db.listColumns(base)).columns.find((coluna) => coluna.key === key);

if (process.argv.includes("--check")) {
  console.log(existente ? `Coluna ${key}: ${existente.status}` : `Coluna ${key}: ausente`);
  if (existente?.status === "available") {
    const atual = await db.getRow({ ...base, rowId: "principal" });
    console.log(`Aprovação automática: ${atual[key] === false ? "desligada" : "ligada"}`);
  }
} else {
  if (!existente) {
    await db.createBooleanColumn({ ...base, key, required: false, xdefault: true });
    console.log(`Coluna ${key} criada com padrão ligado.`);
  } else {
    if (existente.type !== "boolean") throw new Error(`A coluna ${key} já existe com outro tipo.`);
    console.log(`Coluna ${key} já existe.`);
  }

  let pronta = false;
  for (let tentativa = 0; tentativa < 60; tentativa++) {
    const coluna = (await db.listColumns(base)).columns.find((item) => item.key === key);
    if (coluna?.status === "available") {
      pronta = true;
      break;
    }
    if (coluna?.status === "failed") throw new Error(`Falha ao criar a coluna ${key}.`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  if (!pronta) throw new Error(`Tempo esgotado ao aguardar a coluna ${key}.`);
  const atual = await db.getRow({ ...base, rowId: "principal" });
  if (typeof atual[key] !== "boolean") {
    await db.updateRow({ ...base, rowId: "principal", data: { [key]: true } });
    console.log("Aprovação automática inicializada como ligada.");
  }
  console.log("Configuração de aprovação pronta no Appwrite.");
}
