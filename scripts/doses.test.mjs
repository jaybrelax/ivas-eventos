import assert from "node:assert/strict";
import test from "node:test";
import { DOSE_MAX_ML, historicoDoses, lerDoses, totalDoses, validarDoses } from "../src/lib/doses.ts";

test("lerDoses tolera JSON vazio ou inválido", () => {
  assert.deepEqual(lerDoses(null), []);
  assert.deepEqual(lerDoses(""), []);
  assert.deepEqual(lerDoses("{oops"), []);
  assert.deepEqual(lerDoses('{"n":1}'), []);
});

test("lerDoses ordena, limita a 0..70 e ignora repetidas", () => {
  assert.deepEqual(lerDoses('[{"n":2,"ml":20},{"n":1,"ml":99},{"n":1,"ml":5},{"n":4,"ml":10},{"n":3,"ml":-3}]'), [
    { n: 1, ml: DOSE_MAX_ML }, { n: 2, ml: 20 }, { n: 3, ml: 0 },
  ]);
});

test("validarDoses aceita 1ª e 2ª, e a 3ª em sequência", () => {
  const agora = new Date("2026-11-22T22:00:00.000Z");
  const em = agora.toISOString();
  assert.deepEqual(validarDoses([{ n: 2, ml: 10 }, { n: 1, ml: 40 }], agora), { doses: [{ n: 1, ml: 40, em }, { n: 2, ml: 10, em }] });
  assert.ok("doses" in validarDoses([{ n: 1, ml: 0 }, { n: 2, ml: 0 }, { n: 3, ml: 70 }]));
});

test("validarDoses recusa fora da faixa, repetida, fora de ordem ou formato errado", () => {
  assert.ok("erro" in validarDoses([{ n: 1, ml: 71 }]));
  assert.ok("erro" in validarDoses([{ n: 1, ml: 10.5 }]));
  assert.ok("erro" in validarDoses([{ n: 1, ml: 10 }, { n: 1, ml: 5 }]));
  assert.ok("erro" in validarDoses([{ n: 1, ml: 10 }, { n: 3, ml: 5 }]));
  assert.ok("erro" in validarDoses([{ n: 4, ml: 5 }]));
  assert.ok("erro" in validarDoses("x"));
  assert.ok("erro" in validarDoses([{ n: 1, ml: 1 }, { n: 2, ml: 1 }, { n: 3, ml: 1 }, { n: 3, ml: 1 }]));
});

test("totalDoses soma os ml", () => {
  assert.equal(totalDoses([{ n: 1, ml: 40 }, { n: 2, ml: 25 }]), 65);
});

test("validarDoses guarda o horário e dá 'agora' a quem não tem", () => {
  const agora = new Date("2026-11-22T22:00:00.000Z");
  const r = validarDoses([{ n: 1, ml: 40, em: "2026-11-22T21:15:00.000Z" }, { n: 2, ml: 20 }, { n: 3, ml: 0, em: "2026-11-22T21:30:00.000Z" }], agora);
  assert.deepEqual(r, { doses: [{ n: 1, ml: 40, em: "2026-11-22T21:15:00.000Z" }, { n: 2, ml: 20, em: agora.toISOString() }, { n: 3, ml: 0 }] });
});

test("validarDoses recusa horário inválido ou no futuro", () => {
  const agora = new Date("2026-11-22T22:00:00.000Z");
  assert.ok("erro" in validarDoses([{ n: 1, ml: 10, em: "ontem" }], agora));
  assert.ok("erro" in validarDoses([{ n: 1, ml: 10, em: "2026-11-22T23:00:00.000Z" }], agora));
});

test("lerDoses mantém o horário e historicoDoses ordena por ele", () => {
  const doses = lerDoses('[{"n":1,"ml":40,"em":"2026-11-22T21:15:00.000Z"},{"n":2,"ml":20,"em":"2026-11-22T20:00:00.000Z"},{"n":3,"ml":0}]');
  assert.deepEqual(historicoDoses(doses).map((d) => d.n), [2, 1]);
});
