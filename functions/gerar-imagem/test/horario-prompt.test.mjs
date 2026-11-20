import test from "node:test";
import assert from "node:assert/strict";
import { montarPromptIA, horarioParaPrompt } from "../src/prompt.js";

test("usa o horário local de início sem conversão de fuso", () => {
  assert.equal(montarPromptIA("Início às {{horario_ritual}}", { horario_ritual: horarioParaPrompt("19:30") }), "Início às 19:30");
  assert.equal(horarioParaPrompt("00:00"), "00:00");
  assert.equal(horarioParaPrompt("23:59"), "23:59");
});

test("horário ausente ou inválido não gera informação inventada", () => {
  for (const valor of ["", "24:00", "19:60", "abc"]) {
    assert.equal(horarioParaPrompt(valor), "");
    assert.throws(() => montarPromptIA("Às {{horario_ritual}}", { horario_ritual: horarioParaPrompt(valor) }), /Preencha/);
  }
});
