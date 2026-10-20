import type { ReactNode } from "react";
import { getDadosInstituto } from "@/lib/data";
import { CabecalhoPublico } from "./CabecalhoPublico";
import { RodapePublico } from "./RodapePublico";

/** Página pública de texto corrido (política de privacidade, termos de uso), no visual do site. */
export async function PaginaTexto({ sobre, titulo, atualizado, children }: { sobre: string; titulo: string; atualizado: string; children: ReactNode }) {
  const { instituto, enderecos, telefones, redes } = await getDadosInstituto();
  return (
    <div className="min-h-screen bg-fundo text-stone-900">
      <CabecalhoPublico instituto={instituto} />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <p className="text-xs font-semibold tracking-[0.14em] text-ouro-600 uppercase">{sobre}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-stone-900">{titulo}</h1>
        <p className="mt-2 text-sm text-stone-500">Última atualização: {atualizado}</p>
        <article className="cartao mt-8 space-y-6 text-[15px] leading-relaxed text-stone-700 [&_h2]:mt-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-stone-900 [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">
          {children}
        </article>
      </main>
      <RodapePublico instituto={instituto} enderecos={enderecos} telefones={telefones} redes={redes} />
    </div>
  );
}
