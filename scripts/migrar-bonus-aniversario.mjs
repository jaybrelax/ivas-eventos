// Cria o bônus anual de aniversário sem tocar em pacotes nem em registros financeiros.
// Uso: node --env-file=.env.local scripts/migrar-bonus-aniversario.mjs
//       node --env-file=.env.local scripts/migrar-bonus-aniversario.mjs --check

import { AppwriteException, Client, TablesDB } from "node-appwrite";
import { HISTORICO_ACOES, INSCRICOES_PAGAMENTO } from "./creditos-schema.mjs";
import { HISTORICO_ACOES_BONUS, INSCRICOES_COLUNA_BONUS_ANIVERSARIO, INSCRICOES_PAGAMENTO_BONUS, TABELAS_BONUS_ANIVERSARIO } from "./bonus-aniversario-schema.mjs";

for (const nome of ["APPWRITE_ENDPOINT", "APPWRITE_PROJECT_ID", "APPWRITE_API_KEY"]) if (!process.env[nome]) throw new Error(`Variável ausente: ${nome}`);
const client = new Client().setEndpoint(process.env.APPWRITE_ENDPOINT).setProject(process.env.APPWRITE_PROJECT_ID).setKey(process.env.APPWRITE_API_KEY);
const db = new TablesDB(client);
const DB = "ivas";
const existe = (e) => e instanceof AppwriteException && e.code === 409;

async function talvez(rotulo, fn) {
  try { await fn(); console.log("  ✓", rotulo); }
  catch (e) { if (existe(e)) console.log("  ·", rotulo, "(já existe)"); else throw e; }
}
async function criarColuna(tableId, [tipo, key, o]) {
  const base = { databaseId: DB, tableId, key, required: !!o.required };
  const def = o.required ? undefined : o.xdefault;
  if (tipo === "varchar") return db.createVarcharColumn({ ...base, size: o.size, xdefault: def });
  if (tipo === "integer") return db.createIntegerColumn({ ...base, min: o.min, max: o.max, xdefault: def });
  if (tipo === "enum") return db.createEnumColumn({ ...base, elements: o.elements, xdefault: def });
  if (tipo === "datetime") return db.createDatetimeColumn({ ...base, xdefault: def });
  throw new Error(`Tipo desconhecido: ${tipo}`);
}
async function esperar(tableId) {
  for (let n = 0; n < 60; n++) {
    const { columns } = await db.listColumns({ databaseId: DB, tableId });
    if (columns.some((c) => c.status === "failed")) throw new Error(`Uma coluna de ${tableId} falhou ao criar.`);
    if (columns.every((c) => c.status === "available")) return;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Tempo esgotado esperando ${tableId}.`);
}
async function completarEnum(tableId, key, elementos, padrao) {
  const { columns } = await db.listColumns({ databaseId: DB, tableId });
  const atual = columns.find((c) => c.key === key);
  if (!atual) throw new Error(`Coluna ${tableId}.${key} não encontrada.`);
  const falta = elementos.filter((x) => !atual.elements?.includes(x));
  if (!falta.length) return console.log(`  · enum ${tableId}.${key} (já completo)`);
  await db.updateEnumColumn({ databaseId: DB, tableId, key, elements: [...atual.elements, ...falta], required: false, xdefault: padrao });
  await esperar(tableId);
  console.log(`  ✓ enum ${tableId}.${key}: + ${falta.join(", ")}`);
}

if (process.argv.includes("--check")) {
  const [{ columns: bonus }, { columns: inscricoes }, { columns: historico }] = await Promise.all([
    db.listColumns({ databaseId: DB, tableId: "bonus_aniversario" }).catch(() => ({ columns: [] })),
    db.listColumns({ databaseId: DB, tableId: "inscricoes" }),
    db.listColumns({ databaseId: DB, tableId: "historico_inscricoes" }),
  ]);
  console.log(`Tabela bônus: ${bonus.length ? "ok" : "AUSENTE"}`);
  console.log(`inscricoes.bonus_aniversario_id: ${inscricoes.some((c) => c.key === "bonus_aniversario_id") ? "ok" : "AUSENTE"}`);
  console.log(`pagamento aceita aniversário: ${inscricoes.find((c) => c.key === "pagamento")?.elements?.includes(INSCRICOES_PAGAMENTO_BONUS) ? "ok" : "NÃO"}`);
  console.log(`histórico aceita bônus: ${historico.find((c) => c.key === "acao")?.elements?.includes("bonus_aniversario_usado") ? "ok" : "NÃO"}`);
} else {
for (const [tableId, def] of Object.entries(TABELAS_BONUS_ANIVERSARIO)) {
  console.log(`Tabela ${tableId}`);
  await talvez("tabela", () => db.createTable({ databaseId: DB, tableId, name: def.nome, permissions: [], rowSecurity: false }));
  for (const coluna of def.colunas) await talvez(`coluna ${coluna[1]}`, () => criarColuna(tableId, coluna));
  await esperar(tableId);
  for (const [key, type, columns] of def.indices) await talvez(`índice ${key}`, () => db.createIndex({ databaseId: DB, tableId, key, type, columns }));
}
console.log("Tabela inscricoes");
await talvez("coluna bonus_aniversario_id", () => criarColuna("inscricoes", INSCRICOES_COLUNA_BONUS_ANIVERSARIO));
await esperar("inscricoes");
await completarEnum("inscricoes", "pagamento", [...INSCRICOES_PAGAMENTO, INSCRICOES_PAGAMENTO_BONUS], "pendente");
console.log("Tabela historico_inscricoes");
await completarEnum("historico_inscricoes", "acao", [...HISTORICO_ACOES, ...HISTORICO_ACOES_BONUS], "inscricao");
console.log("Pronto.");
}
