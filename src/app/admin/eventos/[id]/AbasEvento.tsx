"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { GlassWater, Users } from "lucide-react";

const ICONES = { lista: Users, consumo: GlassWater };

export type AbaEvento = {
  id: string;
  rotulo: string;
  icone: keyof typeof ICONES;
  /** Número ao lado do rótulo (ex.: pessoas, ml). */
  detalhe?: string;
  painel: ReactNode;
};

/**
 * Abas da página do evento (lista de presença / consumo da medicina). Controle segmentado com
 * indicador deslizante; os painéis ficam montados (o que a pessoa estava fazendo na outra aba não se
 * perde) e só um aparece. A aba escolhida vai para `?aba=` para poder ser compartilhada.
 */
export function AbasEvento({ abas, inicial }: { abas: AbaEvento[]; inicial?: string }) {
  const base = useId();
  const [ativa, setAtiva] = useState(abas.find((a) => a.id === inicial)?.id ?? abas[0].id);
  const botoes = useRef<(HTMLButtonElement | null)[]>([]);

  // Abre na aba do link (?aba=...) depois da hidratação
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("aba");
    if (id && abas.some((a) => a.id === id)) setAtiva(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function escolher(id: string) {
    setAtiva(id);
    const url = new URL(window.location.href);
    if (id === abas[0].id) url.searchParams.delete("aba"); else url.searchParams.set("aba", id);
    window.history.replaceState(null, "", url);
  }
  function teclas(e: KeyboardEvent, i: number) {
    const ir = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? abas.length - 1 : null;
    if (ir === null) return;
    e.preventDefault();
    const alvo = (ir + abas.length) % abas.length;
    escolher(abas[alvo].id);
    botoes.current[alvo]?.focus();
  }

  const indice = Math.max(0, abas.findIndex((a) => a.id === ativa));

  return (
    // Um card só: as abas no topo e, logo abaixo, o painel da aba escolhida (os painéis vêm sem card próprio)
    <section className="cartao p-0 sm:p-0 md:rounded-[22px] md:border-black/[0.05] md:shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_32px_-14px_rgb(20_42_29/0.2)]">
      <div className="p-2 pb-1 sm:p-4 sm:pb-1 md:p-5 md:pb-1.5">
      <div role="tablist" aria-label="Seções do evento" className="relative grid grid-cols-2 rounded-full bg-stone-900/[0.08] p-1">
        {/* Indicador deslizante */}
        <span
          aria-hidden
          className="pointer-events-none absolute top-1 bottom-1 left-1 rounded-full bg-mata-700 shadow-[0_1px_2px_rgb(0_0_0/0.1),0_4px_10px_-2px_rgb(20_42_29/0.35)] transition-transform duration-300 ease-out motion-reduce:transition-none"
          style={{ width: `calc((100% - 0.5rem) / ${abas.length})`, transform: `translateX(${indice * 100}%)` }}
        />
        {abas.map((a, i) => {
          const Icone = ICONES[a.icone];
          const on = a.id === ativa;
          return (
            <button
              key={a.id}
              ref={(el) => { botoes.current[i] = el; }}
              type="button"
              role="tab"
              id={`${base}-aba-${a.id}`}
              aria-selected={on}
              aria-controls={`${base}-painel-${a.id}`}
              tabIndex={on ? 0 : -1}
              onClick={() => escolher(a.id)}
              onKeyDown={(e) => teclas(e, i)}
              className={`relative z-10 flex min-h-10 items-center justify-center gap-2 rounded-full px-3 text-sm font-semibold md:min-h-9 md:text-[13px] transition-colors ${on ? "text-white" : "text-stone-700 hover:text-stone-900"}`}
            >
              <Icone size={16} aria-hidden className={on ? "text-white" : ""} />
              <span className="truncate">{a.rotulo}</span>
              {a.detalhe && <span className={`shrink-0 rounded-full px-1.5 py-px text-[11px] whitespace-nowrap tabular-nums transition-colors ${on ? "bg-white/20 text-white" : "bg-white text-stone-600 ring-1 ring-black/[0.06]"}`}>{a.detalhe}</span>}
            </button>
          );
        })}
      </div>
      </div>

      {abas.map((a) => (
        <div
          key={a.id}
          role="tabpanel"
          id={`${base}-painel-${a.id}`}
          aria-labelledby={`${base}-aba-${a.id}`}
          hidden={a.id !== ativa}
          className={a.id === ativa ? "animate-surgir" : undefined}
        >
          {a.painel}
        </div>
      ))}
    </section>
  );
}
