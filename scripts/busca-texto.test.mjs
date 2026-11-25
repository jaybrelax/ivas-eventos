import assert from "node:assert/strict";
import test from "node:test";
import { casaBusca, semAcento } from "../src/lib/busca-texto.ts";

test("ignora acento e maiúsculas", () => {
  assert.equal(semAcento("Ângela Conceição"), "angela conceicao");
  assert.equal(casaBusca("angela", "Ângela Martins Alves"), true);
  assert.equal(casaBusca("CONCEICAO", "Maria da Conceição"), true);
});

test("todas as palavras precisam aparecer, em qualquer ordem", () => {
  assert.equal(casaBusca("ana mello", "Ana Beatriz Mello"), true);
  assert.equal(casaBusca("mello ana", "Ana Beatriz Mello"), true);
  assert.equal(casaBusca("ana souza", "Ana Beatriz Mello"), false);
});

test("busca vazia aceita tudo", () => {
  assert.equal(casaBusca("", "qualquer"), true);
  assert.equal(casaBusca("   ", "qualquer"), true);
});
