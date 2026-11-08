"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Carregando } from "@/components/ui";

/**
 * Fim da lista: quando entra na tela (com folga), pede mais itens pondo `?n=` na URL.
 * A página é renderizada de novo no servidor com a quantidade nova; os outros parâmetros são mantidos.
 */
export function MaisRituais({ proximo }: { /** Quantidade total de itens a pedir. */ proximo: number }) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const [carregando, iniciar] = useTransition();
  const pedido = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entradas) => {
        if (!entradas[0].isIntersecting || pedido.current === proximo) return;
        pedido.current = proximo; // um pedido por quantidade: não repete enquanto a página nova não chega
        const p = new URLSearchParams(window.location.search);
        p.set("n", String(proximo));
        iniciar(() => router.replace(`/guarnicao?${p}`, { scroll: false }));
      },
      { rootMargin: "600px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [proximo, router]);

  return (
    <div ref={ref} className="grid h-16 place-items-center text-stone-400" aria-live="polite">
      {carregando && <Carregando />}
    </div>
  );
}
