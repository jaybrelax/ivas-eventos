"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";

/** Amplia apenas a lista de reuniões anteriores, preservando a busca e a posição da tela. */
export function CarregarMaisReunioes({ proximo }: { proximo: number }) {
  const router = useRouter();
  const caminho = usePathname();
  const [carregando, iniciar] = useTransition();

  function carregar() {
    const params = new URLSearchParams(window.location.search);
    params.delete("periodo");
    params.set("n", String(proximo));
    iniciar(() => router.replace(`${caminho}?${params}`, { scroll: false }));
  }

  return (
    <div className="mx-4 mt-4" aria-live="polite">
      <button type="button" onClick={carregar} disabled={carregando} aria-controls="reunioes-anteriores"
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-emerald-700 shadow-cartao ring-1 ring-stone-200/70 transition active:scale-[0.98] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600">
        {carregando && <LoaderCircle aria-hidden size={17} className="motion-safe:animate-spin" />}
        {carregando ? "Carregando…" : "Carregar mais"}
      </button>
    </div>
  );
}
