"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Rola o carrossel, com animação, até o chip aparecer inteiro (com o respiro lateral de px-5). */
export function rolarAte(nav: HTMLElement, chip: HTMLElement) {
  if (!nav.clientWidth || !chip.offsetWidth) return false;
  const margem = 20;
  const inicio = chip.offsetLeft - margem;
  const fim = chip.offsetLeft + chip.offsetWidth + margem - nav.clientWidth;
  let alvo = nav.scrollLeft;
  if (alvo > inicio) alvo = Math.max(0, inicio);
  else if (alvo < fim) alvo = fim;
  if (Math.abs(alvo - nav.scrollLeft) >= 2) nav.scrollTo({ left: alvo, behavior: "smooth" });
  return true;
}

/**
 * Carrossel de filtros (rola de lado, como nos apps nativos). O toque num chip já chama `rolarAte` na hora
 * (ver ChipFiltro); aqui só se garante a posição certa ao abrir a página direto num filtro.
 */
export function Carrossel({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const nav = ref.current;
    if (!nav) return;
    let id = 0;
    let tentativas = 0;
    const posicionar = () => {
      const ativo = nav.querySelector<HTMLElement>(".chip-app-on");
      if (!ativo) return;
      // Durante a animação de troca de tela o carrossel ainda pode não ter largura: tenta de novo nos quadros seguintes
      if (!rolarAte(nav, ativo) && tentativas++ < 120) id = requestAnimationFrame(posicionar);
    };
    id = requestAnimationFrame(posicionar);
    return () => cancelAnimationFrame(id);
  });

  // Sem encaixe (snap): ele interrompe a rolagem animada
  return (
    <nav
      ref={ref}
      aria-label={rotulo}
      className="relative flex gap-2 overflow-x-auto px-5 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {children}
    </nav>
  );
}
