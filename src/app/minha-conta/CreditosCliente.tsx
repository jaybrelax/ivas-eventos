"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ImagePlus, Send, ShoppingBag, Upload, X } from "lucide-react";
import { CartaoPix } from "@/components/publico/CartaoPix";
import { useImagem } from "@/components/useImagem";
import type { ChavePix } from "@/lib/types";
import { cederCreditosAction, comprarPacoteAction, localizarDestinatarioAction } from "./creditos-actions";

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
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-stone-900">{plano ? "Pagar o pacote" : "Escolha um pacote"}</h3>
        <button type="button" onClick={fechar} className="grid h-8 w-8 place-items-center rounded-full text-stone-500 hover:bg-stone-100" aria-label="Fechar"><X size={16} /></button>
      </div>

      {!plano && (
        <ul className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
          {planos.map((p) => (
            <li key={p.id} className="flex">
              <button
                type="button"
                onClick={() => { setPlanoId(p.id); setMsg(undefined); }}
                aria-label={`${p.nome}: ${p.quantidade} ${p.quantidade === 1 ? "crédito" : "créditos"} por ${formatoReal(p.valor)}`}
                className="pacote-compra-card group relative flex w-full flex-col overflow-hidden rounded-2xl border border-stone-200 bg-gradient-to-br from-white via-white to-mata-50 p-3.5 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-mata-300 hover:shadow-cartao focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mata-600 active:scale-[0.99] sm:p-4"
              >
                <span aria-hidden className="pacote-compra-numero pointer-events-none absolute -right-3 -bottom-8 select-none text-[9rem] leading-none font-black tracking-tighter tabular-nums text-mata-100/80 transition duration-300 group-hover:text-mata-200/80">{p.quantidade}</span>
                <span className="pacote-compra-titulo relative text-base font-bold tracking-wide text-stone-900 sm:text-lg">{p.nome}</span>
                <span className="pacote-compra-detalhe relative mt-0.5 text-xs text-stone-500">{p.quantidade} {p.quantidade === 1 ? "crédito" : "créditos"} · 1 por ritual</span>
                <span className="pacote-compra-preco relative mt-auto pt-10 text-xl font-semibold tracking-tight tabular-nums text-mata-800">{formatoReal(p.valor)}</span>
                {p.descricao && <span className="pacote-compra-descricao relative mt-1 text-xs text-stone-500">{p.descricao}</span>}
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
            ? <CartaoPix chave={chavePix} valor={plano.valor} descricao={plano.nome} />
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
          <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900 ring-1 ring-amber-200">
            <p className="font-semibold">Antes de finalizar:</p>
            <ol className="mt-1 list-decimal space-y-0.5 pl-4">
              <li>Pague pelo QR Code ou pela chave Pix.</li>
              <li>Anexe o comprovante do pagamento aqui em cima.</li>
              <li>Toque em “Já paguei”.</li>
            </ol>
            <p className="mt-1.5 text-amber-800">Os créditos ficam disponíveis assim que a coordenação confirmar o pagamento.</p>
          </div>
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

export type PacoteCedivel = { id: string; nome: string; cediveis: number };

/** Ceder créditos: escolhe o pacote e quantos, informa o e-mail, confirma com o nome da pessoa. Um botão só, sem card por crédito. */
export function CederCreditos({ pacotes, limite, permitirRecessao }: { pacotes: PacoteCedivel[]; limite: number; permitirRecessao: boolean }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [pacoteId, setPacoteId] = useState(pacotes[0]?.id ?? "");
  const [qtd, setQtd] = useState("1");
  const [email, setEmail] = useState("");
  const [destino, setDestino] = useState<string | null>(null);
  const [msg, setMsg] = useState<Resultado>();
  const [pendente, iniciar] = useTransition();

  const pacote = pacotes.find((p) => p.id === pacoteId) ?? pacotes[0] ?? null;
  const maximo = Math.min(pacote?.cediveis ?? 0, limite);
  const quantidade = Math.min(Math.max(1, Math.floor(Number(qtd) || 1)), maximo);

  const fechar = () => { setAberto(false); setEmail(""); setDestino(null); setQtd("1"); setMsg(undefined); };

  if (!aberto) {
    return (
      <button type="button" className="btn-secundario h-9 px-3 text-sm" onClick={() => { setAberto(true); setMsg(undefined); }}>
        <Send size={14} aria-hidden /> Ceder créditos
      </button>
    );
  }

  return (
    <div className="w-full space-y-3 rounded-2xl bg-stone-50 p-3 ring-1 ring-stone-200 sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-stone-900">Ceder créditos</h3>
        <button type="button" onClick={fechar} className="grid h-8 w-8 place-items-center rounded-full text-stone-500 hover:bg-stone-100" aria-label="Fechar"><X size={16} /></button>
      </div>

      <p className="text-xs leading-relaxed text-stone-500">Você pode ceder até {maximo} crédito(s) deste pacote, respeitando o limite de metade do seu saldo atual.</p>
      {!destino ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setMsg(undefined);
            iniciar(async () => {
              const r = await localizarDestinatarioAction(email);
              if (r.nome) setDestino(r.nome); else setMsg({ erro: r.erro });
            });
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="rotulo" htmlFor="ceder-pacote">Pacote</label>
              <select id="ceder-pacote" value={pacote?.id ?? ""} onChange={(e) => { setPacoteId(e.target.value); setQtd("1"); }} className="campo h-10 text-sm">
                {pacotes.map((p) => <option key={p.id} value={p.id}>{p.nome} · {p.cediveis} disponíveis</option>)}
              </select>
            </div>
            <div>
              <label className="rotulo" htmlFor="ceder-qtd">Quantidade</label>
              <input id="ceder-qtd" type="number" inputMode="numeric" min={1} max={maximo} value={qtd} onChange={(e) => setQtd(e.target.value)} className="campo h-10 text-sm tabular-nums" />
            </div>
          </div>
          <div>
            <label className="rotulo" htmlFor="ceder-email">E-mail de quem vai receber</label>
            <input id="ceder-email" type="email" required autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="pessoa@email.com" className="campo h-10 text-sm" />
          </div>
          <Mensagem r={msg} />
          <div className="flex gap-2">
            <button type="button" className="btn-secundario h-9 flex-1 text-xs" onClick={fechar} disabled={pendente}>Cancelar</button>
            <button type="submit" className="btn-primario h-9 flex-1 text-xs" disabled={pendente || !email.trim() || maximo < 1}>{pendente ? "Procurando…" : "Continuar"}</button>
          </div>
        </form>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-stone-800">
            Ceder <strong>{quantidade} {quantidade === 1 ? "crédito" : "créditos"}</strong> do pacote <strong>{pacote?.nome}</strong> para <strong>{destino}</strong>?
          </p>
          <p className="text-xs text-stone-500">Depois da cessão, só essa pessoa poderá usar esses créditos.{permitirRecessao ? " Ela poderá cedê-los novamente, conforme as regras do Instituto." : " Eles não poderão ser cedidos de novo enquanto essa opção estiver desativada."}</p>
          <Mensagem r={msg} />
          <div className="flex gap-2">
            <button type="button" className="btn-secundario h-9 flex-1 text-xs" onClick={() => { setDestino(null); setMsg(undefined); }} disabled={pendente}>Voltar</button>
            <button
              type="button"
              className="btn-primario h-9 flex-1 text-xs"
              disabled={pendente || !!msg?.ok || !pacote}
              onClick={() => {
                if (!pacote) return;
                iniciar(async () => {
                  const r = await cederCreditosAction(pacote.id, quantidade, email);
                  setMsg(r);
                  if (r.ok) { router.refresh(); setTimeout(fechar, 1800); }
                });
              }}
            >
              {pendente ? "Cedendo…" : "Confirmar cessão"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
