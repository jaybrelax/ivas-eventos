import assert from "node:assert/strict";
import test from "node:test";
import { anoDoBonus, chaveBonusAniversario, podeUsarBonusAniversario } from "../src/lib/bonus-aniversario-regras.ts";

const ritual = true;

test("bônus vale somente durante o mês de aniversário e para ritual do mesmo mês", () => {
  assert.equal(podeUsarBonusAniversario({ nascimento: "1990-11-25", dataEvento: "2026-11-28", hoje: "2026-11-01", ritualElegivel: ritual }), true);
  assert.equal(podeUsarBonusAniversario({ nascimento: "1990-11-25", dataEvento: "2026-12-02", hoje: "2026-11-25", ritualElegivel: ritual }), false);
  assert.equal(podeUsarBonusAniversario({ nascimento: "1990-11-25", dataEvento: "2026-11-28", hoje: "2026-10-31", ritualElegivel: ritual }), false);
});

test("bônus não vale para eventos que não consomem participação de ritual", () => {
  assert.equal(podeUsarBonusAniversario({ nascimento: "1990-02-29", dataEvento: "2028-02-29", hoje: "2028-02-10", ritualElegivel: false }), false);
});

test("chave anual impede mais de um bônus por pessoa", () => {
  assert.equal(anoDoBonus("2026-11-25"), 2026);
  assert.equal(chaveBonusAniversario("usuario-1", 2026), "usuario-1:2026");
});
