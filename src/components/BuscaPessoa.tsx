"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Search, X } from "lucide-react";
import { Avatar } from "@/components/Avatar";

export type OpcaoPessoa = { id: string; nome: string; foto?: string | null };

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Campo de busca de pessoa: digita-se o nome (sem acento) e aparecem só as pessoas que combinam.
 * O valor enviado no formulário é o ID da pessoa escolhida (campo oculto com `name`).
 */
export function BuscaPessoa({
  name, opcoes, id, placeholder = "Digite o nome da pessoa…", limite = 8, aoMudar,
}: { name: string; opcoes: OpcaoPessoa[]; id?: string; placeholder?: string; limite?: number; /** Chamado sempre que a pessoa escolhida muda (null = nenhuma). */ aoMudar?: (o: OpcaoPessoa | null) => void }) {
  const uid = useId();
  const idCampo = id ?? uid;
  const [texto, setTexto] = useState("");
  const [escolhida, setEscolhida] = useState<OpcaoPessoa | null>(null);
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(0);

  const termo = semAcento(texto.trim());
  const resultados = useMemo(
    () => (termo.length < 2 ? [] : opcoes.filter((o) => semAcento(o.nome).includes(termo)).slice(0, limite)),
    [opcoes, termo, limite],
  );
  const listaVisivel = aberto && !escolhida && resultados.length > 0;
  useEffect(() => { aoMudar?.(escolhida); }, [escolhida]); // eslint-disable-line react-hooks/exhaustive-deps
  // Lista que abre dentro de um painel com rolagem (ex.: modal): leva a lista para a área visível
  const listaRef = useRef<HTMLUListElement>(null);
  useEffect(() => { if (listaVisivel) listaRef.current?.scrollIntoView({ block: "nearest" }); }, [listaVisivel, resultados.length]);

  const escolher = (o: OpcaoPessoa) => {
    setEscolhida(o);
    setTexto(o.nome);
    setAberto(false);
  };
  const limpar = () => {
    setEscolhida(null);
    setTexto("");
    setAberto(false);
  };
  const teclas = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") return setAberto(false);
    if (!listaVisivel) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setAtivo((i) => (i + 1) % resultados.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setAtivo((i) => (i - 1 + resultados.length) % resultados.length); }
    else if (e.key === "Enter") { e.preventDefault(); escolher(resultados[ativo]); }
  };

  return (
    <div className="relative">
      <input type="hidden" name={name} value={escolhida?.id ?? ""} />
      {escolhida ? (
        <span className="pointer-events-none absolute top-1/2 left-2 z-10 -translate-y-1/2">
          <Avatar nome={escolhida.nome} foto={escolhida.foto} tamanho={24} leve className="ring-0" />
        </span>
      ) : (
        <Search size={15} className="pointer-events-none absolute top-1/2 left-3 z-10 -translate-y-1/2 text-stone-400" aria-hidden />
      )}
      <input
        id={idCampo}
        type="text"
        role="combobox"
        aria-expanded={listaVisivel}
        aria-controls={`${idCampo}-lista`}
        aria-autocomplete="list"
        autoComplete="off"
        value={texto}
        placeholder={placeholder}
        onChange={(e) => { setTexto(e.target.value); setEscolhida(null); setAberto(true); setAtivo(0); }}
        onFocus={() => setAberto(true)}
        onBlur={() => setTimeout(() => setAberto(false), 120)}
        onKeyDown={teclas}
        className={`campo pr-9 ${escolhida ? "pl-11" : "pl-9"}`}
      />
      {texto && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={limpar}
          className="absolute top-1/2 right-2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-stone-400 hover:bg-stone-100"
          aria-label="Limpar pessoa"
        >
          <X size={14} aria-hidden />
        </button>
      )}
      {listaVisivel && (
        <ul ref={listaRef} id={`${idCampo}-lista`} role="listbox" className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-stone-200 bg-white py-1 shadow-lg">
          {resultados.map((o, i) => (
            <li
              key={o.id}
              role="option"
              aria-selected={i === ativo}
              onMouseDown={(e) => { e.preventDefault(); escolher(o); }}
              onMouseEnter={() => setAtivo(i)}
              className={`cursor-pointer px-3 py-2 text-sm ${i === ativo ? "bg-mata-50 text-mata-900" : "text-stone-700"}`}
            >
              <span className="flex items-center gap-2.5">
                <Avatar nome={o.nome} foto={o.foto} tamanho={24} leve className="ring-0" />
                {o.nome}
              </span>
            </li>
          ))}
        </ul>
      )}
      {aberto && !escolhida && termo.length >= 2 && resultados.length === 0 && (
        <p className="absolute z-20 mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-500 shadow-lg">Ninguém encontrado.</p>
      )}
    </div>
  );
}
