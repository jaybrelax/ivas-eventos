import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
const require = createRequire(import.meta.url);
const raiz = fileURLToPath(new URL("../", import.meta.url));
function carregar(file, deps) {
  const source = ts.transpileModule(readFileSync(raiz + file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, require: id => {
    if (Object.hasOwn(deps, id)) return deps[id];
    if (id === "node-appwrite") return require(id);
    throw Error("Dependência não simulada: " + id);
  }, FormData, File, Buffer, console, Date, Number });
  return exports;
}
const permissao = carregar("src/lib/permissao-edicao-ritual.ts", {});
const prompt = carregar("src/lib/ia-prompt.ts", {});
function ambiente(funcao = "mestre") {
  const u = { id: "editor", perfil: null, funcaoRitual: funcao, aprovacaoPendente: false, cadastroIncompleto: false };
  const evento = { $id: "evento", $updatedAt: "v1", titulo: "Anterior", descricao: "Texto", data: "2026-11-18", hora_inicio: "15:00", tipo_id: "ritual", endereco_id: "local", ritual_numero_geral: 525, mestres: [], guardioes: [] };
  const tipos = [{ $id: "ritual", conta_como_ritual: true, ativo: true, fechado_guardioes: false }, { $id: "reuniao", conta_como_ritual: false, fechado_guardioes: true, ativo: true }];
  const gravacoes = [], removidos = [], state = { falhar: false, participacoes: [] };
  const tablesDB = { async listRows() { return { rows: state.participacoes }; }, async updateRow({ data }) { if (state.falhar) throw Error("falha simulada"); gravacoes.push(data); return { ...evento, ...data }; } };
  const storage = { async createFile() { return { $id: "nova-capa" }; }, async deleteFile({fileId}) { removidos.push(fileId); } };
  const acoes = carregar("src/app/guarnicao/ritual/[id]/editar-actions.ts", {
    "next/cache": { revalidatePath() {} }, "@/lib/auth": { async getUsuario() { return u; } },
    "@/lib/permissao-edicao-ritual": permissao, "@/lib/appwrite": { createAdminClient: () => ({ tablesDB, storage }) },
    "@/lib/config": { DB_ID: "ivas", BUCKET_ID: "midia", TABLES: { eventos: "eventos", enderecos: "enderecos", candidaturas: "candidaturas" } },
    "@/lib/data": { async getEvento() { return evento; }, async listarTipos() { return tipos; }, async listar() { return [{ $id: "local" }]; } },
    "@/lib/guarnicao": { temAppGuarnicao: t => !!(t?.conta_como_ritual || t?.fechado_guardioes), ehReuniao: t => !!t?.fechado_guardioes },
    "@/lib/ia-prompt": prompt, "@/lib/ia": { async getConfigIA() { return { chave: null }; } }, "@/lib/imagem": { conferirImagem: f => f.type === "image/webp" ? null : "Formato inválido" },
    "@/lib/imagem-servidor": { async arquivoOtimizado() { return { input: {}, bytes: Buffer.from("imagem") }; } },
    "@/lib/cor": { async corDaCapa() { return "#123456"; } }, "@/lib/ritual": { async comNumeracao() { throw Error("Não deveria renumerar"); } },
    "@/lib/tempo-real": { async sinalizarMudanca() {} }, "@/lib/guarnicao-links": { urlRitualGuarnicao: () => "/guarnicao/ritual/525" },
    "@/lib/gerar-imagem-ritual": { async gerarImagemRitual() { return { ok: true, base64: "teste" }; } },
  });
  function form(extra = {}) { const f = new FormData(); Object.entries({ titulo: "Novo título", descricao: "Nova descrição", data: "2026-11-18", hora_inicio: "15:00", tipo_id: "ritual", endereco_id: "local", versao: "v1", ...extra }).forEach(([k,v]) => f.set(k,v)); return f; }
  return { acoes, evento, u, gravacoes, removidos, state, form };
}

test("guardiões e contas pendentes não editam nem geram imagens", async () => {
  const a = ambiente("guardiao");
  assert.equal((await a.acoes.salvarInformacoesRitual("evento", a.form())).ok, false);
  assert.equal((await a.acoes.gerarImagemEvento("evento", "", false)).ok, false);
  assert.equal(a.gravacoes.length, 0);
  assert.equal(permissao.podeEditarRitual({ ...a.u, funcaoRitual: "mestre", aprovacaoPendente: true }), false);
  assert.equal(permissao.podeEditarRitual({ ...a.u, perfil: "coordenador" }), true);
  assert.equal(permissao.podeEditarRitual({ ...a.u, perfil: "admin" }), true);
});
test("mestre edita apenas os campos apresentados, sem sobrescrever a equipe", async () => {
  const a = ambiente(); a.evento.mestres = ["outro-mestre"];
  const r = await a.acoes.salvarInformacoesRitual("evento", a.form());
  assert.equal(r.ok, true); assert.equal(a.gravacoes[0].titulo, "Novo título");
  assert.equal(Object.hasOwn(a.gravacoes[0], "mestres"), false);
  assert.equal(Object.hasOwn(a.gravacoes[0], "guardioes"), false);
});
test("versão desatualizada, data impossível e endereço inexistente são recusados", async () => {
  const a = ambiente();
  for (const extra of [{ versao: "antiga" }, { data: "2026-02-30" }, { endereco_id: "inexistente" }]) assert.equal((await a.acoes.salvarInformacoesRitual("evento", a.form(extra))).ok, false);
  assert.equal(a.gravacoes.length, 0);
});
test("mudança de ritual para reunião não converte participações existentes", async () => {
  const a = ambiente(); a.state.participacoes = [{ $id: "confirmado" }];
  const r = await a.acoes.salvarInformacoesRitual("evento", a.form({ tipo_id: "reuniao" }));
  assert.equal(r.ok, false); assert.match(r.erro, /participações/); assert.equal(a.gravacoes.length, 0);
});
test("falha de gravação da capa remove apenas o novo upload", async () => {
  const a = ambiente(); a.state.falhar = true; a.evento.capa_file_id = "capa-antiga";
  const f = a.form(); f.set("capa", new File(["imagem"], "capa.webp", { type: "image/webp" }));
  assert.equal((await a.acoes.salvarImagemEvento("evento", f)).ok, false);
  assert.deepEqual(a.removidos, ["nova-capa"]);
});
test("salvar capa atualiza somente imagem, cor e autor, preservando demais dados", async () => {
  const a = ambiente(); const f = a.form(); f.set("capa", new File(["imagem"], "capa.webp", {type: "image/webp"}));
  assert.equal((await a.acoes.salvarImagemEvento("evento", f)).ok, true);
  assert.deepEqual(Object.keys(a.gravacoes[0]).sort(), ["atualizado_por", "capa_file_id", "cor_capa"]);
  assert.equal(a.removidos.length, 0);
});

test("capa com conteúdo inválido não passa pela otimização do servidor", async () => {
  const imagem = carregar("src/lib/imagem-servidor.ts", {
    "server-only": {}, sharp: require("sharp"), "node-appwrite/file": {},
  });
  await assert.rejects(imagem.prepararImagem(Buffer.from("isto não é uma imagem"), "capa.webp", "capa"), /imagem PNG, JPG ou WebP válida/);
  const png = await require("sharp")({ create: { width: 4, height: 4, channels: 3, background: "#123456" } }).png().toBuffer();
  const pronta = await imagem.prepararImagem(png, "capa.png", "capa");
  assert.equal(pronta.nome, "capa.webp");
  assert.equal(pronta.bytes.toString("ascii", 0, 4), "RIFF");
});
