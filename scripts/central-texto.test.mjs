import assert from "node:assert/strict";
import test from "node:test";
import { filtrarMencoes, limparTexto, mencoesDoTexto, partesTexto, TEXTO_MAX, textoSimples, tokenMencao } from "../src/lib/central-texto.ts";

test("tokenMencao limpa o nome e monta o token", () => {
  assert.equal(tokenMencao("Ana [Maria] (Silva)", "abc123"), "@[Ana Maria Silva](abc123)");
  assert.equal(tokenMencao("  ", "x1"), "@[pessoa](x1)");
});

test("mencoesDoTexto devolve ids únicos na ordem", () => {
  const t = `Oi ${tokenMencao("Ana", "a1")} e ${tokenMencao("Bia", "b2")}, de novo ${tokenMencao("Ana", "a1")}`;
  assert.deepEqual(mencoesDoTexto(t), ["a1", "b2"]);
});

test("filtrarMencoes troca menções não permitidas por texto comum", () => {
  const t = `${tokenMencao("Ana", "a1")} viu ${tokenMencao("Zé", "zz")}`;
  const r = filtrarMencoes(t, ["a1"]);
  assert.equal(r.texto, "@[Ana](a1) viu @Zé");
  assert.deepEqual(r.mencoes, ["a1"]);
});

test("limparTexto normaliza quebras e limita o tamanho", () => {
  assert.equal(limparTexto("  a\r\n\r\n\r\n\r\nb  \n"), "a\n\nb");
  assert.equal(limparTexto("x".repeat(TEXTO_MAX + 50)).length, TEXTO_MAX);
});

test("textoSimples tira a marcação das menções", () => {
  assert.equal(textoSimples("Olá @[Ana](a1)!"), "Olá @Ana!");
});

test("partesTexto separa texto, menções e links", () => {
  assert.deepEqual(partesTexto("Ver https://exemplo.com/x. com @[Ana](a1) ok"), [
    { tipo: "texto", valor: "Ver " },
    { tipo: "link", url: "https://exemplo.com/x" },
    { tipo: "texto", valor: ". com " },
    { tipo: "mencao", nome: "Ana", id: "a1" },
    { tipo: "texto", valor: " ok" },
  ]);
});
