import assert from "node:assert/strict";
import test from "node:test";
import { dentroDaJanelaDeGestao, HORAS_GESTAO_PADRAO, janelaGestao, lerEscopoMestre, lerRegrasGestaoGuardiao } from "../src/lib/gestao-guardiao-regras.ts";

const evento = { data: "2026-11-28" };
const regras = { ativa: true, horas: 48 };
const em = (iso) => new Date(iso).getTime();

test("padrão: ligada e 48 horas", () => {
  assert.deepEqual(lerRegrasGestaoGuardiao({}), { ativa: true, horas: HORAS_GESTAO_PADRAO });
  assert.deepEqual(lerRegrasGestaoGuardiao({ gestao_guardiao_ativa: false, gestao_guardiao_horas: 24 }), { ativa: false, horas: 24 });
  assert.equal(lerRegrasGestaoGuardiao({ gestao_guardiao_horas: 9999 }).horas, 240);
  assert.equal(lerRegrasGestaoGuardiao({ gestao_guardiao_horas: -5 }).horas, 0);
});

test("a janela começa à meia-noite de Brasília do dia do ritual", () => {
  assert.equal(janelaGestao(evento, 48).inicio, em("2026-11-28T03:00:00Z"));
  assert.equal(janelaGestao(evento, 48).fim, em("2026-11-30T03:00:00Z"));
});

test("antes, durante e depois da janela", () => {
  assert.equal(dentroDaJanelaDeGestao(evento, regras, em("2026-11-28T02:59:59Z")), false);
  assert.equal(dentroDaJanelaDeGestao(evento, regras, em("2026-11-28T03:00:00Z")), true);
  assert.equal(dentroDaJanelaDeGestao(evento, regras, em("2026-11-29T20:00:00Z")), true);
  assert.equal(dentroDaJanelaDeGestao(evento, regras, em("2026-11-30T03:00:00Z")), false);
});

test("desligada ou com 0 hora, nunca libera", () => {
  assert.equal(dentroDaJanelaDeGestao(evento, { ativa: false, horas: 48 }, em("2026-11-28T15:00:00Z")), false);
  assert.equal(dentroDaJanelaDeGestao(evento, { ativa: true, horas: 0 }, em("2026-11-28T15:00:00Z")), false);
});

test("escopo dos mestres: padrão só o escalado; \"todos\" libera todos", () => {
  assert.equal(lerEscopoMestre({}), "escalado");
  assert.equal(lerEscopoMestre({ gestao_mestre_escopo: "escalado" }), "escalado");
  assert.equal(lerEscopoMestre({ gestao_mestre_escopo: "todos" }), "todos");
  assert.equal(lerEscopoMestre({ gestao_mestre_escopo: "qualquer" }), "escalado");
});
