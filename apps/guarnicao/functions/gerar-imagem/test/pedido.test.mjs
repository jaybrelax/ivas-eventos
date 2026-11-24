import test from "node:test";
import assert from "node:assert/strict";
import { montarPedido, mensagemOpenAI, PROMPT_PADRAO } from "../src/pedido.js";

const base = { comando: "Arte do ritual", detalhes: ["Título do evento: Luz"], usaLogo: false, usaCapa: false, ajustes: "" };

test("junta prompt e detalhes; sem prompt do Instituto usa o padrão", () => {
  assert.equal(montarPedido(base), "Arte do ritual\n\nTítulo do evento: Luz");
  assert.equal(montarPedido({ ...base, comando: "" }), PROMPT_PADRAO + "\n\nTítulo do evento: Luz");
});

test("logos, capa atual e ajustes entram nessa ordem; ajustes são cortados em 2000 caracteres", () => {
  const p = montarPedido({ ...base, usaLogo: true, usaCapa: true, ajustes: "  mais azul  " });
  assert.ok(p.indexOf("Incorpore as logos") < p.indexOf("capa atual") && p.indexOf("capa atual") < p.indexOf("Ajustes solicitados:\nmais azul"));
  assert.ok(montarPedido({ ...base, ajustes: "x".repeat(5000) }).endsWith("x".repeat(2000)));
  assert.ok(!montarPedido({ ...base, ajustes: "   " }).includes("Ajustes"));
});

test("prompt acima de 32 mil caracteres é recusado com mensagem clara", () => {
  assert.throws(() => montarPedido({ ...base, comando: "a".repeat(32001) }), /muito longo/);
});

test("traduz os erros da OpenAI", () => {
  assert.match(mensagemOpenAI(401), /chave/);
  assert.match(mensagemOpenAI(429), /saldo/);
  assert.match(mensagemOpenAI(400, "content_policy"), /política de conteúdo/);
  assert.match(mensagemOpenAI(400, "outro"), /não conseguiu/);
  assert.match(mensagemOpenAI(503), /instável/);
});
