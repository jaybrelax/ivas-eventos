"use client";

import { useActionState } from "react";
import { ShieldCheck } from "lucide-react";
import { salvarGestaoGuardiao } from "./actions";
import { Aviso, BotaoEnviar } from "@/components/ui";
import { lerEscopoMestre, lerRegrasGestaoGuardiao, HORAS_GESTAO_MAXIMO } from "@/lib/gestao-guardiao-regras";
import type { Instituto } from "@/lib/types";

/** Gestão do ritual pelo guardião escalado: liga/desliga e por quantas horas, a partir do começo do dia do ritual. */
export function GestaoGuardiaoForm({ instituto }: { instituto: Instituto }) {
  const [estado, acao] = useActionState(salvarGestaoGuardiao, undefined);
  const regras = lerRegrasGestaoGuardiao(instituto);
  const escopo = lerEscopoMestre(instituto);
  return (
    <form action={acao} className="cartao space-y-6">
      <div>
        <h2 className="cartao-titulo">Gestão do ritual pelo guardião</h2>
        <p className="cartao-sub">
          O guardião escalado num ritual acessa, no app de Eventos, a página de gestão daquele ritual (participantes, financeiro,
          consumo e central) durante o período definido aqui. Não edita o evento nem a escala, e não acessa outras páginas do painel.
        </p>
      </div>
      {estado?.erro && <Aviso>{estado.erro}</Aviso>}
      {estado?.ok && <Aviso tipo="ok">{estado.ok}</Aviso>}

      <label className="flex min-h-11 cursor-pointer items-center gap-3">
        <input type="checkbox" name="ativa" defaultChecked={regras.ativa} className="h-5 w-5 accent-[var(--color-mata-600)]" />
        <span className="flex items-center gap-1.5 text-sm font-medium text-stone-800"><ShieldCheck size={16} className="text-mata-600" /> Liberar a gestão do ritual aos guardiões escalados</span>
      </label>

      <fieldset className="space-y-2">
        <legend className="rotulo">Gestão do ritual para os mestres</legend>
        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <input type="radio" name="escopo_mestre" value="escalado" defaultChecked={escopo === "escalado"} className="h-5 w-5 accent-[var(--color-mata-600)]" />
          <span className="text-sm text-stone-800">Só o mestre escalado no ritual</span>
        </label>
        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <input type="radio" name="escopo_mestre" value="todos" defaultChecked={escopo === "todos"} className="h-5 w-5 accent-[var(--color-mata-600)]" />
          <span className="text-sm text-stone-800">Todos os mestres, em qualquer ritual</span>
        </label>
        <p className="ajuda">Sem prazo. O acesso de cada mestre é o mesmo do guardião no período de gestão.</p>
      </fieldset>

      <div>
        <label className="rotulo" htmlFor="gestao_guardiao_horas">Duração do acesso (horas)</label>
        <input
          id="gestao_guardiao_horas"
          name="gestao_guardiao_horas"
          type="number"
          min={1}
          max={HORAS_GESTAO_MAXIMO}
          step={1}
          inputMode="numeric"
          defaultValue={regras.horas}
          className="campo h-11 max-w-40"
        />
        <p className="ajuda">Conta a partir das 00:00 (Brasília) do dia do ritual. Com 48 horas, o acesso vale no dia do ritual e no dia seguinte. Máximo de {HORAS_GESTAO_MAXIMO} horas.</p>
      </div>

      <div className="flex justify-end border-t border-stone-100 pt-5">
        <BotaoEnviar>Salvar</BotaoEnviar>
      </div>
    </form>
  );
}
