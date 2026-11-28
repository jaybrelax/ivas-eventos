"use client";

import { useActionState, useState } from "react";
import { Aviso, BotaoEnviar } from "@/components/ui";
import type { PreferenciasCreditos } from "@/lib/creditos-preferencias";
import { salvarPreferenciasCreditos } from "./actions";

export function CreditosPreferenciasForm({ inicial }: { inicial: PreferenciasCreditos }) {
  const [estado, acao] = useActionState(salvarPreferenciasCreditos, undefined);
  const [ativa, setAtiva] = useState(inicial.cessaoAtiva);
  return <form action={acao} className="cartao space-y-5">
    <div><h2 className="cartao-titulo">Cessão de créditos</h2><p className="cartao-sub">Controle como participantes compartilham créditos de pacotes.</p></div>
    {estado?.erro && <Aviso>{estado.erro}</Aviso>}
    {estado?.ok && <Aviso tipo="ok">{estado.ok}</Aviso>}
    <label className="flex min-h-11 cursor-pointer items-start gap-3">
      <input type="checkbox" name="cessaoAtiva" checked={ativa} onChange={(e) => setAtiva(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-mata-600" />
      <span><span className="block text-sm font-medium text-stone-800">Permitir ceder créditos</span><span className="mt-1 block text-xs leading-relaxed text-stone-500">Habilita a cessão para todos os participantes. Ao desativar, novas transferências ficam bloqueadas.</span></span>
    </label>
    <label className="flex min-h-11 cursor-pointer items-start gap-3">
      <input type="checkbox" name="permitirRecessao" defaultChecked={inicial.permitirRecessao} className="mt-0.5 h-5 w-5 shrink-0 accent-mata-600" />
      <span><span className="block text-sm font-medium text-stone-800">Permitir ceder créditos recebidos</span><span className="mt-1 block text-xs leading-relaxed text-stone-500">Quem recebeu um crédito de outra pessoa pode cedê-lo novamente. Depende da cessão geral estar habilitada.</span></span>
    </label>
    <div className="border-t border-stone-100 pt-5">
      <h3 className="text-sm font-semibold text-stone-800">Débitos de rituais passados</h3>
      <p className="mt-1 text-xs leading-relaxed text-stone-500">Ao ativar, créditos novos quitam inscrições antigas em aberto, começando pelas mais recentes. Sem essa opção, permanecem disponíveis para uso em rituais futuros.</p>
    </div>
    <label className="flex min-h-11 cursor-pointer items-start gap-3">
      <input type="checkbox" name="quitarDebitosNaCompra" defaultChecked={inicial.quitarDebitosNaCompra} className="mt-0.5 h-5 w-5 shrink-0 accent-mata-600" />
      <span><span className="block text-sm font-medium text-stone-800">Quitar débitos automaticamente após compra de pacote</span><span className="mt-1 block text-xs leading-relaxed text-stone-500">Usa os créditos para quitar inscrições antigas quando o pacote for pago e liberado.</span></span>
    </label>
    <label className="flex min-h-11 cursor-pointer items-start gap-3">
      <input type="checkbox" name="quitarDebitosAoReceberCessao" defaultChecked={inicial.quitarDebitosAoReceberCessao} className="mt-0.5 h-5 w-5 shrink-0 accent-mata-600" />
      <span><span className="block text-sm font-medium text-stone-800">Quitar débitos automaticamente ao receber créditos cedidos</span><span className="mt-1 block text-xs leading-relaxed text-stone-500">Usa os créditos recebidos para quitar inscrições antigas em aberto.</span></span>
    </label>
    <p className="rounded-xl bg-stone-50 p-3 text-xs leading-relaxed text-stone-600">Cada transferência permite ceder no máximo metade do saldo atual, descontando débitos e arredondando para baixo. Saldo 5 permite até 2 créditos; saldo 1 não permite ceder.</p>
    <div className="flex justify-end border-t border-stone-100 pt-4"><BotaoEnviar>Salvar preferências</BotaoEnviar></div>
  </form>;
}
