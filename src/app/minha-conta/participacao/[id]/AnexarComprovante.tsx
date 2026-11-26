"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ImagePlus, Upload } from "lucide-react";
import { anexarComprovanteAction } from "@/app/eventos/inscricao-actions";
import { useImagem } from "@/components/useImagem";
import type { SituacaoPagamento } from "@/lib/types";

export function AnexarComprovante({ eventoId, inscricaoId, pagamento, temComprovante }: {
  eventoId: string; inscricaoId: string; pagamento: SituacaoPagamento; temComprovante: boolean;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [mensagem, setMensagem] = useState<{ ok?: string; erro?: string }>();
  const { local, erro, otimizando, escolher } = useImagem("comprovante");
  const elegivel = !temComprovante && ["pendente", "informado", "na_hora"].includes(pagamento);

  if (!elegivel) return null;

  return (
    <form
      className="mt-4 space-y-3 border-t border-stone-200 pt-4"
      onSubmit={(e) => {
        e.preventDefault();
        const dados = new FormData(e.currentTarget);
        iniciar(async () => {
          const resultado = await anexarComprovanteAction(eventoId, inscricaoId, dados);
          setMensagem(resultado);
          if (resultado.ok) router.refresh();
        });
      }}
    >
      <div>
        <p className="text-sm font-semibold text-stone-800">Enviar comprovante</p>
        <p className="mt-0.5 text-xs leading-relaxed text-stone-500">Anexe uma imagem do Pix para a coordenação conferir. PNG, JPG ou WEBP.</p>
      </div>
      <label className={`flex min-h-24 cursor-pointer items-center gap-3 rounded-xl border border-dashed px-3.5 py-3 transition ${local ? "border-emerald-400 bg-emerald-50/60" : "border-stone-300 bg-stone-50/70 hover:border-emerald-400 hover:bg-emerald-50/40"}`}>
        {local ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={local} alt="Prévia do comprovante" className="h-16 w-16 rounded-lg object-cover ring-1 ring-stone-200" />
        ) : (
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700"><ImagePlus size={20} /></span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-stone-800">{local ? "Comprovante selecionado" : "Escolher imagem"}</span>
          <span className="mt-0.5 block text-xs text-stone-500">{local ? "Toque para trocar o arquivo" : "Use uma foto ou captura de tela legível"}</span>
        </span>
        <input type="file" name="comprovante" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => escolher(e.currentTarget, e.target.files?.[0])} />
      </label>
      {otimizando && <p className="text-xs text-stone-500">Preparando a imagem…</p>}
      {erro && <p role="alert" className="text-xs text-red-700">{erro}</p>}
      {mensagem?.erro && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-200">{mensagem.erro}</p>}
      {mensagem?.ok && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800 ring-1 ring-emerald-200">{mensagem.ok}</p>}
      <button type="submit" disabled={pendente || otimizando || !local} className="btn-primario w-full">
        {pendente ? <><Upload size={16} className="animate-pulse" /> Enviando…</> : <><Check size={16} /> Enviar comprovante</>}
      </button>
    </form>
  );
}
