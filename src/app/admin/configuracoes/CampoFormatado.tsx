"use client";

import { useRef, useState } from "react";
import { Bold, Eye, Italic, Underline } from "lucide-react";
import { TextoFormatado } from "@/components/TextoFormatado";

const ACOES = [
  { marca: "**", rotulo: "Negrito", atalho: "b", Icone: Bold },
  { marca: "*", rotulo: "Itálico", atalho: "i", Icone: Italic },
  { marca: "__", rotulo: "Sublinhado", atalho: "u", Icone: Underline },
] as const;

/**
 * Área de texto com barra de Negrito, Itálico e Sublinhado. Aplica (ou tira) a marca em volta do
 * trecho selecionado. Atalhos: Ctrl/⌘ + B, I, U. Mostra a prévia de como fica na página.
 */
export function CampoFormatado({ id, nome, inicial, placeholder }: { id: string; nome: string; inicial: string; placeholder?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [texto, setTexto] = useState(inicial);
  const [previa, setPrevia] = useState(false);

  function aplicar(marca: string) {
    const el = ref.current;
    if (!el) return;
    let { selectionStart: ini, selectionEnd: fim } = el;
    const v = el.value;
    // Seleção sem nada: aplica na palavra onde está o cursor
    if (ini === fim) {
      while (ini > 0 && /\S/.test(v[ini - 1])) ini--;
      while (fim < v.length && /\S/.test(v[fim])) fim++;
    }
    const trecho = v.slice(ini, fim);
    const t = marca.length;
    let novo: string, selIni: number, selFim: number;
    if (v.slice(ini - t, ini) === marca && v.slice(fim, fim + t) === marca) {
      // já marcado por fora: desmarca
      novo = v.slice(0, ini - t) + trecho + v.slice(fim + t);
      selIni = ini - t; selFim = fim - t;
    } else if (trecho.startsWith(marca) && trecho.endsWith(marca) && trecho.length > 2 * t) {
      // a seleção inclui as marcas: desmarca
      novo = v.slice(0, ini) + trecho.slice(t, -t) + v.slice(fim);
      selIni = ini; selFim = fim - 2 * t;
    } else {
      // espaços nas pontas ficam fora da marca (senão ela não fecha direito)
      const [, antes, meio, depois] = trecho.match(/^(\s*)([\s\S]*?)(\s*)$/)!;
      novo = v.slice(0, ini) + antes + marca + meio + marca + depois + v.slice(fim);
      selIni = ini + antes.length + t; selFim = selIni + meio.length;
    }
    setTexto(novo);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(selIni, selFim);
    });
  }

  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white focus-within:border-mata-400 focus-within:ring-4 focus-within:ring-mata-100">
      <div className="flex items-center gap-1 border-b border-stone-100 bg-stone-50/70 px-2 py-1.5">
        {ACOES.map(({ marca, rotulo, atalho, Icone }) => (
          <button
            key={marca}
            type="button"
            title={`${rotulo} (Ctrl+${atalho.toUpperCase()})`}
            aria-label={rotulo}
            onMouseDown={(e) => e.preventDefault()} // não tira a seleção do texto
            onClick={() => aplicar(marca)}
            className="grid h-8 w-8 place-items-center rounded-lg text-stone-600 transition hover:bg-white hover:text-stone-900 hover:shadow-sm"
          >
            <Icone size={16} strokeWidth={2.4} />
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-stone-200" />
        <button
          type="button"
          onClick={() => setPrevia((p) => !p)}
          aria-pressed={previa}
          className={`ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition ${previa ? "bg-mata-100 text-mata-800" : "text-stone-500 hover:bg-white hover:text-stone-800"}`}
        >
          <Eye size={14} /> Prévia
        </button>
      </div>
      {previa ? (
        <TextoFormatado texto={texto || "Nada escrito ainda."} className="min-h-44 px-3.5 py-3 text-[15px] leading-relaxed text-stone-700" />
      ) : (
        <textarea
          ref={ref}
          id={id}
          rows={8}
          maxLength={5000}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (!(e.ctrlKey || e.metaKey)) return;
            const acao = ACOES.find((a) => a.atalho === e.key.toLowerCase());
            if (acao) {
              e.preventDefault();
              aplicar(acao.marca);
            }
          }}
          placeholder={placeholder}
          className="block w-full resize-y border-0 bg-transparent px-3.5 py-3 text-[15px] leading-relaxed text-stone-800 outline-none placeholder:text-stone-400"
        />
      )}
      {/* o valor vai no formulário mesmo com a prévia aberta */}
      <input type="hidden" name={nome} value={texto} />
    </div>
  );
}
