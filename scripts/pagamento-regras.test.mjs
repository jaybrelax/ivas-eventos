import assert from "node:assert/strict";
import test from "node:test";
import { lerValor, participantePodeInformar, transicaoPermitida, VALOR_MAXIMO } from "../src/lib/pagamento-regras.ts";
import { csvCampo } from "../src/lib/csv.ts";

test("coordenação não altera contribuição de inscrição cancelada", () => {
  assert.match(transicaoPermitida({ situacao: "cancelada", pagamento: "pendente" }, "pago"), /cancelada/);
});

test("coordenação não repete a situação atual", () => {
  assert.ok(transicaoPermitida({ situacao: "confirmada", pagamento: "pago" }, "pago"));
  assert.ok(transicaoPermitida({ situacao: "confirmada", pagamento: "pendente" }, "pendente"));
});

test("transições válidas passam", () => {
  for (const pagamento of ["pendente", "informado", "na_hora", "isento"]) {
    assert.equal(transicaoPermitida({ situacao: "confirmada", pagamento }, "pago"), null);
  }
  assert.equal(transicaoPermitida({ situacao: "espera", pagamento: "pago" }, "pendente"), null);
  assert.equal(transicaoPermitida({ situacao: "confirmada", pagamento: "informado" }, "isento"), null);
});

test("participante só informa contribuição aberta de inscrição ativa", () => {
  assert.ok(participantePodeInformar({ situacao: "cancelada", pagamento: "pendente" }));
  assert.ok(participantePodeInformar({ situacao: "confirmada", pagamento: "pago" }));
  assert.ok(participantePodeInformar({ situacao: "confirmada", pagamento: "isento" }));
  assert.ok(participantePodeInformar({ situacao: "confirmada", pagamento: "aniversario" }));
  assert.equal(participantePodeInformar({ situacao: "confirmada", pagamento: "na_hora" }), null);
  assert.equal(participantePodeInformar({ situacao: "espera", pagamento: "informado" }), null);
});

test("lerValor aceita formatos brasileiros e arredonda", () => {
  assert.deepEqual(lerValor("150"), { valor: 150 });
  assert.deepEqual(lerValor("150,5"), { valor: 150.5 });
  assert.deepEqual(lerValor("R$ 1.234,56"), { valor: 1234.56 });
  assert.deepEqual(lerValor("99.9"), { valor: 99.9 });
  assert.deepEqual(lerValor(120.004), { valor: 120 });
  assert.deepEqual(lerValor(""), { valor: null });
  assert.deepEqual(lerValor(null), { valor: null });
});

test("lerValor recusa negativo, zero, texto e acima do teto", () => {
  for (const bruto of ["-10", "0", "abc", "1e5", "10,999", -5, 0, Number.NaN, VALOR_MAXIMO + 1, String(VALOR_MAXIMO + 1)]) {
    assert.ok("erro" in lerValor(bruto), `devia recusar ${bruto}`);
  }
});

test("csvCampo neutraliza fórmulas e escapa aspas", () => {
  assert.equal(csvCampo("=HYPERLINK(\"x\")"), `"'=HYPERLINK(""x"")"`);
  assert.equal(csvCampo("+55 11"), `"'+55 11"`);
  assert.equal(csvCampo("@SUM(A1)"), `"'@SUM(A1)"`);
  assert.equal(csvCampo("Maria Silva"), `"Maria Silva"`);
});

test("forma de pagamento aceita só pix ou dinheiro", async () => {
  const { lerForma } = await import("../src/lib/pagamento-regras.ts");
  assert.deepEqual(lerForma("pix"), { forma: "pix" });
  assert.deepEqual(lerForma(" Dinheiro "), { forma: "dinheiro" });
  assert.ok("erro" in lerForma(""));
  assert.ok("erro" in lerForma(null));
  assert.ok("erro" in lerForma("cartao"));
  assert.ok("erro" in lerForma("pacote"), "pacote usa crédito, por outro caminho");
});
