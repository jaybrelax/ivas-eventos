// Cria só o que os pacotes de créditos precisam: as tabelas planos_pacote, pacotes, creditos, usos_credito e
// movimentos_credito, a coluna `credito_id` e o valor "credito" em `inscricoes`, e os novos valores do histórico.
// Não mexe em dados existentes. Pode rodar de novo: o que já existe é pulado.
// Uso:  node --env-file=.env.local scripts/migrar-creditos.mjs            (cria)
//       node --env-file=.env.local scripts/migrar-creditos.mjs --check    (só mostra o estado)

import { AppwriteException, Client, Query, TablesDB } from "node-appwrite";
import { HISTORICO_ACOES, INSCRICOES_COLUNA_CREDITO, INSCRICOES_COLUNA_FORMA, INSCRICOES_PAGAMENTO, TABELAS_CREDITOS } from "./creditos-schema.mjs";

for (const nome of ["APPWRITE_ENDPOINT", "APPWRITE_PROJECT_ID", "APPWRITE_API_KEY"]) {
  if (!process.env[nome]) throw new Error(`Variável ausente: ${nome}`);
}

const client = new Client().setEndpoint(process.env.APPWRITE_ENDPOINT).setProject(process.env.APPWRITE_PROJECT_ID).setKey(process.env.APPWRITE_API_KEY);
const db = new TablesDB(client);
const DB = "ivas";

const existe = (e) => e instanceof AppwriteException && e.code === 409;
const sumiu = (e) => e instanceof AppwriteException && e.code === 404;
async function talvez(rotulo, fn) {
  try { await fn(); console.log("  ✓", rotulo); }
  catch (e) { if (existe(e)) console.log("  ·", rotulo, "(já existe)"); else throw e; }
}

async function criarColuna(tableId, [tipo, key, o]) {
  const base = { databaseId: DB, tableId, key, required: !!o.required };
  const def = o.required ? undefined : o.xdefault;
  if (tipo === "varchar") return db.createVarcharColumn({ ...base, size: o.size, xdefault: def, array: !!o.array });
  if (tipo === "text") return db.createTextColumn({ ...base, xdefault: def });
  if (tipo === "boolean") return db.createBooleanColumn({ ...base, xdefault: def });
  if (tipo === "integer") return db.createIntegerColumn({ ...base, min: o.min, max: o.max, xdefault: def });
  if (tipo === "enum") return db.createEnumColumn({ ...base, elements: o.elements, xdefault: def });
  if (tipo === "float") return db.createFloatColumn({ ...base, min: o.min, max: o.max, xdefault: def });
  if (tipo === "datetime") return db.createDatetimeColumn({ ...base, xdefault: def });
  throw new Error("tipo desconhecido " + tipo);
}

async function esperarColunas(tableId) {
  for (let n = 0; n < 60; n++) {
    const { columns } = await db.listColumns({ databaseId: DB, tableId });
    const falhas = columns.filter((c) => c.status === "failed");
    if (falhas.length) throw new Error(`Colunas com falha em ${tableId}: ${falhas.map((c) => c.key).join(", ")}`);
    if (columns.every((c) => c.status === "available")) return;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("Tempo esgotado esperando colunas de " + tableId);
}

/** Acrescenta ao enum os valores que faltam (nunca remove). */
async function completarEnum(tableId, key, elementos, padrao) {
  const { columns } = await db.listColumns({ databaseId: DB, tableId });
  const atual = columns.find((c) => c.key === key);
  if (!atual) { console.log(`  ! coluna ${tableId}.${key} não existe (rode npm run setup)`); return; }
  const falta = elementos.filter((e) => !atual.elements?.includes(e));
  if (!falta.length) { console.log(`  · enum ${tableId}.${key} (já completo)`); return; }
  await db.updateEnumColumn({ databaseId: DB, tableId, key, elements: [...atual.elements, ...falta], required: false, xdefault: padrao });
  console.log(`  ✓ enum ${tableId}.${key}: + ${falta.join(", ")}`);
  await esperarColunas(tableId);
}

if (process.argv.includes("--check")) {
  for (const tableId of [...Object.keys(TABELAS_CREDITOS), "inscricoes", "historico_inscricoes"]) {
    try {
      const { columns } = await db.listColumns({ databaseId: DB, tableId });
      const { indexes } = await db.listIndexes({ databaseId: DB, tableId });
      console.log(`Tabela ${tableId}: ${columns.length} colunas, ${indexes.length} índices`);
      if (tableId === "inscricoes") {
        const pg = columns.find((c) => c.key === "pagamento");
        console.log(`  coluna credito_id: ${columns.some((c) => c.key === "credito_id") ? "ok" : "AUSENTE"}`);
        console.log(`  coluna forma_pagamento: ${columns.some((c) => c.key === "forma_pagamento") ? "ok" : "AUSENTE"}`);
        console.log(`  pagamento aceita "credito": ${pg?.elements?.includes("credito") ? "ok" : "NÃO"}`);
      }
      if (tableId === "creditos") {
        const trava = columns.find((c) => c.key === "trava");
        console.log(`  coluna trava: ${trava ? trava.status : "AUSENTE"}`);
      }
      if (tableId === "historico_inscricoes") {
        const ac = columns.find((c) => c.key === "acao");
        console.log(`  acao aceita credito_usado: ${ac?.elements?.includes("credito_usado") ? "ok" : "NÃO"}`);
      }
    } catch (e) {
      if (sumiu(e)) console.log(`Tabela ${tableId}: ausente`); else throw e;
    }
  }
  process.exit(0);
}

for (const [tableId, def] of Object.entries(TABELAS_CREDITOS)) {
  console.log(`Tabela ${tableId}`);
  await talvez("tabela", () => db.createTable({ databaseId: DB, tableId, name: def.nome, permissions: [], rowSecurity: false }));
  for (const col of def.colunas) await talvez(`coluna ${col[1]}`, () => criarColuna(tableId, col));
  await esperarColunas(tableId);
  for (const [key, type, columns] of def.indices ?? []) {
    await talvez(`índice ${key}`, () => db.createIndex({ databaseId: DB, tableId, key, type, columns }));
  }
}

console.log("Tabela inscricoes");
await talvez("coluna credito_id", () => criarColuna("inscricoes", INSCRICOES_COLUNA_CREDITO));
await talvez("coluna forma_pagamento", () => criarColuna("inscricoes", INSCRICOES_COLUNA_FORMA));
await esperarColunas("inscricoes");
await completarEnum("inscricoes", "pagamento", INSCRICOES_PAGAMENTO, "pendente");

console.log("Tabela historico_inscricoes");
await completarEnum("historico_inscricoes", "acao", HISTORICO_ACOES, "inscricao");

// Trava atômica: créditos já usados ficam com trava 0; os demais com 1. Só grava quando o valor muda.
console.log("Créditos: preenchendo a trava");
{
  let depois = null, alterados = 0;
  for (;;) {
    const { rows } = await db.listRows({ databaseId: DB, tableId: "creditos", queries: [Query.limit(500), ...(depois ? [Query.cursorAfter(depois)] : [])] });
    for (const c of rows) {
      const deveSer = c.situacao === "utilizado" ? 0 : 1;
      if (c.trava !== deveSer) {
        await db.updateRow({ databaseId: DB, tableId: "creditos", rowId: c.$id, data: { trava: deveSer } });
        alterados++;
      }
    }
    if (rows.length < 500) break;
    depois = rows[rows.length - 1].$id;
  }
  console.log(`  ✓ ${alterados} crédito(s) ajustado(s)`);
}

// Tabela antiga da trava: só é apagada com --remover-usos e se estiver vazia
if (process.argv.includes("--remover-usos")) {
  try {
    const { total } = await db.listRows({ databaseId: DB, tableId: "usos_credito", queries: [Query.limit(1)] });
    if (total > 0) console.log(`  ! usos_credito tem ${total} linha(s): não apaguei`);
    else { await db.deleteTable({ databaseId: DB, tableId: "usos_credito" }); console.log("  ✓ tabela usos_credito apagada"); }
  } catch (e) {
    if (sumiu(e)) console.log("  · usos_credito (já não existe)"); else throw e;
  }
}

console.log("Pronto.");
