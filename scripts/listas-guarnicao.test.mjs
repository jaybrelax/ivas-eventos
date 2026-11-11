import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const Link = ({ href, children, prefetch, ...props }) => React.createElement("a", { href, ...props }, children);

// Executa os componentes e consultas reais com navegação e Appwrite simulados.
function carregar(arquivo, mocks = {}, globals = {}) {
  const cache = new Map();
  function ler(base) {
    const filename = [base, `${base}.ts`, `${base}.tsx`].find(existsSync);
    if (!filename) throw new Error(`Módulo não encontrado: ${base}`);
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} };
    cache.set(filename, module);
    const source = ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    const resolver = (id) => {
      if (Object.hasOwn(mocks, id)) return mocks[id];
      if (id === "server-only") return {};
      if (id === "next/link") return { default: Link, useLinkStatus: () => ({ pending: false }) };
      if (["react", "react/jsx-runtime", "lucide-react"].includes(id)) return require(id);
      if (id.startsWith("@/")) return ler(path.join(root, "src", id.slice(2)));
      if (id.startsWith(".")) return ler(path.resolve(path.dirname(filename), id));
      throw new Error(`Dependência sem simulação: ${id}`);
    };
    vm.runInNewContext(source, { module, exports: module.exports, require: resolver, URL, URLSearchParams, console, ...globals }, { filename });
    return module.exports;
  }
  return ler(path.join(root, arquivo));
}

function eventos() {
  return [
    ...Array.from({ length: 16 }, (_, i) => ({ $id: `ritual-${i}`, titulo: `Ritual ${i}`, tipo_id: "ritual", data: "2026-11-12", hora_inicio: "09:00" })),
    ...Array.from({ length: 16 }, (_, i) => ({ $id: `reuniao-${i}`, titulo: `Reunião ${i}`, tipo_id: "reuniao", data: "2026-11-13", hora_inicio: "09:00", mestres: [] })),
    { $id: "anterior", titulo: "Reunião passada", tipo_id: "reuniao", data: "2026-11-10", hora_inicio: "09:00", mestres: [] },
    { $id: "publico", tipo_id: "publico", data: "2026-11-12", hora_inicio: "09:00" },
  ];
}

function moduloRituais(consultas = [], dados = eventos()) {
  class DataFixa extends Date { static now() { return Date.parse("2026-11-11T15:00:00Z"); } }
  return carregar("src/lib/guarnicao-app.ts", {
    "next/headers": {}, "next/navigation": {}, "./auth": {},
    "./format": { hoje: () => "2026-11-11" },
    "./data": { getDadosInstituto: async () => ({ tipos: [{ $id: "ritual", conta_como_ritual: true }, { $id: "reuniao", fechado_guardioes: true }, { $id: "publico" }], enderecos: [] }), listarEventos: async (filtro) => { consultas.push(filtro); return dados; } },
    "./usuarios": { mapaUsuarios: async () => new Map() },
    "./guarnicao": {
      temAppGuarnicao: (t) => t.conta_como_ritual || t.fechado_guardioes,
      ehReuniao: (t) => !!t.fechado_guardioes,
      candidaturasDosEventos: async () => [], registrosDasReunioes: async () => [], comEquipeAutomatica: (_, c) => c,
      inicioDe: (e) => new Date(`${e.data}T${e.hora_inicio}:00-03:00`), vagasDe: () => ({ masculino: 2, feminino: 2 }),
    },
  }, { Date: DataFixa });
}

test("reuniões são filtradas antes do limite, mesmo após mais de uma página de rituais comuns", async () => {
  const consultas = [];
  const { rituaisComVagas } = moduloRituais(consultas);
  const primeira = await rituaisComVagas(null, 120, false, 13, true);
  const segunda = await rituaisComVagas(null, 120, false, 25, true);
  assert.equal(primeira.length, 13);
  assert.equal(segunda.length, 16);
  assert.ok(segunda.every((r) => r.reuniao));
  assert.deepEqual(Array.from(segunda.slice(0, 13), (r) => r.evento.$id), Array.from(primeira, (r) => r.evento.$id));
  const anteriores = await rituaisComVagas(null, 120, true, 13, true);
  assert.equal(anteriores.length, 1);
  assert.equal(anteriores[0].evento.$id, "anterior");
  assert.equal(consultas.at(-1).inicio, undefined);
  await rituaisComVagas(null, 120, true);
  assert.ok(consultas.at(-1).inicio);
});

test("a tela inicial continua incluindo rituais e reuniões e excluindo eventos públicos", async () => {
  const lista = await moduloRituais().rituaisComVagas(null);
  assert.equal(lista.length, 32);
  assert.equal(lista.filter((r) => r.reuniao).length, 16);
});

test("reunião de hoje passa de próxima para anterior após o horário de início", async () => {
  const hoje = [
    { $id: "cedo", titulo: "Reunião encerrada", tipo_id: "reuniao", data: "2026-11-11", hora_inicio: "09:00", mestres: [] },
    { $id: "tarde", titulo: "Reunião por vir", tipo_id: "reuniao", data: "2026-11-11", hora_inicio: "18:00", mestres: [] },
  ];
  const { rituaisComVagas } = moduloRituais([], hoje);
  assert.equal((await rituaisComVagas(null, 120, false, 1, true))[0].evento.$id, "tarde");
  assert.equal((await rituaisComVagas(null, 120, true, 4, true))[0].evento.$id, "cedo");
});

test("a equipe da reunião entra automaticamente, com exceção de quem justificou ou cancelou", () => {
  const { comEquipeAutomatica } = carregar("src/lib/guarnicao.ts", {
    "node-appwrite": { ID: {}, Query: {} }, "next/server": {},
    "./appwrite": {}, "./config": { DB_ID: "ivas", TABLES: { candidaturas: "candidaturas" } }, "./data": {}, "./guarnicao-links": {},
    "./push": {}, "./genero": {}, "./tempo-real": {}, "./usuarios": {},
  });
  const evento = { $id: "r1", mestres: ["m1"], guardioes_escalados_reuniao: ["g1", "g2"] };
  const registros = [
    { $id: "c1", usuario_id: "g2", situacao: "justificada" },
    { $id: "c2", usuario_id: "fora", situacao: "confirmada" },
    { $id: "c3", usuario_id: "g1", situacao: "cancelada" },
  ];
  const presencas = comEquipeAutomatica(evento, registros);
  assert.deepEqual(Array.from(presencas, (p) => [p.usuario_id, p.situacao]), [
    ["m1", "confirmada"], ["g2", "justificada"], ["fora", "confirmada"],
  ]);
  assert.deepEqual(Array.from(comEquipeAutomatica({ $id: "r2", mestres: ["m2"], guardioes_escalados_reuniao: ["g3"] }, []), (p) => p.usuario_id), ["m2", "g3"]);
});

test("sem resposta contém só a equipe escalada da própria reunião", async () => {
  const pessoas = new Map([
    ["m1", { id: "m1", nome: "Mestre Um", funcao: "mestre", ativo: true }],
    ["g1", { id: "g1", nome: "Guardião Um", funcao: "guardiao", ativo: true }],
    ["g2", { id: "g2", nome: "Guardião Dois", funcao: "guardiao", ativo: true }],
    ["fora", { id: "fora", nome: "Participante", funcao: "guardiao", ativo: true }],
  ]);
  const { dadosReuniao } = carregar("src/lib/reuniao.ts", {
    "./guarnicao": {
      presencasDaReuniao: async (e) => e.$id === "r1" ? [
        { $id: "auto-m1", usuario_id: "m1", situacao: "confirmada" },
        { $id: "c1", usuario_id: "fora", situacao: "confirmada" },
      ] : [{ $id: "auto-g2", usuario_id: "g2", situacao: "confirmada" }],
      regrasGuarnicao: async () => ({ horas: 4, horasPresenca: 1 }),
      inicioDe: () => new Date("2099-01-01"),
      fimPrazoPresenca: () => new Date("2099-01-01"),
      prazoCancelamento: () => new Date("2099-01-01"),
    },
    "./usuarios": { mapaUsuarios: async () => pessoas },
    "./termo-justificativa": { dataHoraExtenso: () => "" },
  });
  const base = { data: "2099-01-01", hora_inicio: "10:00", guardioes: [] };
  const primeira = await dadosReuniao({ ...base, $id: "r1", mestres: ["m1"], guardioes_escalados_reuniao: ["g1"] }, "fora", false, true);
  assert.deepEqual(Array.from(primeira.confirmados, (p) => p.id), ["m1", "fora"]);
  assert.deepEqual(Array.from(primeira.semResposta, (p) => p.id), ["g1"]);
  assert.deepEqual(Array.from(primeira.disponiveis, (p) => p.id), ["g2"]);
  const segunda = await dadosReuniao({ ...base, $id: "r2", mestres: [], guardioes_escalados_reuniao: ["g2"] }, "fora");
  assert.deepEqual(Array.from(segunda.confirmados, (p) => p.id), ["g2"]);
  assert.equal(segunda.semResposta.length, 0);
  assert.equal(segunda.disponiveis.length, 0);
});

test("escala do mestre mostra só os rituais em que ele foi designado, inclusive o histórico", async () => {
  const evento = (id, titulo, data, tipo_id, mestres) => ({ $id: id, titulo, data, hora_inicio: "19:00", tipo_id, mestres, ritual_numero_geral: null, capa_file_id: null });
  const lista = [
    evento("futuro", "Ritual futuro", "2098-01-01", "ritual", ["eu"]),
    evento("passado", "Ritual passado", "2020-01-01", "ritual", ["eu"]),
    evento("outro", "Ritual de outro mestre", "2098-02-01", "ritual", ["outro"]),
    evento("reuniao", "Reunião", "2098-03-01", "reuniao", ["eu"]),
  ];
  const { default: Escalas } = carregar("src/app/guarnicao/escalas/page.tsx", {
    "@/lib/guarnicao-app": { contextoGuarnicao: async () => ({ u: { id: "eu", nome: "Mestre" }, visao: "mestre" }) },
    "@/lib/guarnicao": { temGuarnicao: (t) => !!t.conta_como_ritual && !t.fechado_guardioes, inicioDe: (e) => new Date(`${e.data}T${e.hora_inicio}:00-03:00`) },
    "@/lib/data": { listarEventos: async () => lista, listarTipos: async () => [{ $id: "ritual", conta_como_ritual: true }, { $id: "reuniao", fechado_guardioes: true }] },
    "@/lib/links": { urlImagem: () => "" },
    "../ui": { CabecalhoApp: ({ titulo }) => React.createElement("h1", null, titulo), Vazio: () => null },
  });
  const html = renderToStaticMarkup(await Escalas());
  assert.match(html, /Ritual futuro/);
  assert.match(html, /Ritual passado/);
  assert.match(html, /Mestre escalado/);
  assert.doesNotMatch(html, /Ritual de outro mestre|Reunião/);
});

const pessoas = [
  { id: "ana", nome: "Ana Lúcia", funcao: "guardiao", sexo: "feminino", total: 3 },
  { id: "joao", nome: "João", funcao: "guardiao", sexo: "masculino", total: 1 },
  { id: "maria", nome: "Maria", funcao: "mestre", sexo: "feminino", total: 2 },
  { id: "jose", nome: "José", funcao: "mestre", sexo: "masculino", total: 0 },
  { id: "alex", nome: "Alex", funcao: "mestre", sexo: null, total: 0 },
].map((p) => ({ ...p, foto: null, ultimoTexto: "Ainda não serviu", suspenso: false }));

function listaUI(query = "") {
  let url = new URL(`http://localhost/guarnicao/guardioes${query}`);
  let buscaAberta = false;
  const historico = [];
  const window = { location: { get search() { return url.search; } }, history: Object.fromEntries(["pushState", "replaceState"].map((metodo) => [metodo, (_, __, valor) => { historico.push(url.href); url = new URL(valor, url); }])) };
  const { ListaSoldados } = carregar("src/app/guarnicao/guardioes/ListaSoldados.tsx", {
    react: { ...React, useMemo: (f) => f(), useState: () => [buscaAberta, (v) => { buscaAberta = v; }], useRef: () => ({ current: { blur() {} } }) },
    "next/navigation": { usePathname: () => url.pathname, useSearchParams: () => url.searchParams },
  }, { window });
  return { render: () => ListaSoldados({ pessoas }), url: () => url, voltar: () => { url = new URL(historico.pop()); } };
}

function elementos(no) {
  if (!no || typeof no !== "object") return [];
  if (Array.isArray(no)) return no.flatMap(elementos);
  return [no, ...elementos(no.props?.children)];
}
const linhas = (tree) => elementos(tree).filter((e) => e.type === Link).map((e) => e.props.href.split("/").at(-1));

for (const categoria of ["todos", "guardioes", "mestres"]) {
  for (const genero of ["todos", "masculino", "feminino"]) {
    test(`Soldados combina categoria=${categoria} e gênero=${genero}`, () => {
      const ui = listaUI(`?categoria=${categoria}&genero=${genero}`);
      const esperados = pessoas.filter((p) => (categoria === "todos" || p.funcao === (categoria === "mestres" ? "mestre" : "guardiao")) && (genero === "todos" || p.sexo === genero)).map((p) => p.id);
      const tree = ui.render();
      assert.deepEqual(linhas(tree), esperados);
      const botoes = elementos(tree).filter((e) => e.type === "button" && "aria-pressed" in e.props);
      assert.equal(botoes.filter((e) => e.props["aria-pressed"]).length, 2);
    });
  }
}

test("busca ocupa a linha ao abrir e cancelar limpa a pesquisa, restaurando os filtros", () => {
  const ui = listaUI("?categoria=mestres&genero=feminino&q=MARIA");
  assert.deepEqual(linhas(ui.render()), ["maria"]);
  assert.equal(elementos(ui.render()).some((e) => e.props?.["aria-label"] === "Filtrar por gênero"), false);
  const cancelar = elementos(ui.render()).find((e) => e.props?.["aria-label"] === "Cancelar busca");
  cancelar.props.onClick();
  assert.equal(ui.url().searchParams.has("q"), false);
  assert.equal(ui.url().searchParams.get("categoria"), "mestres");
  assert.equal(ui.url().searchParams.get("genero"), "feminino");
  assert.deepEqual(linhas(ui.render()), ["maria"]);
  const masculino = elementos(ui.render()).find((e) => e.props?.["aria-label"] === "Masculino");
  masculino.props.onClick();
  assert.equal(ui.url().searchParams.get("categoria"), "mestres");
  assert.deepEqual(linhas(ui.render()), ["jose"]);
  ui.voltar();
  assert.deepEqual(linhas(ui.render()), ["maria"]);
  assert.deepEqual(linhas(listaUI("?q=joao").render()), ["joao"]);
  assert.deepEqual(linhas(listaUI("?q=lucia&categoria=guardioes&genero=feminino").render()), ["ana"]);
  const todos = elementos(ui.render()).find((e) => e.props?.["aria-label"] === "Todos os gêneros");
  todos.props.onClick();
  assert.equal(ui.url().searchParams.has("genero"), false);
  assert.equal(ui.url().searchParams.get("categoria"), "mestres");
  const input = elementos(ui.render()).find((e) => e.type === "input");
  input.props.onFocus();
  assert.equal(elementos(ui.render()).some((e) => e.props?.["aria-label"] === "Filtrar por gênero"), false);
  assert.ok(elementos(ui.render()).find((e) => e.props?.["aria-label"] === "Cancelar busca"));
  input.props.onChange({ target: { value: "jose" } });
  assert.deepEqual(linhas(ui.render()), ["jose"]);
  input.props.onKeyDown({ key: "Escape", preventDefault() {} });
  assert.equal(ui.url().searchParams.has("q"), false);
  assert.ok(elementos(ui.render()).find((e) => e.props?.["aria-label"] === "Filtrar por gênero"));
});

test("lista inclui mestres e guardiões ativos, preserva histórico e conta uma vez quem tem os dois papéis no evento", async () => {
  const usuarios = new Map([
    ...pessoas.map((p) => [p.id, { ...p, ativo: true, suspensoAte: p.id === "ana" ? "2099-01-01T00:00:00Z" : null }]),
    ["inativo", { id: "inativo", funcao: "guardiao", ativo: false }],
    ["participante", { id: "participante", funcao: "nenhuma", ativo: true }],
  ]);
  const { listarSoldados } = carregar("src/lib/soldados.ts", {
    react: { cache: (f) => f },
    "./usuarios": { mapaUsuarios: async () => usuarios },
    "./guarnicao-estatisticas": { rituaisPassados: async () => [
      { data: "2026-11-10", guardioes: ["ana", "maria"], mestres: ["maria"] },
      { data: "2026-11-09", guardioes: [], mestres: ["maria"] },
    ] },
  });
  const resultado = await listarSoldados();
  assert.equal(resultado.length, 5);
  assert.equal(resultado.find((p) => p.id === "maria").total, 2);
  assert.equal(resultado.find((p) => p.id === "ana").total, 1);
  assert.ok(resultado.find((p) => p.id === "ana").suspensoAte);
  assert.equal(resultado.find((p) => p.id === "alex").sexo, null);
});

test("botão de reuniões carrega mais somente no clique e mantém a busca e a posição da tela", () => {
  const chamadas = [];
  const { CarregarMaisReunioes } = carregar("src/app/guarnicao/CarregarMaisReunioes.tsx", {
    react: { ...React, useTransition: () => [false, (f) => f()] },
    "next/navigation": { usePathname: () => "/guarnicao/reunioes", useRouter: () => ({ replace: (href, options) => chamadas.push({ href, options }) }) },
  }, {
    window: { location: { search: "?q=mensal&periodo=anteriores" } },
  });
  const tree = CarregarMaisReunioes({ proximo: 8 });
  assert.equal(chamadas.length, 0);
  elementos(tree).find((e) => e.type === "button").props.onClick();
  assert.equal(chamadas.length, 1);
  const url = new URL(chamadas[0].href, "http://localhost");
  assert.equal(url.pathname, "/guarnicao/reunioes");
  assert.equal(url.searchParams.get("q"), "mensal");
  assert.equal(url.searchParams.has("periodo"), false);
  assert.equal(url.searchParams.get("n"), "8");
  assert.equal(chamadas[0].options.scroll, false);
});

test("busca de reuniões mantém a página e o período, reiniciando a paginação", () => {
  const efeitos = [];
  const chamadas = [];
  const { BuscaRituais } = carregar("src/app/guarnicao/BuscaRituais.tsx", {
    react: { ...React, useEffect: (f) => efeitos.push(f), useRef: () => ({ current: false }), useState: (v) => [v, () => {}], useTransition: () => [false, (f) => f()] },
    "next/navigation": { usePathname: () => "/guarnicao/reunioes", useRouter: () => ({ replace: (href) => chamadas.push(href) }) },
    "@/components/ui": { Carregando: () => null },
  }, { setTimeout: (f) => { f(); return 1; }, clearTimeout() {} });
  BuscaRituais({ inicial: "531", manter: { periodo: "anteriores" } });
  efeitos.forEach((f) => f());
  assert.equal(chamadas[0], "/guarnicao/reunioes?periodo=anteriores&q=531");
});

test("mestre abre seu perfil sem ações de suspensão; contas fora da equipe permanecem bloqueadas", async () => {
  let funcao = "mestre";
  const { default: Perfil } = carregar("src/app/guarnicao/guardioes/[id]/page.tsx", {
    "next/navigation": { notFound() { throw new Error("404"); } },
    "@/lib/guarnicao-app": { contextoGuarnicao: async () => ({ u: { id: "coord" }, visao: "coordenador" }) },
    "@/lib/appwrite": { createAdminClient: () => ({ users: { get: async () => ({ name: "Maria", status: true, labels: funcao === "nenhuma" ? [] : [funcao], prefs: { funcao_ritual: "guardiao", sexo: "feminino" } }) } }) },
    "@/lib/guarnicao-estatisticas": { diasDesde: () => 1, historicoDe: async (_, papel) => { assert.equal(papel, "mestre"); return { rituais: [], total: 0, ano: 0, ultimo: null, porMes: Array(12).fill(0) }; } },
    "@/lib/usuarios": { prefsDe: (p) => p, funcaoDosLabels: (labels) => labels.includes("mestre") ? "mestre" : labels.includes("guardiao") ? "guardiao" : "nenhuma" },
    "../../estatisticas/blocos": { GraficoMeses: () => null },
    "./AcoesGuardiao": { AcoesGuardiao: () => React.createElement("button", null, "SUSPENDER") },
  });
  const html = renderToStaticMarkup(await Perfil({ params: Promise.resolve({ id: "maria" }) }));
  assert.match(html, /Mestra/);
  assert.doesNotMatch(html, /SUSPENDER/);
  funcao = "nenhuma";
  await assert.rejects(Perfil({ params: Promise.resolve({ id: "participante" }) }), /404/);
});

async function reunioesHTML(query = {}, visao = 'guardiao', semProxima = false) {
  const reuniao = (id, numero, titulo, data) => ({
    evento: { $id: id, ritual_numero_geral: numero, titulo, data, hora_inicio: '19:00' },
    reuniao: true, local: null, presentes: [], justificados: 0, semResposta: 0, minha: null,
  });
  const proximas = semProxima ? [] : [reuniao('proxima', 550, 'Reunião próxima', '2026-12-10'), reuniao('futura', 551, 'Reunião futura', '2026-12-20')];
  const anteriores = Array.from({ length: 10 }, (_, i) => reuniao(`passada-${i}`, 530 - i, `Reunião anterior ${i + 1}`, `2026-11-${String(10 - i).padStart(2, '0')}`));
  const { ListaReunioes } = carregar('src/app/guarnicao/ListaRituais.tsx', {
    'next/navigation': { usePathname: () => '/guarnicao/reunioes', useRouter: () => ({ replace() {} }) },
    '@/lib/guarnicao-app': {
      contextoGuarnicao: async () => ({ u: { id: 'eu', nome: 'Nome', funcaoRitual: visao === 'mestre' ? 'mestre' : 'guardiao' }, visao }),
      rituaisComVagas: async (_, __, passadas, maximo, somenteReunioes) => {
        assert.equal(somenteReunioes, true);
        return (passadas ? anteriores : proximas).slice(0, maximo);
      },
    },
    '@/lib/guarnicao': { regrasGuarnicao: async () => ({ horasPresenca: 1 }), fimPrazoPresenca: () => new Date('2099-01-01') },
    './BuscaRituais': { BuscaRituais: () => null },
    './MaisRituais': { MaisRituais: () => null },
    './NavegacaoRituais': {},
  });
  return renderToStaticMarkup(await ListaReunioes({ searchParams: Promise.resolve(query) }));
}

for (const visao of ['guardiao', 'coordenador', 'mestre']) {
  test(`reuniões mostra a próxima e quatro anteriores para ${visao}`, async () => {
    const html = await reunioesHTML({}, visao);
    assert.ok(html.indexOf('Próxima reunião') < html.indexOf('> Anteriores'));
    const ids = [...html.matchAll(/href="\/guarnicao\/ritual\/(\d+)"/g)].map((m) => Number(m[1]));
    assert.deepEqual(ids, [550, 530, 529, 528, 527]);
    assert.equal([...html.matchAll(/borda-animada-grossa/g)].length, 1);
    assert.match(html, /Carregar mais/);
    assert.doesNotMatch(html, /Ver reuniões anteriores|Próximas reuniões/);
  });
}

test('carregar mais amplia somente as anteriores e o botão desaparece no fim', async () => {
  const html = await reunioesHTML({ n: '8' });
  assert.equal([...html.matchAll(/href="\/guarnicao\/ritual\//g)].length, 9);
  assert.match(html, /Carregar mais/);
  const fim = await reunioesHTML({ n: '12' });
  assert.equal([...fim.matchAll(/href="\/guarnicao\/ritual\//g)].length, 11);
  assert.doesNotMatch(fim, /Carregar mais/);
});

test('busca por número filtra as anteriores; histórico aparece mesmo sem próxima reunião', async () => {
  const html = await reunioesHTML({ q: '529' });
  const ids = [...html.matchAll(/href="\/guarnicao\/ritual\/(\d+)"/g)].map((m) => Number(m[1]));
  assert.deepEqual(ids, [529]);
  assert.match(html, /Nenhuma próxima reunião encontrada/);
  const semProxima = await reunioesHTML({}, 'guardiao', true);
  assert.match(semProxima, /Nenhuma próxima reunião agendada/);
  assert.equal([...semProxima.matchAll(/href="\/guarnicao\/ritual\//g)].length, 4);
});

test('busca por uma reunião futura posterior não aplica o destaque da próxima', async () => {
  const html = await reunioesHTML({ q: '551' });
  assert.match(html, /Reunião futura/);
  assert.doesNotMatch(html, /borda-animada-grossa/);
});
