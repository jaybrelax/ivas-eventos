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
const ritual = "/guarnicao/ritual/ritual-123?origem=escala";

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

function ambiente({ nova = false, next = ritual, guardiao = false, perfil = "normal", erroGoogle = false } = {}) {
  const estado = { state: "estado-teste", next, guardiao };
  const jar = new Map([["google_oauth_state", { value: JSON.stringify(estado) }]]);
  const prefs = {};
  let chamadasGoogle = 0;
  const sessao = { secret: "sessao-teste", userId: "usuario-123", expire: "2030-01-01T00:00:00Z" };
  const conta = { $id: "usuario-123", labels: [perfil] };
  const users = {
    list: async () => ({ users: nova ? [] : [conta] }),
    create: async () => conta,
    get: async () => conta,
    getPrefs: async () => prefs,
    updatePrefs: async ({ prefs: novas }) => Object.assign(prefs, novas),
    updateLabels: async ({ labels }) => { conta.labels = labels; },
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
    "@/lib/auth": { exigirSessao: async () => ({ id: conta.$id }) },
    "@/lib/imagem-servidor": {},
    "@/lib/usuarios": {
      ehParticipante: (labels) => labels.includes("participante"),
      perfilDosLabels: (labels) => labels.find((p) => ["admin", "coordenador", "normal"].includes(p)),
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
  return { mocks, globals, prefs, jar, get chamadasGoogle() { return chamadasGoogle; } };
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
  assert.equal(url.pathname, "/cadastro");
  assert.equal(url.searchParams.get("guardiao"), null);
  assert.equal(url.searchParams.get("completar"), "1");
  assert.equal(url.searchParams.get("next"), ritual);
  assert.equal(env.prefs.funcao_ritual, "guardiao");
  assert.ok(env.jar.has("ivas-session"));
});

test("conta existente no Google retorna diretamente ao Guarnição", async () => {
  const env = ambiente({ perfil: "admin" });
  const { GET } = carregar("src/app/api/auth/google/callback/route.ts", env.mocks, env.globals);
  const url = await GET(request("/api/auth/google/callback?code=teste&state=estado-teste"));
  assert.equal(url.pathname + url.search, ritual);
  assert.equal(env.prefs.funcao_ritual, undefined);
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

for (const acao of ["cadastrarParticipante", "completarCadastroGoogle"]) {
  for (const next of [null, ritual, "/eventos"]) {
    test(`${acao} de guardião retorna ao Guarnição com next=${next}`, async () => {
      const env = ambiente();
      const actions = carregar("src/app/cadastro/actions.ts", env.mocks, env.globals);
      const form = new FormData();
      for (const [k, v] of Object.entries({ nome: "Guardião Teste", email: "guardiao@example.com", senha: "senha-teste", confirmar: "senha-teste", sexo: "masculino", telefone: "62999999999", estado: "GO", cidade: "Goiânia", guardiao: "1" })) form.set(k, v);
      if (next) form.set("next", next);
      const esperado = next === ritual ? ritual : "/guarnicao";
      await assert.rejects(actions[acao](undefined, form), (e) => e.destino === esperado);
    });
  }
}

test("conclusão do perfil preserva o ritual da Guarnição", async () => {
  const env = ambiente();
  const { salvarMeusDados } = carregar("src/app/guarnicao/perfil/dados-actions.ts", env.mocks, env.globals);
  const form = new FormData();
  form.set("nome", "Guardião Teste"); form.set("next", ritual);
  await assert.rejects(salvarMeusDados(undefined, form), (e) => e.destino === ritual);
});
