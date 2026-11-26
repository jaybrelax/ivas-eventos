"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Minus, Plus, Sparkles } from "lucide-react";
import { ASPECTOS, type Notas } from "@/lib/depoimentos-regras";
import { enviarDepoimento } from "./actions";
import { urlImagem } from "@/lib/links";

export function FormularioDepoimento({ inscricaoId, jaAvaliou, capa }: { inscricaoId: string; jaAvaliou: boolean; capa?: string | null }) {
  const [notas, setNotas] = useState<Partial<Notas>>({});
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState("");
  const [aberto, setAberto] = useState(false);
  const [pendente, iniciar] = useTransition();
  const [envioId, setEnvioId] = useState(() => crypto.randomUUID());
  const router = useRouter();
  const completa = ASPECTOS.every(([chave]) => notas[chave] != null);

  function enviar() {
    setErro("");
    iniciar(async () => {
      const resultado = await enviarDepoimento(inscricaoId, envioId, texto, jaAvaliou ? null : notas as Notas);
      if ("erro" in resultado) { setErro(resultado.erro ?? "Falha no envio."); return; }
      setTexto("");
      setEnvioId(crypto.randomUUID());
      router.refresh();
    });
  }

  return <section className="cartao space-y-4 border-violet-200/80 bg-gradient-to-br from-violet-50/70 via-white to-white p-4 sm:p-5" aria-labelledby="depor-titulo">
    <div>
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-700 sm:hidden"><Sparkles size={13} /> Sua experiência importa</span>
      <div className="mt-2 flex items-center gap-3">
        {capa && <img src={urlImagem(capa, 320)} width={112} height={112} loading="lazy" decoding="async" alt="Imagem do ritual" className="h-24 w-24 shrink-0 rounded-xl object-cover shadow-sm ring-1 ring-violet-200 sm:h-28 sm:w-28" />}
        <div className="min-w-0">
          <span className="hidden items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-700 sm:inline-flex"><Sparkles size={13} /> Sua experiência importa</span>
          <h2 id="depor-titulo" className="mt-1 text-xl font-semibold text-stone-900">Avalie este ritual</h2>
          <p className="mt-1 text-sm text-stone-500">Sua avaliação ajuda a coordenação e os guardiões escalados.</p>
        </div>
      </div>
    </div>
    {!aberto ? (
      <button type="button" onClick={() => setAberto(true)} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700">
        <Sparkles size={16} /> Avalie este ritual <ChevronDown size={16} />
      </button>
    ) : <>
    {!jaAvaliou && <div className="space-y-2">
      {ASPECTOS.map(([chave, rotulo]) => <div key={chave} className="rounded-lg border border-stone-200/80 bg-white/90 px-3 py-2">
        <div className="flex items-center justify-between gap-3"><label htmlFor={`nota-${chave}`} className="text-sm font-medium text-stone-800">{rotulo}</label><output className="min-w-10 text-right text-sm font-bold text-violet-800 tabular-nums" htmlFor={`nota-${chave}`}>{notas[chave]?.toFixed(1).replace(".", ",") ?? "—"}</output></div>
        <div className="mt-1 flex items-center gap-2">
          <button type="button" aria-label={`Diminuir nota de ${rotulo}`} disabled={notas[chave] == null || notas[chave] === 1} onClick={() => setNotas((n) => ({ ...n, [chave]: Math.max(1, (n[chave] ?? 1) - 0.5) }))} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-stone-500 transition hover:bg-violet-50 hover:text-violet-800 disabled:opacity-30"><Minus size={15} /></button>
          <input id={`nota-${chave}`} type="range" min="1" max="10" step="0.5" value={notas[chave] ?? 1} onChange={(e) => setNotas((n) => ({ ...n, [chave]: Number(e.target.value) }))} aria-valuetext={notas[chave] == null ? "Sem nota" : `${notas[chave]} de 10`} className="w-full accent-mata-700" />
          <button type="button" aria-label={`Aumentar nota de ${rotulo}`} disabled={notas[chave] === 10} onClick={() => setNotas((n) => ({ ...n, [chave]: Math.min(10, (n[chave] ?? 0.5) + 0.5) }))} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-stone-500 transition hover:bg-violet-50 hover:text-violet-800 disabled:opacity-30"><Plus size={15} /></button>
        </div>
      </div>)}
    </div>}
    <div><label htmlFor="texto-depoimento" className="text-sm font-semibold text-stone-800">O que você gostaria de compartilhar?</label><textarea id="texto-depoimento" value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={2000} rows={5} className="campo mt-2 h-auto min-h-32 resize-y py-3" placeholder="Conte sobre sua experiência neste ritual" /><p className="text-right text-xs text-stone-500">{texto.length}/2.000</p></div>
    {erro && <p role="alert" className="text-sm text-red-700">{erro}</p>}
    <button type="button" disabled={pendente || !jaAvaliou && !completa || texto.trim().length < 10} onClick={enviar} className="btn-primario min-h-11 w-full disabled:opacity-50">{pendente ? "Enviando…" : "Enviar depoimento"}</button>
    </>}
  </section>;
}
