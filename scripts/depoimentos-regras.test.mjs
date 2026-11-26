import assert from "node:assert/strict";
import test from "node:test";
import { validarNotas, validarTexto } from "../src/lib/depoimentos-regras.ts";

const base = { ritual: 1, mestres: 1.5, guardioes: 2, ambiente: 9.5, musica: 10 };

test("aceita cinco notas entre 1 e 10 com passos de 0,5", () => {
  assert.deepEqual(validarNotas(base), base);
  assert.equal(validarNotas({ ...base, ritual: 0 }), null);
  assert.equal(validarNotas({ ...base, musica: 10.5 }), null);
  assert.equal(validarNotas({ ...base, mestres: 1.25 }), null);
  assert.equal(validarNotas({ ...base, ambiente: undefined }), null);
});

test("exige depoimento entre 10 e 2000 caracteres", () => {
  assert.equal(validarTexto("   Experiência marcante   "), "Experiência marcante");
  assert.equal(validarTexto("curto"), null);
  assert.equal(validarTexto("x".repeat(2001)), null);
});
