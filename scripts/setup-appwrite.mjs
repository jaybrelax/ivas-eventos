// Cria (ou completa) a estrutura do banco no Appwrite e o primeiro usuário Admin.
// Uso:  npm run setup        (lê o arquivo .env.local)
// Pode rodar quantas vezes quiser: o que já existe é pulado.

import { Client, ID, Query, Storage, TablesDB, Users, AppwriteException } from "node-appwrite";

const { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = process.env;
if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
  console.error("Preencha APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID e APPWRITE_API_KEY no .env.local");
  process.exit(1);
}

const client = new Client().setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID).setKey(APPWRITE_API_KEY);
const db = new TablesDB(client);
const storage = new Storage(client);
const users = new Users(client);

const DB = "ivas";
const BUCKET = "midia";

const existe = (e) => e instanceof AppwriteException && e.code === 409;
async function talvez(rotulo, fn) {
  try {
    await fn();
    console.log("  ✓", rotulo);
  } catch (e) {
    if (existe(e)) console.log("  ·", rotulo, "(já existe)");
    else throw e;
  }
}

// Colunas: [tipo, chave, opções]
const v = (key, size, o = {}) => ["varchar", key, { size, ...o }];
const t = (key, o = {}) => ["text", key, o];
const b = (key, def = false) => ["boolean", key, { xdefault: def }];
const i = (key, o = {}) => ["integer", key, o];
const en = (key, elements, def) => ["enum", key, { elements, xdefault: def }];
// Lista de IDs (ex.: usuários escalados no evento)
const ids = (key) => ["varchar", key, { size: 36, array: true }];

const TABELAS = {
  instituto: {
    nome: "Instituto",
    colunas: [
      v("nome", 120), v("nome_curto", 40), v("logo_file_id", 36), v("logo_escura_file_id", 36),
      v("cor_primaria", 9), v("cor_secundaria", 9), v("fonte_titulo", 60), v("fonte_texto", 60),
      i("ritual_numero_inicial", { xdefault: 500, min: 1 }),
      // Textos fixos mostrados na página de todo ritual
      t("info_rituais"), t("info_contribuicao"),
      // Tipografia da página pública
      v("fonte_publica_titulo", 60), v("fonte_publica_texto", 60),
      // Capas com IA (linha própria "ia" da tabela; nunca vai para o navegador)
      v("openai_api_key", 255), t("prompt_imagem"),
    ],
  },
  enderecos: {
    nome: "Endereços",
    colunas: [v("apelido", 60, { required: true }), v("endereco", 255, { required: true }), v("cidade", 80), v("link_maps", 500), b("padrao")],
  },
  telefones: {
    nome: "Telefones",
    colunas: [v("rotulo", 60), v("numero", 30, { required: true }), b("whatsapp", true), b("padrao")],
  },
  redes_sociais: {
    nome: "Redes sociais",
    colunas: [v("rede", 30, { required: true }), v("usuario", 100, { required: true }), v("url", 500)],
  },
  chaves_pix: {
    nome: "Chaves Pix",
    colunas: [
      en("tipo", ["cpf", "cnpj", "email", "telefone", "aleatoria"], "aleatoria"),
      v("chave", 120, { required: true }), v("favorecido", 100, { required: true }), v("cidade", 60), v("banco", 60), b("padrao"),
    ],
  },
  tipos_evento: {
    nome: "Tipos de evento",
    colunas: [
      v("nome", 60, { required: true }), v("slug", 60, { required: true }), v("cor", 9), v("icone", 30),
      b("conta_como_ritual"), b("ativo", true), b("aberto_publico", true), b("fechado_guardioes"), i("ordem", { xdefault: 0 }), t("descricao"),
    ],
    indices: [["ux_tipo_slug", "unique", ["slug"]]],
  },
  eventos: {
    nome: "Eventos",
    colunas: [
      v("titulo", 80, { required: true }), t("descricao"), v("data", 10, { required: true }), v("hora_inicio", 5, { required: true }),
      v("endereco_id", 36), v("endereco_livre", 255), v("tipo_id", 36, { required: true }),
      b("destaque"), v("capa_file_id", 36), v("cor_capa", 9), b("mostrar_banner", true), ids("mestres"), ids("guardioes"),
      i("ritual_numero_geral", { min: 1 }), i("ritual_ano", { min: 2000 }), i("ritual_numero_ano", { min: 1 }),
      v("criado_por", 36), v("atualizado_por", 36),
      // Guarnição: vagas de guardiões (♂) e guardiãs (♀) e se aceita candidaturas
      i("vagas_guardioes", { xdefault: 2, min: 0, max: 50 }), i("vagas_guardias", { xdefault: 2, min: 0, max: 50 }), b("candidaturas_abertas", true),
    ],
    indices: [
      ["ux_ritual_geral", "unique", ["ritual_numero_geral"]],
      ["ux_ritual_ano", "unique", ["ritual_ano", "ritual_numero_ano"]],
      ["ix_data", "key", ["data"]],
      ["ix_tipo", "key", ["tipo_id"]],
    ],
  },
  // Guarnição: candidaturas dos guardiões às vagas de cada evento (ordem de chegada)
  candidaturas: {
    nome: "Candidaturas da guarnição",
    colunas: [
      v("evento_id", 36, { required: true }), v("usuario_id", 36, { required: true }),
      en("sexo", ["masculino", "feminino"], "masculino"),
      en("situacao", ["confirmada", "espera", "cancelada", "removida"], "espera"),
      i("ordem", { min: 0 }), v("alterado_por", 36),
    ],
    indices: [
      ["ux_candidatura", "unique", ["evento_id", "usuario_id"]],
      ["ix_cand_evento", "key", ["evento_id", "situacao"]],
      ["ix_cand_usuario", "key", ["usuario_id", "situacao"]],
    ],
  },
  modelos_banner: {
    nome: "Modelos de banner",
    colunas: [v("nome", 80, { required: true }), t("config", { required: true })],
  },
};

async function criarColuna(tableId, [tipo, key, o]) {
  const base = { databaseId: DB, tableId, key, required: !!o.required };
  const def = o.required ? undefined : o.xdefault;
  if (tipo === "varchar") return db.createVarcharColumn({ ...base, size: o.size, xdefault: def, array: !!o.array });
  if (tipo === "text") return db.createTextColumn({ ...base, xdefault: def });
  if (tipo === "boolean") return db.createBooleanColumn({ ...base, xdefault: def });
  if (tipo === "integer") return db.createIntegerColumn({ ...base, min: o.min, max: o.max, xdefault: def });
  if (tipo === "enum") return db.createEnumColumn({ ...base, elements: o.elements, xdefault: def });
  throw new Error("tipo desconhecido " + tipo);
}

async function esperarColunas(tableId) {
  for (let n = 0; n < 60; n++) {
    const { columns } = await db.listColumns({ databaseId: DB, tableId });
    const pendentes = columns.filter((c) => c.status !== "available");
    const falhas = columns.filter((c) => c.status === "failed");
    if (falhas.length) throw new Error(`Colunas com falha em ${tableId}: ${falhas.map((c) => c.key).join(", ")}`);
    if (!pendentes.length) return;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("Tempo esgotado esperando colunas de " + tableId);
}

// Itens que existiam em versões antigas e não são mais usados.
const OBSOLETOS = { eventos: { indices: ["ix_tipo_status"], colunas: ["status"] } };

async function removerObsoletos(tableId) {
  const o = OBSOLETOS[tableId];
  if (!o) return;
  const sumiu = (e) => e instanceof AppwriteException && e.code === 404;
  for (const key of o.indices) {
    try { await db.deleteIndex({ databaseId: DB, tableId, key }); console.log("  ✓ removido índice", key); }
    catch (e) { if (!sumiu(e)) throw e; }
  }
  // O índice precisa sumir antes da coluna que ele usa.
  for (let n = 0; o.indices.length && n < 60; n++) {
    const { indexes } = await db.listIndexes({ databaseId: DB, tableId });
    if (!indexes.some((ix) => o.indices.includes(ix.key))) break;
    await new Promise((r) => setTimeout(r, 1000));
  }
  for (const key of o.colunas) {
    try { await db.deleteColumn({ databaseId: DB, tableId, key }); console.log("  ✓ removida coluna", key); }
    catch (e) { if (!sumiu(e)) throw e; }
  }
}

async function main() {
  console.log("Database");
  await talvez(`database ${DB}`, () => db.create({ databaseId: DB, name: "IVAS" }));

  for (const [tableId, def] of Object.entries(TABELAS)) {
    console.log(`Tabela ${tableId}`);
    await talvez(`tabela ${tableId}`, () => db.createTable({ databaseId: DB, tableId, name: def.nome, permissions: [], rowSecurity: false }));
    await removerObsoletos(tableId);
    for (const col of def.colunas) await talvez(`coluna ${col[1]}`, () => criarColuna(tableId, col));
    await esperarColunas(tableId);
    for (const [key, type, columns] of def.indices ?? []) {
      await talvez(`índice ${key}`, () => db.createIndex({ databaseId: DB, tableId, key, type, columns }));
    }
  }

  console.log("Storage");
  await talvez(`bucket ${BUCKET}`, () =>
    storage.createBucket({
      bucketId: BUCKET, name: "Mídia", permissions: [], fileSecurity: false,
      maximumFileSize: 10 * 1024 * 1024, allowedFileExtensions: ["png", "jpg", "jpeg", "webp", "svg"],
    }),
  );

  console.log("Dados iniciais");
  await talvez("instituto", () =>
    db.createRow({
      databaseId: DB, tableId: "instituto", rowId: "principal",
      data: {
        nome: "Instituto IVAS", nome_curto: "IVAS", cor_primaria: "#35204f", cor_secundaria: "#c8a24a",
        fonte_titulo: "Cinzel", fonte_texto: "Montserrat", ritual_numero_inicial: 500,
      },
    }),
  );

  const tipos = [
    { nome: "Ritual normal", slug: "ritual-normal", cor: "#7c3aed", icone: "flame", conta_como_ritual: true, ordem: 1 },
    { nome: "Reunião", slug: "reuniao", cor: "#2563eb", icone: "users", conta_como_ritual: false, ordem: 4 },
    { nome: "Evento comemorativo", slug: "comemorativo", cor: "#db2777", icone: "sparkles", conta_como_ritual: false, ordem: 5 },
  ];
  for (const tp of tipos) {
    const ja = await db.listRows({ databaseId: DB, tableId: "tipos_evento", queries: [Query.equal("slug", tp.slug)] });
    if (ja.total > 0 || ja.rows.length > 0) { console.log("  ·", `tipo ${tp.nome} (já existe)`); continue; }
    await talvez(`tipo ${tp.nome}`, () => db.createRow({ databaseId: DB, tableId: "tipos_evento", rowId: ID.unique(), data: { ...tp, ativo: true } }));
  }

  if (ADMIN_EMAIL && ADMIN_PASSWORD) {
    console.log("Usuário Admin");
    const lista = await users.list({ queries: [Query.equal("email", ADMIN_EMAIL)] });
    let u = lista.users[0];
    if (!u) {
      u = await users.create({ userId: ID.unique(), email: ADMIN_EMAIL, password: ADMIN_PASSWORD, name: ADMIN_NAME || "Admin" });
      console.log("  ✓ criado", ADMIN_EMAIL);
    } else console.log("  ·", ADMIN_EMAIL, "(já existe)");
    if (!u.labels?.includes("admin")) await users.updateLabels({ userId: u.$id, labels: ["admin"] });
    console.log("  ✓ perfil admin");
  } else {
    console.log("ADMIN_EMAIL/ADMIN_PASSWORD não definidos: nenhum usuário criado.");
  }

  console.log("\nPronto! Rode `npm run dev` e acesse http://localhost:3000");
}

main().catch((e) => {
  console.error("\nErro:", e?.message || e);
  if (e?.code === 401) console.error("Confira a chave de API e os escopos dela (precisa de databases, tables, columns, indexes, rows, buckets, files, users).");
  process.exit(1);
});
