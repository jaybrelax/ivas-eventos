"use client";

import { useActionState, useState } from "react";
import { Type } from "lucide-react";
import { salvarTipografia } from "./actions";
import { Aviso, BotaoEnviar } from "@/components/ui";
import { FONTES_TEXTO, FONTES_TITULO, PADRAO_TEXTO, PADRAO_TITULO, urlGoogleFonts } from "@/lib/tipografia";

export function TipografiaForm({ titulo: tituloInicial, texto: textoInicial }: { titulo: string | null; texto: string | null }) {
  const [estado, acao] = useActionState(salvarTipografia, undefined);
  const [titulo, setTitulo] = useState(tituloInicial ?? PADRAO_TITULO);
  const [texto, setTexto] = useState(textoInicial ?? PADRAO_TEXTO);
  // Todas as opções carregadas para a prévia (só nesta tela)
  const todas = urlGoogleFonts([...FONTES_TITULO, ...FONTES_TEXTO].map((f) => f.nome));

  return (
    <form action={acao} className="cartao space-y-6">
      <link rel="stylesheet" href={todas} precedence="default" />
      <div>
        <h2 className="cartao-titulo">Página pública</h2>
        <p className="cartao-sub">Tipografia da agenda e das páginas dos eventos que o público vê.</p>
      </div>
      {estado?.erro && <Aviso>{estado.erro}</Aviso>}
      {estado?.ok && <Aviso tipo="ok">{estado.ok}</Aviso>}

      <div>
        <span className="rotulo flex items-center gap-1.5"><Type size={15} className="text-mata-600" /> Fonte do título dos eventos</span>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3" role="radiogroup">
          {FONTES_TITULO.map((f) => {
            const on = titulo === f.nome;
            return (
              <label
                key={f.nome}
                className={`cursor-pointer rounded-xl border p-3 transition ${on ? "border-mata-500 bg-mata-50/60 ring-2 ring-mata-200" : "border-stone-200 hover:border-stone-300"}`}
              >
                <input type="radio" name="fonte_publica_titulo" value={f.nome} checked={on} onChange={() => setTitulo(f.nome)} className="sr-only" />
                <span className="block truncate text-xl leading-tight text-stone-900" style={{ fontFamily: `"${f.nome}", ${f.tipo}` }}>Ritual da Lua</span>
                <span className="mt-1 block text-xs text-stone-500">{f.nome}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="max-w-sm">
        <label className="rotulo" htmlFor="fonte_publica_texto">Fonte dos textos</label>
        <select id="fonte_publica_texto" name="fonte_publica_texto" value={texto} onChange={(e) => setTexto(e.target.value)} className="campo">
          {FONTES_TEXTO.map((f) => <option key={f.nome}>{f.nome}</option>)}
        </select>
        <p className="ajuda">Descrições, orientações e demais textos.</p>
      </div>

      {/* Prévia com o mesmo visual do topo da página do evento */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-mata-900 via-mata-950 to-[#120a1c] p-6 text-white sm:p-8">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-ouro-300 uppercase">Prévia</p>
        <p className="mt-2 text-3xl leading-tight font-bold sm:text-4xl" style={{ fontFamily: `"${titulo}", serif` }}>O Raio da Justiça</p>
        <p className="mt-2 text-sm text-ouro-200/90" style={{ fontFamily: `"${texto}", sans-serif` }}>Ritual N° 524 · N° 79 de 2026</p>
        <p className="mt-4 max-w-prose text-[15px] leading-relaxed text-white/80" style={{ fontFamily: `"${texto}", sans-serif` }}>
          Existe uma justiça que vai além das leis humanas. Uma justiça que nos convida a olhar para dentro e reconhecer nossas ações.
        </p>
      </div>

      <div className="flex justify-end border-t border-stone-100 pt-5">
        <BotaoEnviar>Salvar tipografia</BotaoEnviar>
      </div>
    </form>
  );
}
