// Cria no Instituto as colunas da gestão do ritual pelo guardião (ligada, 48 h). Idempotente.
// Uso: node --env-file=.env.local scripts/migrar-gestao-guardiao.mjs [--check]
import { Client, TablesDB } from "node-appwrite";

for (const nome of ["APPWRITE_ENDPOINT", "APPWRITE_PROJECT_ID", "APPWRITE_API_KEY"]) {
  if (!process.env[nome]) throw new Error(`Variável ausente: ${nome}`);
}
const db = new TablesDB(new Client().setEndpoint(process.env.APPWRITE_ENDPOINT).setProject(process.env.APPWRITE_PROJECT_ID).setKey(process.env.APPWRITE_API_KEY));
const base = { databaseId: "ivas", tableId: "instituto" };
const ATIVA = "gestao_guardiao_ativa";
const HORAS = "gestao_guardiao_horas";
const ESCOPO = "gestao_mestre_escopo";
const LEITURA = "gestao_guardiao_leitura_todos";
const DOSAGENS = "gestao_guardiao_ver_dosagens";
const FINANCEIRO = "gestao_guardiao_ver_financeiro";
const LEITURA_COLUNAS = [LEITURA, DOSAGENS, FINANCEIRO];

import { Query } from "node-appwrite";
const colunas = async () => (await db.listColumns({ ...base, queries: [Query.limit(200)] })).columns;
const achar = async (key) => (await colunas()).find((c) => c.key === key);

if (process.argv.includes("--check")) {
  for (const key of [ATIVA, HORAS, ESCOPO, ...LEITURA_COLUNAS]) console.log(`Coluna ${key}: ${(await achar(key))?.status ?? "ausente"}`);
  if ((await achar(ATIVA))?.status === "available" && (await achar(HORAS))?.status === "available") {
    const atual = await db.getRow({ ...base, rowId: "principal" });
    console.log(`Gestão do guardião: ${atual[ATIVA] === false ? "desligada" : "ligada"}, ${atual[HORAS] ?? 48} h`);
  }
} else {
  if (!(await achar(ATIVA))) { await db.createBooleanColumn({ ...base, key: ATIVA, required: false, xdefault: true }); console.log(`Coluna ${ATIVA} criada.`); }
  if (!(await achar(ESCOPO))) { await db.createStringColumn({ ...base, key: ESCOPO, size: 16, required: false, xdefault: "escalado" }); console.log(`Coluna ${ESCOPO} criada.`); }
  if (!(await achar(HORAS))) { await db.createIntegerColumn({ ...base, key: HORAS, required: false, min: 0, max: 240, xdefault: 48 }); console.log(`Coluna ${HORAS} criada.`); }
  for (const key of LEITURA_COLUNAS) {
    if (!(await achar(key))) { await db.createBooleanColumn({ ...base, key, required: false, xdefault: false }); console.log(`Coluna ${key} criada.`); }
  }
  for (const key of [ATIVA, HORAS, ESCOPO, ...LEITURA_COLUNAS]) {
    let pronta = false;
    for (let t = 0; t < 60 && !pronta; t++) {
      const c = await achar(key);
      if (c?.status === "available") pronta = true;
      else if (c?.status === "failed") throw new Error(`Falha ao criar a coluna ${key}.`);
      else await new Promise((r) => setTimeout(r, 1000));
    }
    if (!pronta) throw new Error(`Tempo esgotado aguardando a coluna ${key}.`);
  }
  const atual = await db.getRow({ ...base, rowId: "principal" });
  const data = {};
  if (typeof atual[ATIVA] !== "boolean") data[ATIVA] = true;
  if (typeof atual[HORAS] !== "number") data[HORAS] = 48;
  if (typeof atual[ESCOPO] !== "string") data[ESCOPO] = "escalado";
  for (const key of LEITURA_COLUNAS) if (typeof atual[key] !== "boolean") data[key] = false;
  if (Object.keys(data).length) { await db.updateRow({ ...base, rowId: "principal", data }); console.log("Valores iniciais gravados (ligada, 48 h)."); }
  console.log("Gestão do guardião pronta no Appwrite.");
}
