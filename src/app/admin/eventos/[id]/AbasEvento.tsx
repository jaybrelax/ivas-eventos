"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CircleDollarSign, GlassWater, MessagesSquare, Users } from "lucide-react";

const ICONES = { lista: Users, consumo: GlassWater, central: MessagesSquare, financeiro: CircleDollarSign };

export type AbaEvento = {
  id: string;
  rotulo: string;
  icone: keyof typeof ICONES;
  /** Número ao lado do rótulo (ex.: pessoas, ml). */
  detalhe?: string;
  /** Com 3+ abas, o número some no celular para caber; `true` mantém (ex.: tarefas abertas). */
  detalheSempre?: boolean;
  /** Só existe no celular (menu do rodapé); no computador o conteúdo já está na página (ex.: Financeiro). */
  soMobile?: boolean;
  painel: ReactNode;
};

/** Contêiner da página que recebe `data-aba` (o cabeçalho do evento se adapta à aba no celular). */
export const ID_PAGINA_EVENTO = "pagina-evento";

/**
 * Abas da página do evento. No computador, controle segmentado com indicador deslizante no topo do
 * card; no celular, menu fixo no rodapé, como num app. Os painéis ficam montados (o que a pessoa estava
 * fazendo na outra aba não se perde) e só um aparece. A aba escolhida vai para `?aba=`.
 */
export function AbasEvento({ abas, inicial }: { abas: AbaEvento[]; inicial?: string }) {
  const base = useId();
  const [ativa, setAtiva] = useState(abas.find((a) => a.id === inicial)?.id ?? abas[0].id);
  const [montado, setMontado] = useState(false);
  const botoes = useRef<(HTMLButtonElement | null)[]>([]);
  const deTopo = abas.filter((a) => !a.soMobile);
  const comRodape = abas.length > 1;

  // Abre na aba do link (?aba=...) depois da hidratação
  useEffect(() => {
    setMontado(true);
    const id = new URLSearchParams(window.location.search).get("aba");
    if (id && abas.some((a) => a.id === id)) setAtiva(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Avisa a página qual aba está aberta (o cabeçalho fica compacto fora de Participantes, no celular)
  useEffect(() => {
    const pagina = document.getElementById(ID_PAGINA_EVENTO);
    if (pagina && comRodape) pagina.dataset.aba = ativa;
  }, [ativa, comRodape]);

  // Posição e largura da aba ativa (para a linha deslizante)
  const barraRef = useRef<HTMLDivElement>(null);
  const [linha, setLinha] = useState({ x: 0, w: 0 });
  // Sentido do último movimento entre abas: o conteúdo entra pelo lado de onde a aba nova está
  const [direcao, setDirecao] = useState<0 | 1 | -1>(0);
  const ativaSoMobileAgora = !!abas.find((a) => a.id === ativa)?.soMobile;
  const indiceTopo = Math.max(0, ativaSoMobileAgora ? 0 : deTopo.findIndex((a) => a.id === ativa));

  useLayoutEffect(() => {
    const medir = () => {
      const b = botoes.current[indiceTopo];
      if (b) setLinha((atual) => (atual.x === b.offsetLeft && atual.w === b.offsetWidth ? atual : { x: b.offsetLeft, w: b.offsetWidth }));
    };
    medir();
    const ro = new ResizeObserver(medir);
    if (barraRef.current) ro.observe(barraRef.current);
    botoes.current.forEach((b) => b && ro.observe(b));
    return () => ro.disconnect();
  }, [indiceTopo, deTopo.length, montado]);

  function escolher(id: string, rolarAoTopo = false) {
    const de = abas.findIndex((a) => a.id === ativa);
    const para = abas.findIndex((a) => a.id === id);
    if (para !== de) setDirecao(para > de ? 1 : -1);
    setAtiva(id);
    const url = new URL(window.location.href);
    if (id === abas[0].id) url.searchParams.delete("aba"); else url.searchParams.set("aba", id);
    window.history.replaceState(null, "", url);
    if (rolarAoTopo) window.scrollTo({ top: 0 });
  }
  function teclas(e: KeyboardEvent, i: number) {
    const n = deTopo.length;
    const ir = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : null;
    if (ir === null) return;
    e.preventDefault();
    const alvo = (ir + n) % n;
    escolher(deTopo[alvo].id);
    botoes.current[alvo]?.focus();
  }

  // Aba só do celular aberta no computador: mostra a primeira do topo no lugar
  const ativaSoMobile = !!abas.find((a) => a.id === ativa)?.soMobile;

  return (
    // Um card só: as abas no topo e, logo abaixo, o painel da aba escolhida (os painéis vêm sem card próprio)
    <section className="cartao overflow-x-clip p-0 sm:p-0 md:rounded-[22px] md:border-black/[0.05] md:shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_32px_-14px_rgb(20_42_29/0.2)]">
      {abas.length === 1 ? (
        // Uma aba só (ex.: guardião do ritual vê só a Central): título simples no lugar da barra de abas
        <div className="flex items-center gap-3 px-3 pt-3 pb-1 sm:px-4 md:px-5 md:pt-4">
          {(() => { const Icone = ICONES[abas[0].icone]; return <span className="grid h-9 w-9 place-items-center rounded-xl bg-mata-50 text-mata-600"><Icone size={18} aria-hidden /></span>; })()}
          <h2 className="cartao-titulo">{abas[0].rotulo}</h2>
          {abas[0].detalhe && <span className="chip bg-stone-100 text-stone-600 tabular-nums">{abas[0].detalhe}</span>}
        </div>
      ) : (
      // No celular as abas ficam no rodapé; aqui só um respiro no topo do card
      <div className="pt-2 max-md:pb-0 md:pt-1">
      {/* Abas simples: texto com ícone e uma linha colorida sob a aba ativa, sobre uma linha de base fina */}
      <div ref={barraRef} role="tablist" aria-label="Seções do evento" className="relative hidden justify-between border-b border-stone-200 px-8 md:flex">
        {/* Linha da aba ativa: um único traço que desliza até a aba clicada */}
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-0 h-[3px] rounded-full bg-mata-600 transition-[transform,width] duration-400 ease-[cubic-bezier(0.34,1.2,0.64,1)] motion-reduce:transition-none"
          style={{ width: linha.w, transform: `translateX(${linha.x}px)`, opacity: linha.w ? 1 : 0 }}
        />
        {deTopo.map((a, i) => {
          const Icone = ICONES[a.icone];
          const on = a.id === ativa || (ativaSoMobile && i === 0);
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
              className={`relative -mb-px flex h-12 items-center gap-2 px-0.5 text-sm transition-colors ${on ? "font-semibold text-stone-900" : "font-medium text-stone-500 hover:text-stone-800"}`}
            >
              <Icone size={16} aria-hidden className={`transition-colors ${on ? "text-mata-600" : ""}`} />
              <span className="truncate">{a.rotulo}</span>
              {a.detalhe && <span className={`shrink-0 rounded-full px-1.5 py-px text-[11px] whitespace-nowrap tabular-nums transition-colors ${on ? "bg-mata-100 text-mata-800" : "bg-stone-100 text-stone-500"}`}>{a.detalhe}</span>}
            </button>
          );
        })}
      </div>
      </div>
      )}

      {abas.map((a) => {
        const visivel = a.id === ativa;
        // Aba só do celular aberta no computador: a primeira do topo aparece no lugar (só no computador)
        const substituta = ativaSoMobile && a.id === deTopo[0]?.id;
        return (
          <div
            key={a.id}
            role="tabpanel"
            id={`${base}-painel-${a.id}`}
            aria-labelledby={`${base}-aba-${a.id}`}
            hidden={!visivel && !substituta}
            className={`${(visivel || substituta) && direcao ? (direcao > 0 ? "aba-da-direita" : "aba-da-esquerda") : ""} ${substituta ? "max-md:hidden" : ""} ${visivel && a.soMobile ? "md:hidden" : ""}`}
          >
            {a.painel}
          </div>
        );
      })}

      {/* Celular: menu de navegação fixo no rodapé, como num app (no body: nada da página o recorta) */}
      {comRodape && montado && createPortal(
        <nav
          aria-label="Seções do evento"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-white/20 bg-gradient-to-b from-mata-800/70 to-mata-900/80 pb-[env(safe-area-inset-bottom)] shadow-[inset_0_1px_0_rgb(255_255_255/0.2),0_-8px_28px_-10px_rgb(20_42_29/0.45)] backdrop-blur-2xl backdrop-saturate-[1.8] md:hidden"
        >
          <ul className="relative mx-auto grid h-[4.5rem] max-w-lg" style={{ gridTemplateColumns: `repeat(${abas.length}, minmax(0, 1fr))` }}>
            {/* Bolha de vidro que desliza (com mola) até a aba escolhida */}
            <li
              aria-hidden
              className="pointer-events-none absolute top-2 left-0 flex justify-center transition-transform duration-500 ease-[cubic-bezier(0.34,1.45,0.64,1)] motion-reduce:transition-none"
              style={{ width: `${100 / abas.length}%`, transform: `translateX(${Math.max(0, abas.findIndex((a) => a.id === ativa)) * 100}%)` }}
            >
              <span className="h-9 w-14 rounded-full bg-white" />
            </li>
            {abas.map((a) => {
              const Icone = ICONES[a.icone];
              const on = a.id === ativa;
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => escolher(a.id, true)}
                    aria-current={on ? "page" : undefined}
                    className="group relative flex h-full w-full flex-col items-center justify-center gap-1 text-[11px] font-semibold"
                  >
                    <span className="relative grid h-9 w-14 place-items-center">
                      <Icone
                        size={20}
                        strokeWidth={on ? 2.4 : 2}
                        aria-hidden
                        className={`transition-all duration-500 ease-[cubic-bezier(0.34,1.7,0.64,1)] motion-reduce:transition-none group-active:scale-90 ${on ? "-translate-y-px scale-110 text-mata-700" : "scale-100 text-white/65"}`}
                      />
                      {a.detalhe && a.detalheSempre && (
                        <span className="absolute -top-1 right-1.5 grid h-4 min-w-4 animate-[surgir_0.35s_cubic-bezier(0.34,1.7,0.64,1)_both] place-items-center rounded-full bg-ouro-400 px-1 text-[10px] leading-none font-bold text-mata-950 tabular-nums ring-2 ring-mata-900">{a.detalhe}</span>
                      )}
                    </span>
                    <span className={`transition-all duration-300 ${on ? "translate-y-0 text-white" : "translate-y-px text-white/60"}`}>{a.rotulo}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>,
        document.body,
      )}
    </section>
  );
}
