"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { ASPECTOS, type Notas } from "@/lib/depoimentos-regras";
import { enviarDepoimento } from "./actions";

export function FormularioDepoimento({ inscricaoId, jaAvaliou }: { inscricaoId: string; jaAvaliou: boolean }) {
  const [notas, setNotas] = useState<Partial<Notas>>({});
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState("");
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

  return <section className="cartao space-y-5" aria-labelledby="depor-titulo">
    <div>
      <h2 id="depor-titulo" className="text-lg font-semibold text-stone-900">Seu depoimento</h2>
      <p className="mt-1 text-sm text-stone-500">O relato será visto pela coordenação e pelos guardiões escalados neste ritual.</p>
    </div>
    {!jaAvaliou && <div className="space-y-4">
      <h3 className="text-sm font-semibold text-stone-800">Avalie sua experiência</h3>
      {ASPECTOS.map(([chave, rotulo]) => <div key={chave} className="rounded-xl border border-stone-200 bg-stone-50/70 p-3">
        <div className="flex items-center justify-between gap-3"><label htmlFor={`nota-${chave}`} className="text-sm font-medium text-stone-800">{rotulo}</label><output className="min-w-12 rounded-lg bg-mata-100 px-2 py-1 text-center font-bold text-mata-800 tabular-nums" htmlFor={`nota-${chave}`}>{notas[chave]?.toFixed(1).replace(".", ",") ?? "—"}</output></div>
        <div className="mt-2 flex items-center gap-3">
          <button type="button" aria-label={`Diminuir nota de ${rotulo}`} disabled={notas[chave] == null || notas[chave] === 1} onClick={() => setNotas((n) => ({ ...n, [chave]: Math.max(1, (n[chave] ?? 1) - 0.5) }))} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-stone-200 bg-white disabled:opacity-40"><Minus size={18} /></button>
          <input id={`nota-${chave}`} type="range" min="1" max="10" step="0.5" value={notas[chave] ?? 1} onChange={(e) => setNotas((n) => ({ ...n, [chave]: Number(e.target.value) }))} aria-valuetext={notas[chave] == null ? "Sem nota" : `${notas[chave]} de 10`} className="w-full accent-mata-700" />
          <button type="button" aria-label={`Aumentar nota de ${rotulo}`} disabled={notas[chave] === 10} onClick={() => setNotas((n) => ({ ...n, [chave]: Math.min(10, (n[chave] ?? 0.5) + 0.5) }))} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-stone-200 bg-white disabled:opacity-40"><Plus size={18} /></button>
        </div>
        <div className="flex justify-between text-xs text-stone-500"><span>1</span><span>10</span></div>
      </div>)}
    </div>}
    <div><label htmlFor="texto-depoimento" className="text-sm font-semibold text-stone-800">O que você gostaria de compartilhar?</label><textarea id="texto-depoimento" value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={2000} rows={5} className="campo mt-2 h-auto min-h-32 resize-y py-3" placeholder="Conte sobre sua experiência neste ritual" /><p className="text-right text-xs text-stone-500">{texto.length}/2.000</p></div>
    {erro && <p role="alert" className="text-sm text-red-700">{erro}</p>}
    <button type="button" disabled={pendente || !jaAvaliou && !completa || texto.trim().length < 10} onClick={enviar} className="btn-primario min-h-11 w-full disabled:opacity-50">{pendente ? "Enviando…" : "Enviar depoimento"}</button>
  </section>;
}
