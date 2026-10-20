"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight, Calendar, CalendarCheck, Check, CheckCircle2, Clock3, Hourglass,
  ImagePlus, MessageCircle, Receipt, ShieldCheck, Upload, X,
} from "lucide-react";
import { CartaoPix } from "./CartaoPix";
import { confirmarParticipacaoAction, informarPagamentoAction } from "@/app/eventos/inscricao-actions";
import type { ChavePix, SituacaoPagamento } from "@/lib/types";
import { useImagem } from "@/components/useImagem";
import { BotaoGoogle } from "@/components/BotaoGoogle";

type MinhaInscricao = {
  id: string;
  situacao: "confirmada" | "espera";
  pagamento: SituacaoPagamento;
  posicaoEspera?: number | null;
} | null;

type Props = {
  eventoId: string;
  tituloEvento: string;
  dataEvento: string; // Ex: "Sábado, 17 de Outubro"
  horaEvento: string; // Ex: "19:00"
  localEvento?: string | null;
  telefoneWhatsapp?: string | null;
  /** Chave Pix mostrada na janela, para quem quer contribuir logo. */
  chavePix?: ChavePix | null;
  /** Ritual: “Participar do Ritual”; demais tipos: “Participar do Encontro”. */
  ehRitual?: boolean;
  variante?: "hero" | "sidebar" | "sticky";
  className?: string;

  /** Sessão e inscrição de quem está vendo a página (undefined/null = não logado). */
  logado: boolean;
  /** Endereço desta página, para voltar aqui depois de entrar ou se cadastrar. */
  urlAtual: string;
  podeInscrever: boolean;
  motivoBloqueio?: string | null;
  vagasLivres: number;
  minhaInscricao: MinhaInscricao;
  podeCancelar: boolean;
  prazoTexto?: string;
  valorContribuicao?: number | null;
};

const formatoReal = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function BotaoParticipar({
  tituloEvento,
  dataEvento,
  horaEvento,
  localEvento,
  telefoneWhatsapp,
  ehRitual = true,
  chavePix,
  variante = "hero",
  className = "",
  eventoId,
  logado,
  urlAtual,
  podeInscrever,
  motivoBloqueio,
  vagasLivres,
  minhaInscricao,
  valorContribuicao,
}: Props) {
  const [aberto, setAberto] = useState(false);

  const numWhats = telefoneWhatsapp ? telefoneWhatsapp.replace(/\D/g, "") : "43999489000";
  const numFinal = numWhats.startsWith("55") ? numWhats : `55${numWhats}`;
  const textoMsg = encodeURIComponent(
    `Olá! Gostaria de informações sobre como participar do encontro "${tituloEvento}" (${dataEvento} às ${horaEvento}) no Instituto IVAS.`
  );
  const linkWhatsApp = `https://wa.me/${numFinal}?text=${textoMsg}`;
  const next = encodeURIComponent(urlAtual);

  // Verde sólido, sem sombra; só o ícone (sem quadro) e o texto
  const base =
    "group inline-flex cursor-pointer items-center justify-center font-semibold text-white " +
    "bg-emerald-600 transition duration-200 hover:bg-emerald-700 active:scale-[0.98] " +
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400";
  const estilosBotao = {
    hero: "h-13 gap-2.5 rounded-2xl px-7 text-base",
    sidebar: "h-12 w-full gap-2.5 rounded-xl px-5 text-[15px]",
    sticky: "h-11 gap-2 rounded-xl px-4 text-sm",
  }[variante];

  const rotuloBotao = variante === "sticky"
    ? (minhaInscricao?.situacao === "confirmada" ? "Confirmado" : minhaInscricao?.situacao === "espera" ? "Na espera" : "Participar")
    : minhaInscricao?.situacao === "confirmada"
      ? "Inscrição confirmada"
      : minhaInscricao?.situacao === "espera"
        ? "Você está na lista de espera"
        : ehRitual ? "Participar do Ritual" : "Participar do encontro";
  const IconeBotao = minhaInscricao?.situacao === "confirmada" ? CheckCircle2 : minhaInscricao?.situacao === "espera" ? Hourglass : CalendarCheck;

  return (
    <>
      <button type="button" onClick={() => setAberto(true)} className={`${base} ${estilosBotao} ${className}`}>
        <IconeBotao size={variante === "sticky" ? 17 : 19} strokeWidth={2.2} className="shrink-0" />
        <span className="whitespace-nowrap">{rotuloBotao}</span>
        {variante !== "sticky" && <ArrowRight size={17} className="shrink-0 opacity-80 transition-transform group-hover:translate-x-0.5" />}
      </button>

      {aberto && createPortal(
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm transition-opacity" onClick={() => setAberto(false)} />

          <div className="relative z-10 max-h-[calc(100dvh-2rem)] w-full max-w-lg animate-surgir overflow-y-auto rounded-3xl border border-stone-200/90 bg-white p-6 shadow-2xl sm:p-8">
            <button
              type="button"
              onClick={() => setAberto(false)}
              className="absolute top-4 right-4 grid h-8 w-8 place-items-center rounded-full text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
              aria-label="Fechar"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-ouro-100 text-ouro-700">
                <ShieldCheck size={24} />
              </span>
              <div>
                <span className="text-[11px] font-semibold tracking-wider text-ouro-700 uppercase">Inscrições & Presença</span>
                <h3 className="font-display text-xl font-bold text-stone-900">{ehRitual ? "Participar do ritual" : "Participar do encontro"}</h3>
              </div>
            </div>

            <div className="mt-5 rounded-2xl bg-stone-50 p-4 ring-1 ring-stone-200/70">
              <p className="font-semibold text-stone-900">{tituloEvento}</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-stone-600">
                <Calendar size={13} className="text-mata-600" />
                <span>{dataEvento} às {horaEvento}</span>
              </p>
              {localEvento && <p className="mt-1 text-xs text-stone-500">📍 {localEvento}</p>}
            </div>

            <div className="mt-5">
              {!logado ? (
                <SemSessao next={next} linkWhatsApp={linkWhatsApp} />
              ) : minhaInscricao ? (
                <Inscrito
                  eventoId={eventoId}
                  minhaInscricao={minhaInscricao}
                  ehRitual={ehRitual}
                  chavePix={chavePix}
                  valorContribuicao={valorContribuicao}
                />
              ) : (
                <SemInscricao
                  eventoId={eventoId}
                  podeInscrever={podeInscrever}
                  motivoBloqueio={motivoBloqueio}
                  vagasLivres={vagasLivres}
                  chavePix={chavePix}
                  linkWhatsApp={linkWhatsApp}
                />
              )}
            </div>

            {!(logado && minhaInscricao) && (
              <button type="button" onClick={() => setAberto(false)} className="btn-secundario mt-5 w-full">
                Voltar à página
              </button>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

/** Não logado: oferece entrar ou criar cadastro de participante (preservando a página atual). */
function SemSessao({ next, linkWhatsApp }: { next: string; linkWhatsApp: string }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-stone-600">Entre com sua conta ou crie um cadastro rápido para confirmar presença, ver seu histórico e avisar quando pagar a contribuição.</p>
      <BotaoGoogle next={decodeURIComponent(next)} />
      <div className="flex flex-col gap-2">
        <a href={`/cadastro?next=${next}`} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white shadow-md transition hover:bg-emerald-700 active:scale-[0.98]">
          <CalendarCheck size={18} /> Criar cadastro e confirmar
        </a>
        <a href={`/login?next=${next}`} className="btn-secundario w-full">Já tenho cadastro — Entrar</a>
      </div>
      <a href={linkWhatsApp} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 pt-1 text-xs text-stone-500 hover:text-emerald-700">
        <MessageCircle size={13} /> Prefere confirmar pelo WhatsApp?
      </a>
    </div>
  );
}

function SemInscricao({
  eventoId, podeInscrever, motivoBloqueio, vagasLivres, chavePix, linkWhatsApp,
}: {
  eventoId: string; podeInscrever: boolean; motivoBloqueio?: string | null; vagasLivres: number; chavePix?: ChavePix | null; linkWhatsApp: string;
}) {
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<{ ok?: string; erro?: string }>();

  if (!podeInscrever)
    return (
      <div className="space-y-4">
        <div className="flex gap-2.5 text-sm text-stone-600">
          <Clock3 size={18} className="mt-0.5 shrink-0 text-amber-600" />
          <p>{motivoBloqueio ?? "As inscrições deste evento não estão abertas no momento."}</p>
        </div>
        <a href={linkWhatsApp} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white shadow-md transition hover:bg-emerald-700">
          <MessageCircle size={17} /> Falar com a coordenação
        </a>
      </div>
    );

  return (
    <div className="space-y-4">
      {msg?.erro && <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700 ring-1 ring-red-200">{msg.erro}</p>}
      {msg?.ok && <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800 ring-1 ring-emerald-200"><Check size={16} />{msg.ok}</p>}
      <p className="text-sm text-stone-600">
        {vagasLivres > 0
          ? `${vagasLivres} vaga${vagasLivres > 1 ? "s" : ""} disponíve${vagasLivres > 1 ? "is" : "l"}.`
          : "As vagas estão preenchidas: você entrará na lista de espera e será avisado se alguém sair."}
      </p>
      {chavePix && (
        <div>
          <p className="mb-2 text-xs font-semibold tracking-wide text-stone-500 uppercase">Contribuição</p>
          <CartaoPix chave={chavePix} />
        </div>
      )}
      <button
        type="button"
        disabled={pendente}
        onClick={() => iniciar(async () => setMsg(await confirmarParticipacaoAction(eventoId)))}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white shadow-md transition hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-70"
      >
        <CalendarCheck size={18} /> {pendente ? "Confirmando…" : "Confirmar participação"}
      </button>
    </div>
  );
}

function Inscrito({
  eventoId, minhaInscricao, ehRitual, chavePix, valorContribuicao,
}: {
  eventoId: string; minhaInscricao: NonNullable<MinhaInscricao>;
  ehRitual: boolean; chavePix?: ChavePix | null; valorContribuicao?: number | null;
}) {
  const confirmada = minhaInscricao.situacao === "confirmada";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5 rounded-xl bg-stone-50 px-3.5 py-3 ring-1 ring-stone-200">
        {confirmada ? <CheckCircle2 size={19} className="shrink-0 text-emerald-600" /> : <Hourglass size={19} className="shrink-0 text-amber-600" />}
        <p className="text-sm font-medium text-stone-800">
          {confirmada
            ? "Você está confirmado(a) neste evento."
            : `Você está na lista de espera${minhaInscricao.posicaoEspera ? ` (posição ${minhaInscricao.posicaoEspera})` : ""}. Entra sozinho(a) se alguém sair.`}
        </p>
      </div>

      {ehRitual && !!valorContribuicao && valorContribuicao > 0 && (
        <PagamentoBloco
          eventoId={eventoId}
          inscricaoId={minhaInscricao.id}
          pagamento={minhaInscricao.pagamento}
          valorContribuicao={valorContribuicao}
          chavePix={chavePix}
        />
      )}

    </div>
  );
}

function PagamentoBloco({
  eventoId, inscricaoId, pagamento, valorContribuicao, chavePix,
}: { eventoId: string; inscricaoId: string; pagamento: SituacaoPagamento; valorContribuicao: number; chavePix?: ChavePix | null }) {
  const [abrirForm, setAbrirForm] = useState(false);
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<{ ok?: string; erro?: string }>();
  const { local, erro: erroFoto, otimizando, escolher } = useImagem("comprovante");

  if (pagamento === "pago")
    return (
      <div className="flex items-center gap-2.5 rounded-xl bg-emerald-50 px-3.5 py-3 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200">
        <CheckCircle2 size={18} /> Pagamento confirmado — obrigado pela contribuição!
      </div>
    );
  if (pagamento === "isento")
    return (
      <div className="flex items-center gap-2.5 rounded-xl bg-stone-50 px-3.5 py-3 text-sm font-medium text-stone-700 ring-1 ring-stone-200">
        <ShieldCheck size={18} /> Contribuição: isento.
      </div>
    );
  if (pagamento === "informado")
    return (
      <div className="flex items-center gap-2.5 rounded-xl bg-amber-50 px-3.5 py-3 text-sm font-medium text-amber-800 ring-1 ring-amber-200">
        <Hourglass size={18} /> Pagamento informado — aguardando confirmação da coordenação.
      </div>
    );

  const cabecalho = (
    <p className="flex items-center justify-between text-sm font-semibold text-stone-800">
      <span className="flex items-center gap-1.5"><Receipt size={15} className="text-ouro-600" /> Contribuição</span>
      <span className="text-3xl leading-none font-extrabold tracking-tight text-ouro-700 tabular-nums">{formatoReal(valorContribuicao)}</span>
    </p>
  );

  // Passo 1: pagar pelo Pix e tocar em "Confirmar pagamento"
  if (!abrirForm)
    return (
      <div className="space-y-3 rounded-2xl border border-ouro-200/80 bg-gradient-to-br from-ouro-50/60 to-white p-4">
        {cabecalho}
        {chavePix && <CartaoPix chave={chavePix} />}
        <button
          type="button"
          onClick={() => setAbrirForm(true)}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white shadow-md transition hover:bg-emerald-700 active:scale-[0.98]"
        >
          <Check size={17} strokeWidth={2.6} /> Confirmar pagamento
        </button>
      </div>
    );

  // Passo 2: o Pix some; o destaque é anexar o comprovante. Cancelar e enviar ficam fora do cartão.
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.set("valor", String(valorContribuicao));
        iniciar(async () => {
          const r = await informarPagamentoAction(eventoId, inscricaoId, fd);
          setMsg(r);
          if (r.ok) setAbrirForm(false);
        });
      }}
    >
      <div className="space-y-3 rounded-2xl border border-ouro-200/80 bg-gradient-to-br from-ouro-50/60 to-white p-4">
        {cabecalho}
        <p className="rounded-xl bg-emerald-50/70 px-3 py-2 text-[13px] leading-snug text-emerald-900 ring-1 ring-emerald-200/70">
          <strong>Quase lá!</strong> Anexe o comprovante do Pix (opcional) e toque em <strong>Confirmar aviso</strong>.
        </p>

        <label className={`flex min-h-28 w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed px-4 py-4 text-center transition ${local ? "border-emerald-400 bg-emerald-50/60" : "border-emerald-300 bg-white hover:border-emerald-500 hover:bg-emerald-50/40"}`}>
          {local ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={local} alt="Comprovante anexado" className="max-h-40 rounded-lg object-contain shadow-sm ring-1 ring-stone-200" />
              <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700"><Check size={15} strokeWidth={3} /> Comprovante anexado. Toque para trocar.</span>
            </>
          ) : (
            <>
              <span className="grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-emerald-700"><ImagePlus size={24} /></span>
              <span className="text-sm font-bold text-stone-800">Anexar comprovante</span>
              <span className="text-xs text-stone-500">Toque aqui para escolher a imagem</span>
            </>
          )}
          <input type="file" name="comprovante" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => escolher(e.currentTarget, e.target.files?.[0])} />
        </label>
        {otimizando && <p className="text-xs text-stone-500">Otimizando a imagem…</p>}
        {erroFoto && <p className="text-xs text-red-700">{erroFoto}</p>}
        {msg?.erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-200">{msg.erro}</p>}
      </div>

      <div className="flex gap-2">
        <button type="button" className="btn-secundario flex-1" onClick={() => setAbrirForm(false)}>Cancelar</button>
        <button type="submit" disabled={pendente || otimizando} className="btn-primario flex-1">
          {pendente ? <><Upload size={15} className="animate-pulse" /> Enviando…</> : "Confirmar aviso"}
        </button>
      </div>
    </form>
  );
}
