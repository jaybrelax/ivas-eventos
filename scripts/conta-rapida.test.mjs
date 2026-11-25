import assert from "node:assert/strict";
import test from "node:test";
import { chaveTelefone, ehContaRapida, escolherContaRapida } from "../src/lib/conta-rapida-regras.ts";

test("chave de telefone ignora formatação, 55 e o 9 extra", () => {
  const a = chaveTelefone("(43) 99999-0000");
  assert.equal(a, "4399990000");
  assert.equal(chaveTelefone("+55 43 99999 0000"), a);
  assert.equal(chaveTelefone("43 9999-0000"), a);
  assert.equal(chaveTelefone("5543999990000"), a);
  assert.notEqual(chaveTelefone("(43) 99999-0001"), a);
  assert.notEqual(chaveTelefone("(44) 99999-0000"), a);
});

test("telefone incompleto ou vazio não gera chave", () => {
  assert.equal(chaveTelefone(""), null);
  assert.equal(chaveTelefone(null), null);
  assert.equal(chaveTelefone("99999-0000"), null);
  assert.equal(chaveTelefone("123"), null);
});

test("conta rápida: marcada como avulso, sem senha e sem perfil de painel", () => {
  assert.equal(ehContaRapida({ labels: ["participante", "avulso"], passwordUpdate: "" }), true);
  assert.equal(ehContaRapida({ labels: ["participante"], prefs: { avulso: true } }), true);
  assert.equal(ehContaRapida({ labels: ["participante", "avulso"], passwordUpdate: "2026-11-01" }), false, "com senha não");
  assert.equal(ehContaRapida({ labels: ["participante"] }), false, "sem marca de avulso não");
  assert.equal(ehContaRapida({ labels: ["avulso", "coordenador"] }), false, "perfil de painel nunca");
});

const rapida = (id, email, telefone) => ({ id, email, telefone, rapida: true });
const normal = (id, email, telefone) => ({ id, email, telefone, rapida: false });

test("e-mail igual junta, mesmo sem telefone", () => {
  const c = [rapida("a", "ana@x.com", null), rapida("b", null, "(43) 99999-0000")];
  assert.equal(escolherContaRapida(c, { email: "ANA@x.com", telefone: "" })?.id, "a");
});

test("telefone igual junta só a conta rápida sem e-mail", () => {
  const c = [rapida("a", null, "(43) 99999-0000")];
  assert.equal(escolherContaRapida(c, { email: "nova@x.com", telefone: "+55 43 99999 0000" })?.id, "a");
  const comEmail = [rapida("a", "outra@x.com", "(43) 99999-0000")];
  assert.equal(escolherContaRapida(comEmail, { email: "nova@x.com", telefone: "(43) 99999-0000" }), null, "conta rápida que já tem outro e-mail não junta");
});

test("conta normal nunca é escolhida", () => {
  const c = [normal("a", "ana@x.com", "(43) 99999-0000")];
  assert.equal(escolherContaRapida(c, { email: "ana@x.com", telefone: "(43) 99999-0000" }), null);
});

test("mais de uma candidata é ambíguo: não junta", () => {
  const c = [rapida("a", null, "(43) 99999-0000"), rapida("b", null, "43 9999-0000")];
  assert.equal(escolherContaRapida(c, { email: "n@x.com", telefone: "(43) 99999-0000" }), null);
  const d = [rapida("a", "ana@x.com", null), rapida("b", "ana@x.com", null)];
  assert.equal(escolherContaRapida(d, { email: "ana@x.com", telefone: "" }), null);
});

test("e-mail tem prioridade sobre telefone", () => {
  const c = [rapida("a", null, "(43) 99999-0000"), rapida("b", "ana@x.com", null)];
  assert.equal(escolherContaRapida(c, { email: "ana@x.com", telefone: "(43) 99999-0000" })?.id, "b");
});

import { agruparPossiveisDuplicadas } from "../src/lib/duplicadas.ts";

test("duplicadas: telefone igual agrupa, nome igual só com cadastro rápido", () => {
  const c = (id, nome, telefone, rapida = false) => ({ id, nome, chaveTel: chaveTelefone(telefone), rapida });
  const g1 = agruparPossiveisDuplicadas([c("a", "Ana Souza", "(43) 99999-0000"), c("b", "A. Souza", "+55 43 99999 0000"), c("z", "Zé Lima", "(11) 98888-7777")]);
  assert.equal(g1.length, 1);
  assert.deepEqual(g1[0].contas.map((x) => x.id).sort(), ["a", "b"]);
  const g2 = agruparPossiveisDuplicadas([c("a", "Maria Silva", null, true), c("b", "maria  silva", null)]);
  assert.equal(g2.length, 1);
  assert.equal(g2[0].motivo, "nome");
  const g3 = agruparPossiveisDuplicadas([c("a", "João Silva", null), c("b", "João Silva", null)]);
  assert.equal(g3.length, 0, "homônimos sem cadastro rápido não são duplicata");
});
