"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ImagePlus, Send, ShoppingBag, Upload, X } from "lucide-react";
import { CartaoPix } from "@/components/publico/CartaoPix";
import { useImagem } from "@/components/useImagem";
import type { ChavePix } from "@/lib/types";
import { cederCreditoAction, comprarPacoteAction, localizarDestinatarioAction } from "./creditos-actions";

type Resultado = { ok?: string; erro?: string };
export type PlanoVisivel = { id: string; nome: string; quantidade: number; valor: number; descricao: string | null };

const formatoReal = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Mensagem({ r }: { r?: Resultado }) {
  if (!r) return null;
  if (r.erro) return <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-200">{r.erro}</p>;
  if (r.ok) return <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800 ring-1 ring-emerald-200">{r.ok}</p>;
  return null;
}

/** Compra de pacote: escolhe o plano, paga por Pix e avisa (comprovante opcional). Os créditos só liberam quando a coordenação confirmar. */
export function ComprarPacote({ planos, chavePix }: { planos: PlanoVisivel[]; chavePix: ChavePix | null }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [planoId, setPlanoId] = useState<string | null>(null);
  const [msg, setMsg] = useState<Resultado>();
  const [pendente, iniciar] = useTransition();
  const { local, erro: erroFoto, otimizando, escolher } = useImagem("comprovante");
  const plano = planos.find((p) => p.id === planoId) ?? null;

  if (!planos.length) return <p className="text-sm text-stone-500">Nenhum pacote está à venda no momento.</p>;

  if (!aberto) {
    return (
      <button type="button" className="btn-primario" onClick={() => { setAberto(true); setMsg(undefined); }}>
        <ShoppingBag size={16} aria-hidden /> Comprar pacote
      </button>
    );
  }

  const fechar = () => { setAberto(false); setPlanoId(null); };

  return (
    <div className="space-y-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-stone-900">{plano ? "Pagar o pacote" : "Escolha um pacote"}</h3>
        <button type="button" onClick={fechar} className="grid h-8 w-8 place-items-center rounded-full text-stone-500 hover:bg-stone-100" aria-label="Fechar"><X size={16} /></button>
      </div>

      {!plano && (
        <ul className="grid gap-2 sm:grid-cols-2">
          {planos.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => { setPlanoId(p.id); setMsg(undefined); }}
                className="w-full rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-left transition hover:border-mata-300 hover:bg-white active:scale-[0.99]"
              >
                <span className="block text-sm font-semibold text-stone-900">{p.nome}</span>
                <span className="mt-0.5 block text-xs text-stone-500">{p.quantidade} {p.quantidade === 1 ? "crédito" : "créditos"} · 1 por ritual</span>
                <span className="mt-1.5 block text-lg font-semibold tabular-nums text-mata-800">{formatoReal(p.valor)}</span>
                {p.descricao && <span className="mt-1 block text-xs text-stone-500">{p.descricao}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}

      {plano && (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            setMsg(undefined);
            iniciar(async () => {
              const r = await comprarPacoteAction(plano.id, fd);
              setMsg(r);
              if (r.ok) { router.refresh(); setTimeout(fechar, 1800); }
            });
          }}
        >
          <div className="rounded-xl bg-mata-50/60 p-3 ring-1 ring-mata-100">
            <p className="text-sm font-semibold text-stone-900">{plano.nome}</p>
            <p className="text-xs text-stone-500">{plano.quantidade} {plano.quantidade === 1 ? "crédito" : "créditos"}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-mata-800">{formatoReal(plano.valor)}</p>
          </div>

          {chavePix
            ? <CartaoPix chave={chavePix} />
            : <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">A chave Pix ainda não está cadastrada. Fale com a coordenação para pagar.</p>}

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-stone-600">Comprovante (opcional)</p>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-stone-200 bg-stone-50 p-3 transition hover:border-mata-300">
              {local
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={local} alt="Comprovante escolhido" className="h-14 w-14 rounded-lg object-cover" />
                : <span className="grid h-14 w-14 place-items-center rounded-lg bg-white text-stone-400 ring-1 ring-stone-200"><ImagePlus size={20} /></span>}
              <span className="text-xs text-stone-500">{local ? "Toque para trocar a imagem" : "Toque para enviar a imagem do comprovante"}</span>
              <input type="file" name="comprovante" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => escolher(e.currentTarget, e.target.files?.[0])} />
            </label>
            {otimizando && <p className="text-xs text-stone-500">Otimizando a imagem…</p>}
            {erroFoto && <p className="text-xs text-red-700">{erroFoto}</p>}
          </div>

          <Mensagem r={msg} />
          <p className="text-xs text-stone-500">Depois de pagar, toque em “Já paguei”. Seus créditos ficam disponíveis assim que a coordenação confirmar o pagamento.</p>
          <div className="flex gap-2">
            <button type="button" className="btn-secundario flex-1" onClick={() => setPlanoId(null)} disabled={pendente}><ArrowLeft size={15} aria-hidden /> Voltar</button>
            <button type="submit" disabled={pendente || otimizando || !!msg?.ok} className="btn-primario flex-1">
              {pendente ? <><Upload size={15} className="animate-pulse" aria-hidden /> Enviando…</> : "Já paguei"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/** Cessão em dois passos: e-mail da pessoa, confirmação com o nome dela. Só o destinatário poderá usar o crédito. */
export function CederCredito({ creditoId, rotulo }: { creditoId: string; rotulo: string }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [email, setEmail] = useState("");
  const [destino, setDestino] = useState<string | null>(null);
  const [msg, setMsg] = useState<Resultado>();
  const [pendente, iniciar] = useTransition();

  const fechar = () => { setAberto(false); setEmail(""); setDestino(null); setMsg(undefined); };

  if (!aberto) {
    return (
      <button type="button" className="inline-flex items-center gap-1 text-xs font-semibold text-mata-700 hover:underline" onClick={() => setAberto(true)}>
        <Send size={12} aria-hidden /> Ceder
      </button>
    );
  }

  return (
    <div className="mt-2 w-full space-y-2 rounded-xl bg-stone-50 p-3 ring-1 ring-stone-200">
      {!destino ? (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            setMsg(undefined);
            iniciar(async () => {
              const r = await localizarDestinatarioAction(email);
              if (r.nome) setDestino(r.nome); else setMsg({ erro: r.erro });
            });
          }}
        >
          <label className="block text-xs font-medium text-stone-700" htmlFor={`ceder-${creditoId}`}>E-mail de quem vai receber o crédito {rotulo}</label>
          <input id={`ceder-${creditoId}`} type="email" required autoFocus autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="pessoa@email.com" className="campo h-10 text-sm" />
          <Mensagem r={msg} />
          <div className="flex gap-2">
            <button type="button" className="btn-secundario h-9 flex-1 text-xs" onClick={fechar} disabled={pendente}>Cancelar</button>
            <button type="submit" className="btn-primario h-9 flex-1 text-xs" disabled={pendente || !email.trim()}>{pendente ? "Procurando…" : "Continuar"}</button>
          </div>
        </form>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-stone-800">Ceder o crédito <strong>{rotulo}</strong> para <strong>{destino}</strong>?</p>
          <p className="text-xs text-stone-500">Depois da cessão, só essa pessoa poderá usar o crédito, e ele não poderá ser cedido de novo.</p>
          <Mensagem r={msg} />
          <div className="flex gap-2">
            <button type="button" className="btn-secundario h-9 flex-1 text-xs" onClick={() => { setDestino(null); setMsg(undefined); }} disabled={pendente}>Voltar</button>
            <button
              type="button"
              className="btn-primario h-9 flex-1 text-xs"
              disabled={pendente || !!msg?.ok}
              onClick={() => iniciar(async () => {
                const r = await cederCreditoAction(creditoId, email);
                setMsg(r);
                if (r.ok) { router.refresh(); setTimeout(fechar, 1500); }
              })}
            >
              {pendente ? "Cedendo…" : "Confirmar cessão"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
