import test from "node:test";
import assert from "node:assert/strict";
import { montarPromptIA } from "../src/prompt.js";

test("insere a direção artística exatamente no ponto indicado, preservando os dados", () => {
  assert.equal(montarPromptIA("Título: {{titulo_ritual}}. Estilo: {{art_direction}}. Fim.", { titulo_ritual: "Luz", art_direction: "Botânico celestial" }), "Título: Luz. Estilo: Botânico celestial. Fim.");
  assert.equal(montarPromptIA("Sem marcador", { art_direction: "Botânico" }), "Sem marcador");
});

test("campo vazio exige preenchimento e a direção não é interpretada recursivamente", () => {
  assert.throws(() => montarPromptIA("{{art_direction}}", { art_direction: "" }), /Preencha/);
  assert.equal(montarPromptIA("{{art_direction}}", { art_direction: "Literal {{titulo_ritual}}", titulo_ritual: "Outro" }), "Literal {{titulo_ritual}}");
});
