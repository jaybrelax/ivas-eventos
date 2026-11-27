"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, List } from "lucide-react";

export function NavegacaoMes({ mes, rotulo, anterior, proximo, atual }: { mes: string; rotulo: string; anterior: string; proximo: string; atual: string }) {
  const searchParams = useSearchParams();
  const hrefMes = (valor: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("mes", valor);
    return `/admin/eventos?${params.toString()}`;
  };

  return (
    <div className="flex w-full items-center justify-between gap-1 border-b border-stone-100 pb-2 sm:w-auto sm:justify-center sm:border-0 sm:pb-0">
      <Link href={hrefMes(anterior)} className="btn-icone" aria-label="Mês anterior"><ChevronLeft size={18} /></Link>
      <span className="min-w-36 text-center text-base font-semibold tracking-tight text-stone-900 capitalize">{rotulo}</span>
      <Link href={hrefMes(proximo)} className="btn-icone" aria-label="Próximo mês"><ChevronRight size={18} /></Link>
      {mes !== atual && <Link href={hrefMes(atual)} className="btn-secundario h-8 px-3 text-xs">Hoje</Link>}
    </div>
  );
}

/** Título da agenda e navegação mensal, recolhível em telas pequenas. */
export function AgendaNavegacao({
  titulo,
  subtitulo,
  acoes,
  avisos,
  controlesMes,
  filtros,
  vistaInicial,
  lista,
  calendario,
}: {
  titulo: string;
  subtitulo?: ReactNode;
  acoes?: ReactNode;
  avisos?: ReactNode;
  controlesMes: ReactNode;
  filtros: ReactNode;
  vistaInicial: "lista" | "calendario";
  lista: ReactNode;
  calendario: ReactNode;
}) {
  const [aberto, setAberto] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [vista, setVista] = useState(vistaInicial);

  useEffect(() => {
    const breakpoint = window.matchMedia("(max-width: 639px)");
    const sincronizar = () => setMobile(breakpoint.matches);
    sincronizar();
    breakpoint.addEventListener("change", sincronizar);
    return () => breakpoint.removeEventListener("change", sincronizar);
  }, []);

  useEffect(() => setVista(vistaInicial), [vistaInicial]);

  useEffect(() => {
    const sincronizar = () => setVista(new URLSearchParams(window.location.search).get("vista") === "calendario" ? "calendario" : "lista");
    window.addEventListener("popstate", sincronizar);
    return () => window.removeEventListener("popstate", sincronizar);
  }, []);

  const escolherVista = (proxima: "lista" | "calendario") => {
    if (proxima === vista) return;
    const url = new URL(window.location.href);
    url.searchParams.set("vista", proxima);
    window.history.pushState(null, "", url);
    setVista(proxima);
  };

  const controlesOcultos = mobile && !aberto;

  return (
    <>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
        <div className="min-w-0">
          <h1 className="text-[26px] leading-tight font-semibold tracking-tight text-stone-900 sm:text-[30px]">{titulo}</h1>
          {subtitulo && <p className="mt-1.5 max-w-2xl text-sm text-stone-500">{subtitulo}</p>}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            aria-label={aberto ? "Fechar navegação mensal" : "Abrir navegação mensal"}
            aria-expanded={aberto}
            aria-controls="agenda-controles-mensais"
            onClick={() => setAberto((atual) => !atual)}
            className={`grid size-10 place-items-center rounded-full border-0 text-stone-600 transition-colors hover:bg-stone-200/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mata-600 sm:hidden ${aberto ? "bg-stone-200/60 text-mata-700" : "bg-transparent"}`}
          >
            <CalendarDays size={20} aria-hidden />
          </button>
          {acoes}
        </div>
      </header>
      {avisos}
      <div
        id="agenda-controles-mensais"
        aria-hidden={controlesOcultos}
        inert={controlesOcultos}
        className={`grid overflow-hidden transition-[grid-template-rows,opacity,margin] duration-300 ease-[cubic-bezier(0.2,0.7,0.2,1)] motion-reduce:transition-none sm:mb-5 sm:grid-rows-[1fr] sm:opacity-100 ${aberto ? "mb-5 grid-rows-[1fr] opacity-100" : "mb-0 grid-rows-[0fr] opacity-0 sm:mb-5"}`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="cartao flex flex-wrap items-center justify-between gap-2 p-2.5 sm:flex-nowrap sm:p-3">
            {controlesMes}
            <div className="segmentado" role="group" aria-label="Formato da agenda">
              <button type="button" data-ativo={vista === "lista"} aria-pressed={vista === "lista"} onClick={() => escolherVista("lista")}><List size={15} aria-hidden /> Lista</button>
              <button type="button" data-ativo={vista === "calendario"} aria-pressed={vista === "calendario"} onClick={() => escolherVista("calendario")}><CalendarDays size={15} aria-hidden /> Calendário</button>
            </div>
            {filtros}
          </div>
        </div>
      </div>
      <div hidden={vista !== "lista"}>{lista}</div>
      <div hidden={vista !== "calendario"}>{calendario}</div>
    </>
  );
}
