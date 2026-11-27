"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";

type PreferenciaTema = "claro" | "escuro" | "sistema";

const CHAVE_TEMA = "ivas-tema-eventos";
const OPCOES: { id: PreferenciaTema; rotulo: string; Icone: typeof Sun }[] = [
  { id: "claro", rotulo: "Claro", Icone: Sun },
  { id: "escuro", rotulo: "Escuro", Icone: Moon },
  { id: "sistema", rotulo: "Sistema", Icone: Monitor },
];

function aplicarTema(preferencia: PreferenciaTema) {
  const escuro = preferencia === "escuro" || (preferencia === "sistema" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const rotaGuarnicao = window.location.pathname.startsWith("/guarnicao") || window.location.pathname === "/cadastro-guarnicao" || window.location.pathname === "/aguardando-aprovacao";
  if (rotaGuarnicao) delete document.documentElement.dataset.temaIvas;
  else document.documentElement.dataset.temaIvas = escuro ? "escuro" : "claro";
  document.documentElement.dataset.temaPreferencia = preferencia;
}

/** Seletor de aparência compartilhado entre a área pública e o painel Eventos. */
export function SeletorTema({ compacto = false, painel = false, lateral = false }: { compacto?: boolean; painel?: boolean; lateral?: boolean }) {
  const [preferencia, setPreferencia] = useState<PreferenciaTema>("sistema");
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obter = () => {
      try {
        const salva = localStorage.getItem(CHAVE_TEMA);
        return salva === "claro" || salva === "escuro" || salva === "sistema" ? salva : "sistema";
      } catch { return "sistema"; }
    };
    const sincronizar = () => {
      const atual = obter();
      setPreferencia(atual);
      aplicarTema(atual);
    };
    const cliqueFora = (evento: MouseEvent) => {
      if (ref.current && !ref.current.contains(evento.target as Node)) setAberto(false);
    };
    const tecla = (evento: KeyboardEvent) => evento.key === "Escape" && setAberto(false);
    const sistema = window.matchMedia("(prefers-color-scheme: dark)");
    const mudouSistema = () => { if (obter() === "sistema") aplicarTema("sistema"); };
    sincronizar();
    document.addEventListener("mousedown", cliqueFora);
    document.addEventListener("keydown", tecla);
    window.addEventListener("storage", sincronizar);
    window.addEventListener("ivas-tema-alterado", sincronizar);
    sistema.addEventListener("change", mudouSistema);
    return () => {
      document.removeEventListener("mousedown", cliqueFora);
      document.removeEventListener("keydown", tecla);
      window.removeEventListener("storage", sincronizar);
      window.removeEventListener("ivas-tema-alterado", sincronizar);
      sistema.removeEventListener("change", mudouSistema);
    };
  }, []);

  const selecionar = (valor: PreferenciaTema) => {
    setPreferencia(valor);
    try { localStorage.setItem(CHAVE_TEMA, valor); } catch { /* preferência aplicada nesta visita */ }
    aplicarTema(valor);
    window.dispatchEvent(new Event("ivas-tema-alterado"));
    setAberto(false);
  };
  const Selecionado = OPCOES.find((opcao) => opcao.id === preferencia)?.Icone ?? Monitor;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAberto((valor) => !valor)}
        aria-label={`Tema: ${preferencia}. Alterar aparência`}
        aria-expanded={aberto}
        aria-haspopup="dialog"
        className={compacto
          ? `grid h-10 w-10 place-items-center rounded-xl border shadow-cartao transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ouro-500 ${painel ? "border-white/10 bg-white/[0.04] text-mata-100 hover:bg-white/[0.1]" : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"}`
          : `flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ouro-500 ${painel ? "text-mata-100 hover:bg-white/[0.06]" : "text-stone-700 hover:bg-stone-50"}`}
      >
        <Selecionado size={16} className={painel ? "text-ouro-400" : "text-mata-600"} aria-hidden />
        {!compacto && <><span className="flex-1">Aparência</span><span className="text-xs font-normal text-stone-500">{OPCOES.find((opcao) => opcao.id === preferencia)?.rotulo}</span></>}
      </button>
      {aberto && (
        <div role="dialog" aria-label="Escolher aparência" className={`absolute z-[70] w-48 animate-surgir rounded-2xl border p-1.5 shadow-elevado ${lateral ? "right-full top-0 mr-2" : "right-0 bottom-full mb-2"} ${painel ? "border-white/10 bg-mata-950" : "border-stone-200 bg-white"}`}>
          <p className={`px-3 pt-2 pb-1 text-xs font-semibold tracking-wide uppercase ${painel ? "text-mata-300" : "text-stone-500"}`}>Aparência</p>
          {OPCOES.map(({ id, rotulo, Icone }) => (
            <button
              type="button"
              key={id}
              onClick={() => selecionar(id)}
              aria-pressed={preferencia === id}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${painel ? "text-mata-100 hover:bg-white/[0.06] aria-pressed:bg-white/10 aria-pressed:text-white" : "text-stone-700 hover:bg-stone-50 aria-pressed:bg-mata-50 aria-pressed:text-mata-800"}`}
            >
              <Icone size={16} className={painel ? "text-ouro-400" : "text-mata-600"} aria-hidden />
              <span className="flex-1">{rotulo}</span>
              {preferencia === id && <Check size={15} className={painel ? "text-ouro-400" : "text-mata-600"} aria-hidden />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
