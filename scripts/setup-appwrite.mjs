// Cria (ou completa) a estrutura do banco no Appwrite e o primeiro usuário Admin.
// Uso:  npm run setup        (lê o arquivo .env.local)
// Pode rodar quantas vezes quiser: o que já existe é pulado.

import { Client, ID, Permission, Query, Role, Storage, TablesDB, Users, AppwriteException } from "node-appwrite";

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
const f = (key, o = {}) => ["float", key, o];
const dt = (key, o = {}) => ["datetime", key, o];

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
      // Contribuição sugerida aos participantes (um valor só, vale para todos os rituais)
      f("valor_contribuicao", { min: 0 }),
      // Estado (sigla) e cidade do Instituto: vêm já escolhidos nos formulários de cadastro
      v("estado", 2), v("cidade", 100),
      // App da Guarnição: prazo para o guardião cancelar e limite de participações por mês (0 = sem limite)
      i("guarnicao_horas_cancelamento", { xdefault: 4, min: 0, max: 72 }), i("guarnicao_limite_mes", { xdefault: 2, min: 0, max: 31 }), b("guarnicao_aprovacao_automatica", true), i("guarnicao_horas_presenca", { xdefault: 1, min: 0, max: 24 }),
    ],
  },
  enderecos: {
    nome: "Endereços",
    colunas: [v("apelido", 60, { required: true }), v("endereco", 255, { required: true }), v("cidade", 80), v("link_maps", 500), v("foto_file_id", 64), b("padrao")],
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
  // Tags de evento: cada uma traz um texto que complementa a descrição de todos os eventos que a usam
  tags_evento: {
    nome: "Tags de evento",
    colunas: [v("nome", 60, { required: true }), v("cor", 9), v("icone", 30), t("descricao"), b("ativo", true), i("ordem", { xdefault: 0 })],
  },
  eventos: {
    nome: "Eventos",
    colunas: [
      v("titulo", 80, { required: true }), t("descricao"), v("data", 10, { required: true }), v("hora_inicio", 5, { required: true }),
      v("endereco_id", 36), v("endereco_livre", 255), v("tipo_id", 36, { required: true }), ids("tags"),
      b("destaque"), v("capa_file_id", 36), v("cor_capa", 9), b("mostrar_banner", true), ids("mestres"), ids("guardioes"),
      i("ritual_numero_geral", { min: 1 }), i("ritual_ano", { min: 2000 }), i("ritual_numero_ano", { min: 1 }),
      v("criado_por", 36), v("atualizado_por", 36),
      // Guarnição: vagas de guardiões (♂) e guardiãs (♀) e se aceita candidaturas
      i("vagas_guardioes", { xdefault: 2, min: 0, max: 50 }), i("vagas_guardias", { xdefault: 2, min: 0, max: 50 }), b("candidaturas_abertas", true),
      // Participantes (público geral, separado da guarnição)
      i("vagas_participantes", { xdefault: 30, min: 0, max: 1000 }),
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
      en("situacao", ["confirmada", "espera", "cancelada", "removida", "justificada"], "espera"),
      i("ordem", { min: 0 }), v("alterado_por", 36),
      // Reuniões: texto da justificativa de ausência
      t("justificativa"),
    ],
    indices: [
      ["ux_candidatura", "unique", ["evento_id", "usuario_id"]],
      ["ix_cand_evento", "key", ["evento_id", "situacao"]],
      ["ix_cand_usuario", "key", ["usuario_id", "situacao"]],
    ],
  },
  // Tempo real do app da Guarnição: uma linha por evento, atualizada a cada mudança de escala.
  // Não guarda nada pessoal (só "qual evento mudou e quando") e por isso é legível por qualquer cliente:
  // o app aberto escuta a tabela pelo Realtime e recarrega a tela.
  sinais: {
    nome: "Sinais de atualização",
    leituraPublica: true,
    colunas: [v("momento", 40, { required: true })],
  },
  // Notificações push do app da Guarnição: um registro por aparelho inscrito
  push_inscricoes: {
    nome: "Inscrições de notificação",
    colunas: [
      v("usuario_id", 36, { required: true }), v("chave", 64, { required: true }),
      v("endpoint", 1000, { required: true }), v("p256dh", 255, { required: true }), v("auth", 100, { required: true }),
    ],
    indices: [
      ["ux_push_chave", "unique", ["chave"]],
      ["ix_push_usuario", "key", ["usuario_id"]],
    ],
  },
  // Inscrições de participantes (público geral) nos rituais/eventos
  inscricoes: {
    nome: "Inscrições de participantes",
    colunas: [
      v("evento_id", 36, { required: true }), v("usuario_id", 36, { required: true }),
      en("situacao", ["confirmada", "espera", "cancelada"], "espera"),
      i("ordem", { min: 0 }),
      en("pagamento", ["pendente", "informado", "pago", "isento", "na_hora"], "pendente"),
      f("valor", { min: 0 }), dt("informado_em"), dt("pago_em"),
      v("comprovante_file_id", 36), t("observacao"), v("alterado_por", 36),
    ],
    indices: [
      ["ux_inscricao", "unique", ["evento_id", "usuario_id"]],
      ["ix_insc_evento", "key", ["evento_id", "situacao"]],
      ["ix_insc_usuario", "key", ["usuario_id", "situacao"]],
      ["ix_insc_pagamento", "key", ["pagamento"]],
      ["ix_insc_comprovante", "key", ["comprovante_file_id"]],
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
  if (tipo === "float") return db.createFloatColumn({ ...base, min: o.min, max: o.max, xdefault: def });
  if (tipo === "datetime") return db.createDatetimeColumn({ ...base, xdefault: def });
  throw new Error("tipo desconhecido " + tipo);
}

/** Colunas enum que já existem ganham os valores novos da definição (só acrescenta, nunca remove). */
async function sincronizarEnums(tableId, def) {
  const { columns } = await db.listColumns({ databaseId: DB, tableId });
  for (const [tipo, key, o] of def.colunas) {
    if (tipo !== "enum") continue;
    const atual = columns.find((c) => c.key === key);
    const falta = atual?.elements ? o.elements.filter((e) => !atual.elements.includes(e)) : [];
    if (!falta.length) continue;
    await db.updateEnumColumn({ databaseId: DB, tableId, key, elements: [...atual.elements, ...falta], required: !!o.required, xdefault: o.required ? undefined : o.xdefault });
    console.log(`  ✓ enum ${key}: + ${falta.join(", ")}`);
  }
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
    await talvez(`tabela ${tableId}`, () => db.createTable({ databaseId: DB, tableId, name: def.nome, permissions: def.leituraPublica ? [Permission.read(Role.any())] : [], rowSecurity: false }));
    await removerObsoletos(tableId);
    for (const col of def.colunas) await talvez(`coluna ${col[1]}`, () => criarColuna(tableId, col));
    await esperarColunas(tableId);
    await sincronizarEnums(tableId, def);
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

  await talvez("bucket comprovantes", () =>
    storage.createBucket({
      bucketId: "comprovantes", name: "Comprovantes de pagamento", permissions: [], fileSecurity: false,
      maximumFileSize: 5 * 1024 * 1024, allowedFileExtensions: ["png", "jpg", "jpeg", "webp"],
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
