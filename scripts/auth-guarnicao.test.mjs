import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);

// Executa os módulos reais com Appwrite, Google e cookies simulados, sem criar contas.
function carregar(arquivo, mocks = {}, globals = {}) {
  const cache = new Map();
  function ler(filename) {
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} };
    cache.set(filename, module);
    const source = ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const resolver = (id) => {
      if (Object.hasOwn(mocks, id)) return mocks[id];
      if (id === "@/lib/tempo-real") return { sinalizarMudanca: async () => {} };
      if (id.startsWith("@/")) return ler(path.join(root, "src", `${id.slice(2)}.ts`));
      if (id.startsWith(".")) return ler(path.resolve(path.dirname(filename), `${id}.ts`));
      if (id.startsWith("node:")) return require(id);
      throw new Error(`Dependência sem simulação: ${id}`);
    };
    vm.runInNewContext(source, {
      module, exports: module.exports, require: resolver, URL, URLSearchParams,
      FormData, File, Buffer, console: { error() {} }, process: { env: {} }, ...globals,
    }, { filename });
    return module.exports;
  }
  return ler(path.join(root, arquivo));
}

const destinos = carregar("src/lib/destino-auth.ts");
const { conferirDadosObrigatorios } = carregar("src/app/cadastro-guarnicao/dados-obrigatorios.ts");
const { fimSuspensao, suspensaoAtiva } = carregar("src/lib/suspensao-guarnicao.ts");
const ritual = "/guarnicao/ritual/ritual-123?origem=escala";

test("cadastro é concluído sem CPF; endereço e nascimento continuam obrigatórios", () => {
  const form = new FormData();
  form.set("endereco", "Rua das Flores, 123");
  form.set("data_nascimento", "1990-05-12");
  assert.equal(conferirDadosObrigatorios(form), null);

  form.set("endereco", "Rua");
  assert.match(conferirDadosObrigatorios(form), /endereço completo/);
  form.set("endereco", "Rua das Flores, 123");
  form.set("data_nascimento", "2099-01-01");
  assert.match(conferirDadosObrigatorios(form), /futuro/);
});

test("suspensão de 3 ou 6 meses expira automaticamente na data calculada", () => {
  const inicio = new Date("2026-01-31T12:00:00.000Z");
  assert.equal(fimSuspensao(3, inicio), "2026-04-30T12:00:00.000Z");
  assert.equal(fimSuspensao(6, inicio), "2026-07-31T12:00:00.000Z");
  const ate = fimSuspensao(3, inicio);
  assert.equal(suspensaoAtiva(ate, Date.parse("2026-04-30T11:59:59.999Z")), true);
  assert.equal(suspensaoAtiva(ate, Date.parse(ate)), false);
});

test("retorno da Guarnição aceita a raiz e preserva links de rituais", () => {
  assert.equal(destinos.destinoGuarnicao(undefined), "/guarnicao");
  assert.equal(destinos.destinoGuarnicao(ritual), ritual);
  for (const valor of ["/eventos", "/admin/eventos", "/guarnicao-outro", "/guarnicao/../eventos", "/guarnicao/%2e%2e/eventos", "//outro.site", "/\\outro.site"]) {
    assert.equal(destinos.destinoGuarnicao(valor), "/guarnicao", valor);
  }
});

class Redirecionamento extends Error {
  constructor(destino) { super(destino); this.destino = destino; }
}

function ambiente({ nova = false, next = ritual, guardiao = false, perfil = "normal", funcao = null, incompleto = true, erroGoogle = false, automatico = true, pendente = false } = {}) {
  const estado = { state: "estado-teste", next, guardiao };
  const jar = new Map([["google_oauth_state", { value: JSON.stringify(estado) }]]);
  const prefs = {};
  if (funcao) prefs.funcao_ritual = funcao;
  let chamadasGoogle = 0;
  const sessao = { secret: "sessao-teste", userId: "usuario-123", expire: "2030-01-01T00:00:00Z" };
  const conta = { $id: "usuario-123", labels: [perfil], status: !pendente, prefs };
  if (pendente) Object.assign(prefs, { guarnicao_situacao: "pendente", guarnicao_solicitacao: true, funcao_ritual: "nenhuma" });
  const users = {
    list: async () => ({ users: nova ? [] : [conta] }),
    create: async () => conta,
    get: async () => conta,
    getPrefs: async () => prefs,
    updatePrefs: async ({ prefs: novas }) => { Object.assign(prefs, novas); conta.prefs = prefs; },
    updateLabels: async ({ labels }) => { conta.labels = labels; },
    updateStatus: async ({ status }) => { conta.status = status; },
    delete: async () => {},
    updateName: async () => {},
    createSession: async () => sessao,
  };
  const mocks = {
    "next/headers": { cookies: async () => ({ get: (k) => jar.get(k), delete: (k) => jar.delete(k), set: (k, v) => jar.set(k, { value: v }) }) },
    "next/server": { NextResponse: { redirect: (url) => url } },
    "next/navigation": { redirect: (url) => { throw new Redirecionamento(url); } },
    "next/cache": { revalidatePath() {} },
    "node-appwrite": { ID: { unique: () => "novo-id" }, Query: { equal() {}, limit() {} }, AppwriteException: class extends Error {} },
    "@/lib/appwrite": { createAdminClient: () => ({ users, account: { createEmailPasswordSession: async () => sessao } }) },
    "@/lib/auth": {
      exigirSessao: async () => ({ id: conta.$id, cadastroIncompleto: incompleto, aprovacaoPendente: false, funcaoRitual: prefs.funcao_ritual ?? "nenhuma", tipo: "participante", perfil: null }),
      podeSolicitarGuarnicao: (u) => !u.aprovacaoPendente && u.funcaoRitual === "nenhuma" && u.tipo === "participante",
    },
    "@/lib/aprovacao-guarnicao": { aprovacaoAutomaticaGuarnicao: async () => automatico },
    "@/lib/imagem-servidor": {},
    "@/lib/usuarios": {
      ehParticipante: (labels) => labels.includes("participante"),
      perfilDosLabels: (labels) => labels.find((p) => ["admin", "coordenador", "normal"].includes(p)) ?? null,
      validarTelefone: () => ({ valor: "5562999999999" }), salvarContato: async () => ({}),
    },
    "@/lib/perfil-extra": { ehUf: () => true },
    "./dados-obrigatorios": { conferirDadosObrigatorios: () => null },
  };
  const globals = {
    process: { env: { GOOGLE_CLIENT_ID: "client-teste" } },
    fetch: async () => {
      chamadasGoogle++;
      if (erroGoogle) throw new Error("Google indisponível");
      return { ok: true, json: async () => chamadasGoogle === 1
        ? { access_token: "token-teste" }
        : { email: "guardiao@example.com", email_verified: true, name: "Guardião Teste" } };
    },
  };
  return { mocks, globals, prefs, jar, conta, get chamadasGoogle() { return chamadasGoogle; } };
}

function request(caminho) {
  const url = new URL(caminho, "https://ivas.test");
  return { url: url.href, nextUrl: url };
}

for (const perfil of ["participante", "normal", "coordenador", "admin"]) {
  test(`login com senha pelo Guarnição preserva o destino para ${perfil}`, async () => {
    const env = ambiente({ perfil });
    const { entrar } = carregar("src/app/login/actions.ts", env.mocks, env.globals);
    const form = new FormData();
    form.set("email", "guardiao@example.com"); form.set("senha", "senha-teste"); form.set("next", ritual);
    await assert.rejects(entrar(undefined, form), (e) => e.destino === ritual);
  });
}

test("Google guarda /guarnicao para cadastro antigo com guardiao e sem next", async () => {
  const env = ambiente();
  const { GET } = carregar("src/app/api/auth/google/route.ts", env.mocks, env.globals);
  const url = await GET(request("/api/auth/google?guardiao=1&origem=cadastro"));
  assert.equal(url.hostname, "accounts.google.com");
  assert.equal(JSON.parse(env.jar.get("google_oauth_state").value).next, "/guarnicao");
});

test("falha na configuração do Google mantém o login do Guarnição", async () => {
  const env = ambiente();
  const { GET } = carregar("src/app/api/auth/google/route.ts", env.mocks, { ...env.globals, process: { env: {} } });
  const url = await GET(request(`/api/auth/google?next=${encodeURIComponent(ritual)}`));
  assert.equal(url.pathname, "/login-guarnicao");
  assert.equal(url.searchParams.get("next"), ritual);
});

test("conta nova pelo Google completa o cadastro da Guarnição e retorna ao ritual", async () => {
  const env = ambiente({ nova: true });
  const { GET } = carregar("src/app/api/auth/google/callback/route.ts", env.mocks, env.globals);
  const url = await GET(request("/api/auth/google/callback?code=teste&state=estado-teste"));
  assert.equal(url.pathname, "/cadastro-guarnicao");
  assert.equal(url.searchParams.get("guardiao"), null);
  assert.equal(url.searchParams.get("completar"), "1");
  assert.equal(url.searchParams.get("next"), ritual);
  assert.equal(env.prefs.funcao_ritual, "nenhuma");
  assert.equal(env.prefs.cadastro_guarnicao_incompleto, true);
  assert.ok(env.jar.has("ivas-session"));
});

test("conta existente que já é guardiã retorna diretamente ao Guarnição", async () => {
  const env = ambiente({ perfil: "participante", funcao: "guardiao" });
  const { GET } = carregar("src/app/api/auth/google/callback/route.ts", env.mocks, env.globals);
  const url = await GET(request("/api/auth/google/callback?code=teste&state=estado-teste"));
  assert.equal(url.pathname + url.search, ritual);
  assert.equal(env.prefs.funcao_ritual, "guardiao");
});

test("Gmail já cadastrado no Eventos sem função segue para o cadastro da Guarnição", async () => {
  const env = ambiente({ perfil: "participante", incompleto: false });
  const { GET } = carregar("src/app/api/auth/google/callback/route.ts", env.mocks, env.globals);
  const url = await GET(request("/api/auth/google/callback?code=teste&state=estado-teste"));
  assert.equal(url.pathname, "/cadastro-guarnicao");
  assert.equal(url.searchParams.get("completar"), "1");
  assert.equal(env.prefs.funcao_ritual, undefined);
});

test("cargo retirado não pode ser recuperado pelo cadastro Google", async () => {
  const env = ambiente({ perfil: "participante", incompleto: false });
  env.prefs.guarnicao_cargo_removido = true;
  const { GET } = carregar("src/app/api/auth/google/callback/route.ts", env.mocks, env.globals);
  const url = await GET(request("/api/auth/google/callback?code=teste&state=estado-teste"));
  assert.equal(url.pathname + url.search, ritual);
  assert.equal(env.prefs.funcao_ritual, undefined);
});

test("cargo retirado bloqueia nova solicitação de acesso pela conta existente", () => {
  const { podeSolicitarGuarnicao } = carregar("src/lib/auth.ts", {
    "server-only": {},
    react: { cache: (f) => f },
    "next/navigation": {},
    "./appwrite": {},
    "./usuarios": {},
  });
  const usuario = { tipo: "participante", perfil: null, funcaoRitual: "nenhuma", aprovacaoPendente: false };
  assert.equal(podeSolicitarGuarnicao(usuario), true);
  assert.equal(podeSolicitarGuarnicao({ ...usuario, cargoRemovido: true }), false);
});

for (const query of ["error=access_denied&state=estado-teste", "code=teste&state=incorreto"]) {
  test(`Google cancelado ou state inválido volta ao login do Guarnição: ${query}`, async () => {
    const env = ambiente();
    const { GET } = carregar("src/app/api/auth/google/callback/route.ts", env.mocks, env.globals);
    const url = await GET(request(`/api/auth/google/callback?${query}`));
    assert.equal(url.pathname, "/login-guarnicao");
    assert.equal(url.searchParams.get("next"), ritual);
    assert.equal(env.chamadasGoogle, 0);
    assert.equal(env.jar.has("ivas-session"), false);
  });
}

test("falha no retorno do Google mantém o login do Guarnição", async () => {
  const env = ambiente({ erroGoogle: true });
  const { GET } = carregar("src/app/api/auth/google/callback/route.ts", env.mocks, env.globals);
  const url = await GET(request("/api/auth/google/callback?code=teste&state=estado-teste"));
  assert.equal(url.pathname, "/login-guarnicao");
  assert.equal(url.searchParams.get("next"), ritual);
});

test("conta pendente pelo Google continua aguardando, sem criar sessão", async () => {
  const env = ambiente({ perfil: "participante", pendente: true });
  const { GET } = carregar("src/app/api/auth/google/callback/route.ts", env.mocks, env.globals);
  const url = await GET(request("/api/auth/google/callback?code=teste&state=estado-teste"));
  assert.equal(url.pathname, "/aguardando-aprovacao");
  assert.equal(env.jar.has("ivas-session"), false);
});

for (const acao of ["cadastrarParticipante", "completarCadastroGoogle"]) {
  for (const next of [null, ritual, "/eventos"]) {
    test(`${acao} de guardião retorna ao Guarnição com next=${next}`, async () => {
      const env = ambiente();
      const actions = carregar("src/app/cadastro-guarnicao/actions.ts", env.mocks, env.globals);
      const form = new FormData();
      for (const [k, v] of Object.entries({ nome: "Guardião Teste", email: "guardiao@example.com", senha: "senha-teste", confirmar: "senha-teste", sexo: "masculino", telefone: "62999999999", estado: "GO", cidade: "Goiânia", guardiao: "1" })) form.set(k, v);
      if (next) form.set("next", next);
      const esperado = next === ritual ? ritual : "/guarnicao";
      await assert.rejects(actions[acao](undefined, form), (e) => e.destino === esperado);
    });
  }
}

function ambienteCoordenacao(coordenador = true) {
  const prefs = { guarnicao_situacao: "pendente", guarnicao_solicitacao: true, funcao_ritual: "nenhuma" };
  const conta = { $id: "guardiao-123", labels: ["participante"], status: false, prefs };
  const chamadas = { status: 0, prefs: 0, config: null };
  const mocks = {
    "next/headers": { cookies: async () => ({}) },
    "next/navigation": { redirect: () => {} },
    "next/cache": { revalidatePath() {} },
    "@/lib/guarnicao-app": { contextoGuarnicao: async () => ({ u: { id: "coord-123" }, visoes: coordenador ? ["coordenador"] : ["guardiao"] }) },
    "@/lib/data": {},
    "@/lib/guarnicao": {},
    "@/lib/appwrite": { createAdminClient: () => ({ users: {
      get: async () => conta,
      updateStatus: async ({ status }) => { chamadas.status++; conta.status = status; },
      updatePrefs: async ({ prefs: novos }) => { chamadas.prefs++; Object.assign(prefs, novos); },
    }, tablesDB: { updateRow: async ({ data }) => { chamadas.config = data; } } }) },
    "@/lib/config": { DB_ID: "ivas", INSTITUTO_ROW_ID: "principal", LABEL_PARTICIPANTE: "participante", TABLES: { instituto: "instituto" } },
    "@/lib/usuarios": {},
    "@/lib/push": {},
  };
  return { mocks, prefs, conta, chamadas };
}

test("somente a coordenação pode alterar a aprovação automática", async () => {
  const negado = ambienteCoordenacao(false);
  const acoesNegadas = carregar("src/app/guarnicao/actions.ts", negado.mocks);
  assert.ok((await acoesNegadas.salvarConfigGuarnicao({ horas: 4, limiteMes: 2, aprovacaoAutomatica: false })).erro);
  assert.equal(negado.chamadas.config, null);

  const aceito = ambienteCoordenacao();
  const acoes = carregar("src/app/guarnicao/actions.ts", aceito.mocks);
  assert.ok((await acoes.salvarConfigGuarnicao({ horas: 4, limiteMes: 2, aprovacaoAutomatica: false })).ok);
  assert.equal(aceito.chamadas.config.guarnicao_aprovacao_automatica, false);
});

test("coordenador aprova apenas solicitação pendente da Guarnição", async () => {
  const negado = ambienteCoordenacao(false);
  const acoesNegadas = carregar("src/app/guarnicao/actions.ts", negado.mocks);
  assert.ok((await acoesNegadas.aprovarGuardiao("guardiao-123")).erro);
  assert.equal(negado.chamadas.status, 0);

  const aceito = ambienteCoordenacao();
  const acoes = carregar("src/app/guarnicao/actions.ts", aceito.mocks);
  assert.ok((await acoes.aprovarGuardiao("guardiao-123")).ok);
  assert.equal(aceito.conta.status, true);
  assert.equal(aceito.prefs.funcao_ritual, "guardiao");
  assert.equal(aceito.prefs.guarnicao_situacao, null);

  const outroCadastro = ambienteCoordenacao();
  outroCadastro.prefs.guarnicao_solicitacao = false;
  const outrasAcoes = carregar("src/app/guarnicao/actions.ts", outroCadastro.mocks);
  assert.ok((await outrasAcoes.aprovarGuardiao("guardiao-123")).erro);
  assert.equal(outroCadastro.chamadas.status, 0);
});

function ambienteSuspensao(perfil = "coordenador") {
  const prefs = { funcao_ritual: "guardiao" };
  const conta = { $id: "guardiao-123", status: true, prefs };
  const escalas = [];
  let gravacoes = 0;
  const users = {
    get: async () => conta,
    updatePrefs: async ({ prefs: novos }) => { Object.assign(prefs, novos); gravacoes++; },
  };
  const mocks = {
    "next/cache": { revalidatePath() {} },
    "@/lib/appwrite": { createAdminClient: () => ({ users }) },
    "@/lib/guarnicao-app": { contextoGuarnicao: async () => ({ u: { id: "coordenador-123", perfil } }) },
    "@/lib/guarnicao": { retirarParticipacoesFuturas: async (...args) => escalas.push(args) },
    "@/lib/usuarios": { prefsDe: (p) => p },
  };
  return { mocks, prefs, escalas, get gravacoes() { return gravacoes; } };
}

test("somente a coordenação pode suspender ou retirar o cargo", async () => {
  for (const perfil of ["normal", null]) {
    const env = ambienteSuspensao(perfil);
    const acoes = carregar("src/app/guarnicao/guardioes/[id]/actions.ts", env.mocks);
    assert.ok((await acoes.suspenderGuardiao("guardiao-123", 3)).erro);
    assert.ok((await acoes.retirarCargoGuardiao("guardiao-123")).erro);
    assert.equal(env.gravacoes, 0);
  }
});

test("perfil admin tem as ações da visão de coordenação", async () => {
  const env = ambienteSuspensao("admin");
  const acoes = carregar("src/app/guarnicao/guardioes/[id]/actions.ts", env.mocks);
  assert.ok((await acoes.suspenderGuardiao("guardiao-123", 3)).ok);
  assert.equal(env.gravacoes, 1);
});

test("coordenador suspende por prazo válido, remove suspensão e retira somente o cargo", async () => {
  const env = ambienteSuspensao();
  const acoes = carregar("src/app/guarnicao/guardioes/[id]/actions.ts", env.mocks);
  assert.ok((await acoes.suspenderGuardiao("guardiao-123", 12)).erro);
  assert.equal(env.gravacoes, 0);
  assert.ok((await acoes.suspenderGuardiao("guardiao-123", 3)).ok);
  assert.equal(suspensaoAtiva(env.prefs.guarnicao_suspenso_ate), true);
  assert.equal(env.escalas.length, 0);
  assert.ok((await acoes.removerSuspensaoGuardiao("guardiao-123")).ok);
  assert.equal(env.prefs.guarnicao_suspenso_ate, null);
  assert.ok((await acoes.retirarCargoGuardiao("guardiao-123")).ok);
  assert.equal(env.prefs.funcao_ritual, "nenhuma");
  assert.equal(env.prefs.guarnicao_cargo_removido, true);
  assert.equal(env.escalas.length, 1);
  assert.equal(env.escalas[0][2], undefined);
});

for (const [estado, usuario, destino] of [
  ["pendente", { aprovacaoPendente: true, cadastroIncompleto: false, perfil: null, funcaoRitual: "nenhuma" }, "/aguardando-aprovacao"],
  ["incompleto", { aprovacaoPendente: false, cadastroIncompleto: true, perfil: null, funcaoRitual: "nenhuma" }, "/cadastro-guarnicao?completar=1&next=%2Fguarnicao%2Fritual%2Fx"],
  ["existente sem função", { aprovacaoPendente: false, cadastroIncompleto: false, perfil: null, tipo: "participante", funcaoRitual: "nenhuma" }, "/cadastro-guarnicao?completar=1&next=%2Fguarnicao%2Fritual%2Fx"],
]) {
  test(`acesso ao app redireciona cadastro ${estado}`, async () => {
    const mocks = {
      "server-only": {},
      "next/headers": { cookies: async () => ({ get: () => null }) },
      "next/navigation": { redirect: (url) => { throw new Redirecionamento(url); } },
      "./auth": { getUsuario: async () => usuario, podeSolicitarGuarnicao: (u) => !u.aprovacaoPendente && u.funcaoRitual === "nenhuma" && u.tipo === "participante" },
      "./data": {},
      "./guarnicao": {},
      "./format": {},
      "./usuarios": {},
    };
    const { contextoGuarnicao } = carregar("src/lib/guarnicao-app.ts", mocks);
    await assert.rejects(contextoGuarnicao("/guarnicao/ritual/x"), (e) => e.destino === destino);
  });
}

test("guardião suspenso continua com acesso à visão e às estatísticas do app", async () => {
  const usuario = { aprovacaoPendente: false, cadastroIncompleto: false, perfil: null, tipo: "participante", funcaoRitual: "guardiao", suspensoAte: "2099-01-01T00:00:00.000Z" };
  const mocks = {
    "server-only": {},
    "next/headers": { cookies: async () => ({ get: () => null }) },
    "next/navigation": { redirect: (url) => { throw new Redirecionamento(url); } },
    "./auth": { getUsuario: async () => usuario, podeSolicitarGuarnicao: () => false },
    "./data": {}, "./guarnicao": {}, "./format": {}, "./usuarios": {},
  };
  const { contextoGuarnicao } = carregar("src/lib/guarnicao-app.ts", mocks);
  const ctx = await contextoGuarnicao("/guarnicao/estatisticas");
  assert.equal(ctx.visao, "guardiao");
  assert.equal(ctx.u.suspensoAte, usuario.suspensoAte);
});

test("guardiões suspensos continuam no ranking de participações", async () => {
  const usuarios = new Map([
    ["suspenso", { id: "suspenso", nome: "Guardiã Suspensa", foto: null, sexo: "feminino", ativo: true, funcao: "guardiao", suspensoAte: "2099-01-01T00:00:00.000Z" }],
    ["ativo", { id: "ativo", nome: "Guardião Ativo", foto: null, sexo: "masculino", ativo: true, funcao: "guardiao", suspensoAte: null }],
  ]);
  const { guardioesAtivos } = carregar("src/lib/guarnicao-estatisticas.ts", {
    "server-only": {}, react: { cache: (f) => f },
    "./data": {}, "./format": {}, "./guarnicao": {},
    "./usuarios": { mapaUsuarios: async () => usuarios },
  });
  assert.equal((await guardioesAtivos()).map((u) => u.id).join(","), "suspenso,ativo");
});

test("suspensão bloqueia só nova candidatura; cancelamento existente continua permitido", async () => {
  let cancelamentos = 0;
  let candidaturas = 0;
  const evento = { $id: "ritual-123" };
  const mocks = {
    "next/headers": {}, "next/navigation": {}, "next/cache": { revalidatePath() {} },
    "@/lib/guarnicao-app": { contextoGuarnicao: async () => ({ u: { id: "guardiao-123", funcaoRitual: "guardiao", suspensoAte: "2099-01-01T00:00:00.000Z" }, visoes: ["guardiao"] }) },
    "@/lib/data": { getEvento: async () => evento, listarTipos: async () => [] },
    "@/lib/guarnicao": { candidatar: async () => { candidaturas++; return { ok: "Candidatura aceita" }; }, cancelar: async () => { cancelamentos++; return { ok: "Cancelada" }; } },
    "@/lib/appwrite": {}, "@/lib/config": {}, "@/lib/usuarios": {}, "@/lib/push": {},
  };
  const acoes = carregar("src/app/guarnicao/actions.ts", mocks);
  assert.match((await acoes.candidatarGuarnicao("ritual-123")).erro, /suspensas/);
  assert.equal(candidaturas, 0);
  assert.ok((await acoes.cancelarGuarnicao("ritual-123")).ok);
  assert.equal(cancelamentos, 1);
});

test("conclusão do perfil preserva o ritual da Guarnição", async () => {
  const env = ambiente();
  const { salvarMeusDados } = carregar("src/app/guarnicao/perfil/dados-actions.ts", env.mocks, env.globals);
  const form = new FormData();
  form.set("nome", "Guardião Teste"); form.set("next", ritual);
  await assert.rejects(salvarMeusDados(undefined, form), (e) => e.destino === ritual);
});

test("conta Gmail existente pode concluir o cadastro e receber acesso automático", async () => {
  const env = ambiente({ perfil: "participante", incompleto: false });
  const { completarCadastroGoogle } = carregar("src/app/cadastro-guarnicao/actions.ts", env.mocks, env.globals);
  const form = new FormData();
  for (const [k, v] of Object.entries({ sexo: "masculino", telefone: "62999999999", estado: "GO", cidade: "Goiânia" })) form.set(k, v);
  await assert.rejects(completarCadastroGoogle(undefined, form), (e) => e.destino === "/guarnicao");
  assert.equal(env.prefs.funcao_ritual, "guardiao");
});

for (const acao of ["cadastrarParticipante", "completarCadastroGoogle"]) {
  test(`${acao} aguarda coordenação quando aprovação automática está desligada`, async () => {
    const env = ambiente({ automatico: false });
    const actions = carregar("src/app/cadastro-guarnicao/actions.ts", env.mocks, env.globals);
    const form = new FormData();
    for (const [k, v] of Object.entries({ nome: "Guardião Teste", email: "guardiao@example.com", senha: "senha-teste", confirmar: "senha-teste", sexo: "masculino", telefone: "62999999999", estado: "GO", cidade: "Goiânia" })) form.set(k, v);
    await assert.rejects(actions[acao](undefined, form), (e) => e.destino === "/aguardando-aprovacao");
    assert.equal(env.conta.status, false);
    assert.equal(env.prefs.funcao_ritual, "nenhuma");
    assert.equal(env.prefs.guarnicao_situacao, "pendente");
    assert.equal(env.prefs.situacao, undefined);
    assert.equal(env.prefs.guarnicao_solicitacao, true);
    assert.equal(env.jar.has("ivas-session"), false);
  });
}
