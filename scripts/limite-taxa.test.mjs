import assert from "node:assert/strict";
import test from "node:test";
import { bloqueado, registrarFalha, limpar, textoEspera, ipDe } from "../src/lib/limite-taxa.ts";

const JANELA = 15 * 60_000;

test("bloqueia só depois do máximo de falhas", () => {
  const k = "t1";
  for (let i = 0; i < 4; i++) registrarFalha(k, JANELA, 1000);
  assert.equal(bloqueado(k, 5, 1000).bloqueado, false);
  registrarFalha(k, JANELA, 1000);
  const r = bloqueado(k, 5, 1000);
  assert.equal(r.bloqueado, true);
  assert.equal(r.esperaS, 900);
});

test("a janela vence e libera sem renovar a cada falha", () => {
  const k = "t2";
  registrarFalha(k, JANELA, 0);
  for (let i = 0; i < 5; i++) registrarFalha(k, JANELA, 600_000);
  assert.equal(bloqueado(k, 5, 600_000).bloqueado, true);
  assert.equal(bloqueado(k, 5, JANELA + 1).bloqueado, false);
});

test("limpar zera a contagem (login certo)", () => {
  const k = "t3";
  for (let i = 0; i < 5; i++) registrarFalha(k, JANELA, 0);
  limpar(k);
  assert.equal(bloqueado(k, 5, 0).bloqueado, false);
});

test("chaves diferentes não se misturam", () => {
  for (let i = 0; i < 5; i++) registrarFalha("a", JANELA, 0);
  assert.equal(bloqueado("b", 5, 0).bloqueado, false);
});

test("textoEspera e ipDe", () => {
  assert.equal(textoEspera(30), "1 minuto");
  assert.equal(textoEspera(900), "15 minutos");
  const h = (m) => ({ get: (n) => m[n] ?? null });
  assert.equal(ipDe(h({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" })), "1.2.3.4");
  assert.equal(ipDe(h({})), "desconhecido");
});
