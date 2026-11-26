"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, History, Package, Users } from "lucide-react";

const ABAS = [
  { chave: "pacotes", rotulo: "Pacotes", Icone: Package },
  { chave: "saldos", rotulo: "Saldos", Icone: Users },
  { chave: "debitos", rotulo: "Débitos", Icone: AlertTriangle },
  { chave: "historico", rotulo: "Histórico", Icone: History },
] as const;

// A aba é remontada a cada troca (cada uma tem a própria tabela). Esta variável sobrevive à navegação e diz de qual
// aba o traço está saindo, para ele deslizar de uma aba para a outra em vez de aparecer no lugar novo.
let abaAnterior: string | null = null;

type Posicao = { esquerda: number; largura: number };
const medir = (el: HTMLElement): Posicao => ({ esquerda: el.offsetLeft, largura: el.offsetWidth });
function aplicar(ind: HTMLElement, pos: Posicao, animar: boolean) {
  ind.style.transition = animar ? "transform 320ms cubic-bezier(0.4, 0, 0.2, 1), width 320ms cubic-bezier(0.4, 0, 0.2, 1)" : "none";
  ind.style.transform = `translateX(${pos.esquerda}px)`;
  ind.style.width = `${pos.largura}px`;
}

/**
 * Abas dos créditos, dentro do cabeçalho de cada tabela. O traço sob a aba ativa tem 3 px e desliza de uma aba para a
 * outra. A busca (?q=) é mantida ao trocar de aba.
 */
export function AbasCreditos({ aba, q = "" }: { aba: string; q?: string }) {
  const nav = useRef<HTMLElement>(null);
  const indicador = useRef<HTMLSpanElement>(null);
  const [pronto, setPronto] = useState(false);

  useLayoutEffect(() => {
    const raiz = nav.current;
    const ind = indicador.current;
    const ativa = raiz?.querySelector<HTMLElement>(`[data-aba="${aba}"]`);
    if (!raiz || !ind || !ativa) return;
    const destino = medir(ativa);
    const origem = abaAnterior && abaAnterior !== aba ? raiz.querySelector<HTMLElement>(`[data-aba="${abaAnterior}"]`) : null;
    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (origem && !reduzido) {
      aplicar(ind, medir(origem), false);
      void ind.offsetWidth; // fixa a posição de partida antes de animar
      aplicar(ind, destino, true);
    } else {
      aplicar(ind, destino, false);
    }
    abaAnterior = aba;
    setPronto(true);
    // Mantém a aba ativa à vista quando a lista rola no celular (rola só as abas, nunca a página)
    if (ativa.offsetLeft < raiz.scrollLeft) raiz.scrollLeft = Math.max(0, ativa.offsetLeft - 8);
    else if (ativa.offsetLeft + ativa.offsetWidth > raiz.scrollLeft + raiz.clientWidth) raiz.scrollLeft = ativa.offsetLeft + ativa.offsetWidth - raiz.clientWidth + 8;
  }, [aba]);

  const sufixo = q ? `&q=${encodeURIComponent(q)}` : "";
  return (
    <>
    <nav ref={nav} className="relative -mb-px hidden min-w-0 gap-1 overflow-x-auto md:flex" aria-label="Seções dos créditos">
      {ABAS.map(({ chave, rotulo, Icone }) => {
        const ativa = aba === chave;
        return (
          <Link
            key={chave}
            data-aba={chave}
            href={`/admin/creditos?aba=${chave}${sufixo}`}
            aria-current={ativa ? "page" : undefined}
            // Antes de o traço animado existir (primeira pintura), a aba ativa mostra o próprio traço
            className={`inline-flex shrink-0 items-center gap-1.5 border-b-[3px] px-3 py-4 text-sm font-medium whitespace-nowrap transition-colors max-lg:min-h-11 ${
              ativa ? `text-mata-700 ${pronto ? "border-transparent" : "border-mata-600"}` : "border-transparent text-[#65676b] hover:text-[#1c1e21]"
            }`}
          >
            <Icone size={15} aria-hidden /> {rotulo}
          </Link>
        );
      })}
      <span ref={indicador} aria-hidden className="pointer-events-none absolute bottom-0 left-0 h-[3px] w-0 rounded-full bg-mata-600" />
    </nav>
    </>
  );
}

/** Fica fora do conteúdo das abas para preservar a bolha durante a navegação. */
export function NavbarCreditos({ aba, q = "" }: { aba: string; q?: string }) {
  const [montado, setMontado] = useState(false);
  useEffect(() => { setMontado(true); }, []);
  const sufixo = q ? `&q=${encodeURIComponent(q)}` : "";
  return <>
    {montado && createPortal(
      <nav aria-label="Seções dos créditos" className="fixed inset-x-0 bottom-0 z-40 border-t border-white/20 bg-gradient-to-b from-mata-800/70 to-mata-900/80 pb-[env(safe-area-inset-bottom)] shadow-[inset_0_1px_0_rgb(255_255_255/0.2),0_-8px_28px_-10px_rgb(20_42_29/0.45)] backdrop-blur-2xl backdrop-saturate-[1.8] md:hidden">
        <ul className="relative mx-auto grid h-[4.5rem] max-w-lg grid-cols-4">
          <li aria-hidden className="pointer-events-none absolute top-2 left-0 flex w-1/4 justify-center transition-transform duration-500 ease-[cubic-bezier(0.34,1.45,0.64,1)] motion-reduce:transition-none" style={{ transform: `translateX(${Math.max(0, ABAS.findIndex((a) => a.chave === aba)) * 100}%)` }}>
            <span className="h-9 w-14 rounded-full bg-white" />
          </li>
          {ABAS.map(({ chave, rotulo, Icone }) => {
            const ativa = aba === chave;
            return <li key={chave}>
              <Link href={`/admin/creditos?aba=${chave}${sufixo}`} scroll={false} aria-current={ativa ? "page" : undefined} className="group relative flex h-full w-full flex-col items-center justify-center gap-1 text-[11px] font-semibold">
                <span className="relative grid h-9 w-14 place-items-center"><Icone size={20} strokeWidth={ativa ? 2.4 : 2} aria-hidden className={`transition-all duration-500 ease-[cubic-bezier(0.34,1.7,0.64,1)] motion-reduce:transition-none group-active:scale-90 ${ativa ? "-translate-y-px scale-110 text-mata-700" : "scale-100 text-white/65"}`} /></span>
                <span className={`transition-all duration-300 motion-reduce:transition-none ${ativa ? "translate-y-0 text-white" : "translate-y-px text-white/60"}`}>{rotulo}</span>
              </Link>
            </li>;
          })}
        </ul>
      </nav>, document.body,
    )}
    </>;
}
