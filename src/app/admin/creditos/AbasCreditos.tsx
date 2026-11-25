"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
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
    <nav ref={nav} className="relative -mb-px flex min-w-0 gap-1 overflow-x-auto" aria-label="Seções dos créditos">
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
  );
}
