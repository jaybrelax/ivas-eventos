import assert from "node:assert/strict";
import test from "node:test";
import { lerPreferenciasCreditos } from "../src/lib/creditos-preferencias.ts";

test("configuração antiga mantém cessão ligada e recessão desligada", () => {
  for (const config_creditos of [undefined, null, "{", "null", "{}"]) assert.deepEqual(lerPreferenciasCreditos({ config_creditos }), { cessaoAtiva: true, permitirRecessao: false });
});
test("os dois controles são independentes e valores inválidos não liberam recessão", () => {
  assert.deepEqual(lerPreferenciasCreditos({ config_creditos: '{"cessaoAtiva":false,"permitirRecessao":true}' }), { cessaoAtiva: false, permitirRecessao: true });
  assert.deepEqual(lerPreferenciasCreditos({ config_creditos: '{"permitirRecessao":"true"}' }), { cessaoAtiva: true, permitirRecessao: false });
});
