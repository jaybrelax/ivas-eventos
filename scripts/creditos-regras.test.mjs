import assert from "node:assert/strict";
import test from "node:test";
import {
  bloqueioCancelarPacote, bloqueioCessao, calcularSaldo, consomeCredito, ehDebito, escolherCredito, lerQuantidade,
  ordemDeUso, ordemDoCredito, podeReceberCredito, rotuloCredito, transicaoPacote, QUANTIDADE_MAXIMA,
} from "../src/lib/creditos-regras.ts";

const ritual = { conta_como_ritual: true, aberto_publico: true, fechado_guardioes: false };

test("só ritual aberto ao público consome crédito", () => {
  assert.equal(consomeCredito(ritual), true);
  assert.equal(consomeCredito({ ...ritual, conta_como_ritual: false }), false);
  assert.equal(consomeCredito({ ...ritual, aberto_publico: false }), false);
  assert.equal(consomeCredito({ ...ritual, fechado_guardioes: true }), false);
  assert.equal(consomeCredito(undefined), false);
});

test("crédito só vai para inscrição confirmada, sem crédito e com contribuição aberta", () => {
  assert.equal(podeReceberCredito({ situacao: "confirmada", pagamento: "pendente" }), true);
  assert.equal(podeReceberCredito({ situacao: "confirmada", pagamento: "na_hora" }), true);
  assert.equal(podeReceberCredito({ situacao: "espera", pagamento: "pendente" }), false);
  assert.equal(podeReceberCredito({ situacao: "cancelada", pagamento: "pendente" }), false);
  for (const pagamento of ["informado", "pago", "isento", "credito"]) {
    assert.equal(podeReceberCredito({ situacao: "confirmada", pagamento }), false, pagamento);
  }
  assert.equal(podeReceberCredito({ situacao: "confirmada", pagamento: "pendente", credito_id: "c1" }), false);
});

test("débito nasce quando o ritual começa, sem crédito e sem contribuição resolvida", () => {
  const insc = { situacao: "confirmada", pagamento: "pendente" };
  const agora = 1_000;
  assert.equal(ehDebito(insc, true, 2_000, agora), false, "ritual ainda não começou");
  assert.equal(ehDebito(insc, true, 1_000, agora), true, "começou agora");
  assert.equal(ehDebito(insc, true, 500, agora), true);
  assert.equal(ehDebito({ ...insc, pagamento: "na_hora" }, true, 500, agora), true);
  assert.equal(ehDebito({ ...insc, pagamento: "informado" }, true, 500, agora), false, "aguarda conferência");
  assert.equal(ehDebito({ ...insc, pagamento: "pago" }, true, 500, agora), false);
  assert.equal(ehDebito({ ...insc, pagamento: "isento" }, true, 500, agora), false);
  assert.equal(ehDebito({ ...insc, pagamento: "credito" }, true, 500, agora), false);
  assert.equal(ehDebito({ ...insc, situacao: "espera" }, true, 500, agora), false, "na espera não participou");
  assert.equal(ehDebito({ ...insc, situacao: "cancelada" }, true, 500, agora), false);
  assert.equal(ehDebito(insc, false, 500, agora), false, "evento que não consome crédito");
});

test("saldo = disponíveis − débitos; bloqueados ficam de fora (RN008)", () => {
  const cs = [
    { situacao: "disponivel" }, { situacao: "disponivel" }, { situacao: "bloqueado" },
    { situacao: "utilizado" }, { situacao: "cancelado" },
  ];
  assert.deepEqual(calcularSaldo(cs, 0), { disponiveis: 2, bloqueados: 1, utilizados: 1, debitos: 0, saldo: 2 });
  assert.equal(calcularSaldo(cs, 3).saldo, -1);
  assert.equal(calcularSaldo([], 1).saldo, -1);
  assert.equal(calcularSaldo([], 0).saldo, 0);
});

test("o crédito mais antigo é usado primeiro e só entre os disponíveis", () => {
  const cs = [
    { $id: "c", situacao: "disponivel", ordem: 30, numero: 1 },
    { $id: "a", situacao: "disponivel", ordem: 10.002, numero: 2 },
    { $id: "b", situacao: "disponivel", ordem: 10.001, numero: 1 },
    { $id: "x", situacao: "utilizado", ordem: 1, numero: 1 },
    { $id: "y", situacao: "bloqueado", ordem: 2, numero: 1 },
  ];
  assert.deepEqual(ordemDeUso(cs).map((c) => c.$id), ["b", "a", "c"]);
  assert.equal(escolherCredito(cs).$id, "b");
  assert.equal(escolherCredito([{ situacao: "utilizado", ordem: 1, numero: 1 }]), null);
  assert.equal(escolherCredito([]), null);
});

test("cessão: só disponível, só do titular, sem ceder de novo (equipe corrige)", () => {
  const meu = { situacao: "disponivel", titular_id: "ana" };
  assert.equal(bloqueioCessao(meu, "ana", "bia"), null);
  assert.match(bloqueioCessao({ ...meu, situacao: "utilizado" }, "ana", "bia"), /utilizado/);
  assert.match(bloqueioCessao({ ...meu, situacao: "bloqueado" }, "ana", "bia"), /aguarda/);
  assert.match(bloqueioCessao({ ...meu, situacao: "cancelado" }, "ana", "bia"), /cancelado/);
  assert.match(bloqueioCessao(meu, "bia", "caio"), /não é seu/);
  assert.match(bloqueioCessao({ ...meu, cedido_de: "caio" }, "ana", "bia"), /de novo/);
  assert.match(bloqueioCessao(meu, "ana", "ana"), /já é a titular/);
});

test("situações do pacote", () => {
  assert.equal(transicaoPacote("informado", "pago"), null);
  assert.equal(transicaoPacote("pendente", "pago"), null);
  assert.equal(transicaoPacote("pago", "cancelado"), null);
  assert.ok(transicaoPacote("pago", "pago"));
  assert.ok(transicaoPacote("pago", "informado"));
  assert.ok(transicaoPacote("cancelado", "pago"));
  assert.match(transicaoPacote("cancelado", "cancelado"), /cancelado/);
});

test("cancelar pacote: bloqueia com crédito usado ou cedido", () => {
  const ok = [
    { situacao: "disponivel", comprador_id: "a", titular_id: "a" },
    { situacao: "bloqueado", comprador_id: "a", titular_id: "a" },
  ];
  assert.equal(bloqueioCancelarPacote(ok), null);
  assert.match(bloqueioCancelarPacote([...ok, { situacao: "utilizado", comprador_id: "a", titular_id: "a" }]), /utilizado/);
  assert.match(bloqueioCancelarPacote([...ok, { situacao: "disponivel", comprador_id: "a", titular_id: "b" }]), /cedido/);
  assert.equal(bloqueioCancelarPacote([{ situacao: "cancelado", comprador_id: "a", titular_id: "b" }]), null);
});

test("lerQuantidade aceita inteiros de 1 até o máximo", () => {
  assert.deepEqual(lerQuantidade("4"), { quantidade: 4 });
  assert.deepEqual(lerQuantidade(10), { quantidade: 10 });
  assert.ok("erro" in lerQuantidade(""));
  assert.ok("erro" in lerQuantidade("0"));
  assert.ok("erro" in lerQuantidade("2,5"));
  assert.ok("erro" in lerQuantidade("-1"));
  assert.ok("erro" in lerQuantidade(QUANTIDADE_MAXIMA + 1));
  assert.deepEqual(lerQuantidade(QUANTIDADE_MAXIMA), { quantidade: QUANTIDADE_MAXIMA });
});

test("ordem na fila e rótulo", () => {
  assert.ok(ordemDoCredito(1000, 2) > ordemDoCredito(1000, 1));
  assert.ok(ordemDoCredito(2000, 1) > ordemDoCredito(1000, 4));
  assert.equal(rotuloCredito(2, 4), "2/4");
});

test("trava órfã: disponível, travado e parado há mais de 2 minutos", async () => {
  const { travaOrfa, TRAVA_ORFA_MS } = await import("../src/lib/creditos-regras.ts");
  const agora = Date.parse("2026-11-24T12:00:00Z");
  const antigo = new Date(agora - TRAVA_ORFA_MS - 1000).toISOString();
  const recente = new Date(agora - 10_000).toISOString();
  assert.equal(travaOrfa({ situacao: "disponivel", trava: 0, $updatedAt: antigo }, agora), true);
  assert.equal(travaOrfa({ situacao: "disponivel", trava: 0, $updatedAt: recente }, agora), false, "consumo em andamento");
  assert.equal(travaOrfa({ situacao: "disponivel", trava: 1, $updatedAt: antigo }, agora), false, "já está livre");
  assert.equal(travaOrfa({ situacao: "utilizado", trava: 0, $updatedAt: antigo }, agora), false, "uso legítimo");
});

test("edição manual do pacote", async () => {
  const { bloqueioEditarSituacao, creditosParaRemover, situacaoDoCredito } = await import("../src/lib/creditos-regras.ts");
  assert.equal(situacaoDoCredito("pago"), "disponivel");
  assert.equal(situacaoDoCredito("informado"), "bloqueado");
  assert.equal(situacaoDoCredito("cancelado"), "cancelado");
  const c = (numero, situacao, titular = "a") => ({ numero, situacao, comprador_id: "a", titular_id: titular });
  assert.equal(bloqueioEditarSituacao("pago", "pendente", [c(1, "disponivel")]), null);
  assert.match(bloqueioEditarSituacao("pago", "pendente", [c(1, "utilizado")]), /utilizado/);
  assert.equal(bloqueioEditarSituacao("cancelado", "pago", [c(1, "cancelado")]), null);
  const cs = [c(1, "utilizado"), c(2, "disponivel"), c(3, "disponivel"), c(4, "disponivel", "b")];
  assert.deepEqual(creditosParaRemover(cs, 4), { remover: [] });
  assert.deepEqual(creditosParaRemover(cs, 2).remover.map((x) => x.numero), [3, 2]);
  assert.ok("erro" in creditosParaRemover(cs, 1));
});
