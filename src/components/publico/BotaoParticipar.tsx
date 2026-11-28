"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  ArrowRight, Calendar, CalendarCheck, Check, CheckCircle2, Clock3, Hourglass,
  Gift, ImagePlus, MessageCircle, QrCode, Receipt, ShieldCheck, Ticket, Upload, X,
} from "lucide-react";
import { CartaoPix } from "./CartaoPix";
import { anexarComprovanteAction, confirmarParticipacaoAction, contribuirNaHoraAction, informarPagamentoAction, usarBonusAniversarioAction, usarCreditoDoParticipanteAction } from "@/app/eventos/inscricao-actions";
import type { ChavePix, SituacaoPagamento } from "@/lib/types";
import { useImagem } from "@/components/useImagem";
import { BotaoGoogle } from "@/components/BotaoGoogle";
import { urlImagem } from "@/lib/links";

type MinhaInscricao = {
  id: string;
  situacao: "confirmada" | "espera";
  pagamento: SituacaoPagamento;
  temComprovante?: boolean;
  posicaoEspera?: number | null;
} | null;

type Props = {
  eventoId: string;
  /** Abre a janela de participação ao carregar (quem acabou de se cadastrar vindo desta página). */
  abrirAoCarregar?: boolean;
  /** Abre já na etapa de anexar o comprovante da contribuição (link "Avisar contribuição" de Minhas inscrições). */
  abrirNoComprovante?: boolean;
  /** Abre as opções de contribuição, inclusive quando a pessoa já havia escolhido pagar no dia. */
  abrirOpcoesContribuicao?: boolean;
  tituloEvento: string;
  dataEvento: string; // Ex: "Sábado, 17 de Outubro"
  /** Data do card do modal, compacta: "Sábado, 17/10/2026". */
  dataCompacta?: string;
  horaEvento: string; // Ex: "19:00"
  localEvento?: string | null;
  /** Foto do local (cadastrada no endereço): miniatura à esquerda do card do evento. */
  fotoLocal?: string | null;
  /** Capa do evento: miniatura do card enquanto a pessoa ainda não concluiu (confirmar e avisar a contribuição). */
  capaEvento?: string | null;
  telefoneWhatsapp?: string | null;
  /** Chave Pix mostrada na janela, para quem quer contribuir logo. */
  chavePix?: ChavePix | null;
  /** Ritual: “Participar do Ritual”; demais tipos: “Participar do Encontro”. */
  ehRitual?: boolean;
  variante?: "hero" | "sidebar" | "sticky";
  /** Texto fixo do botão; vale enquanto a pessoa não está inscrita (ex.: “Quero participar”). */
  rotulo?: string;
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
  /** Créditos de pacote do usuário (só para rituais): quantos tem disponíveis e o saldo (negativo = deve participações). */
  creditos?: { disponiveis: number; saldo: number } | null;
  /** Bônus anual disponível para este ritual no mês do aniversário. */
  bonusAniversario?: { disponivel: boolean; mesNome: string | null } | null;
};

let reivindicado: string | null = null;

const formatoReal = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function BotaoParticipar({
  tituloEvento,
  dataEvento,
  dataCompacta,
  horaEvento,
  localEvento,
  fotoLocal,
  capaEvento,
  telefoneWhatsapp,
  ehRitual = true,
  chavePix,
  variante = "hero",
  rotulo: rotuloFixo,
  className = "",
  eventoId,
  abrirAoCarregar = false,
  abrirNoComprovante = false,
  abrirOpcoesContribuicao = false,
  logado,
  urlAtual,
  podeInscrever,
  motivoBloqueio,
  vagasLivres,
  minhaInscricao,
  valorContribuicao,
  creditos = null,
  bonusAniversario = null,
}: Props) {
  const [aberto, setAberto] = useState(false);
  // Etapa de anexar o comprovante (vem de "Já fiz a contribuição" ou do link "Avisar contribuição")
  const [pagando, setPagando] = useState(abrirNoComprovante);
  const [mostrarResultado, setMostrarResultado] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const fechar = () => { setAberto(false); setPagando(false); setMostrarResultado(false); };
  const revelarResultado = () => {
    setMostrarResultado(true);
    setPagando(false);
    window.requestAnimationFrame(() => modalRef.current?.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    }));
  };
  const abrirComprovanteAgora = () => {
    setMostrarResultado(false);
    setPagando(true);
  };

  // A página tem mais de um botão de participar: só o primeiro a carregar abre a janela (ela sai num portal, então aparece igual).
  useEffect(() => {
    if (!abrirAoCarregar || reivindicado === window.location.href) return;
    reivindicado = window.location.href;
    setAberto(true);
    if (abrirNoComprovante) setPagando(true);
    const url = new URL(window.location.href);
    url.searchParams.delete("participar");
    url.searchParams.delete("pagar");
    url.searchParams.delete("contribuir");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }, [abrirAoCarregar, abrirNoComprovante]);

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
    "transition duration-200 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 " +
    (minhaInscricao
      ? "bg-violet-700 hover:bg-violet-800 focus-visible:outline-violet-400"
      : "bg-emerald-600 hover:bg-emerald-700 focus-visible:outline-emerald-400");
  const estilosBotao = {
    hero: "h-13 gap-2.5 rounded-2xl px-7 text-base",
    sidebar: "h-12 w-full gap-2.5 rounded-xl px-5 text-[15px]",
    sticky: "h-11 gap-2 rounded-xl px-4 text-sm",
  }[variante];

  const rotuloBotao = rotuloFixo && !minhaInscricao ? rotuloFixo : variante === "sticky"
    ? (minhaInscricao?.situacao === "confirmada" ? "Confirmado" : minhaInscricao?.situacao === "espera" ? "Na espera" : "Participar")
    : minhaInscricao?.situacao === "confirmada"
      ? "Inscrição confirmada"
      : minhaInscricao?.situacao === "espera"
        ? "Você está na lista de espera"
        : ehRitual ? "Participar do Ritual" : "Participar do encontro";
  const exigeContribuicao = ehRitual && !!valorContribuicao && valorContribuicao > 0;
  const podeEscolherBonus = !!bonusAniversario?.disponivel && minhaInscricao?.situacao === "confirmada" &&
    ["pendente", "na_hora", "credito"].includes(minhaInscricao.pagamento);
  const podeAnexarComprovante = minhaInscricao?.situacao === "confirmada" &&
    !minhaInscricao.temComprovante && ["pendente", "informado", "na_hora"].includes(minhaInscricao.pagamento);
  const etapa = !logado || !minhaInscricao ? "participacao" : (minhaInscricao.situacao === "confirmada" && (
    exigeContribuicao && minhaInscricao.pagamento === "pendente" || podeEscolherBonus || (pagando && podeAnexarComprovante) || abrirOpcoesContribuicao
  )) && !mostrarResultado
    ? "contribuicao" : "resultado";
  const miniaturaId = etapa === "resultado" ? fotoLocal ?? capaEvento : capaEvento ?? fotoLocal;
  const miniaturaAlt = miniaturaId === fotoLocal ? "Foto do local" : "Capa do evento";
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
          <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm transition-opacity" onClick={fechar} />

          <div ref={modalRef} className="relative z-10 max-h-[calc(100dvh-2rem)] w-full max-w-lg animate-surgir overflow-y-auto rounded-3xl border border-stone-200/90 bg-white p-4 shadow-2xl sm:p-8">
            <button
              type="button"
              onClick={fechar}
              className="absolute top-4 right-4 grid h-8 w-8 place-items-center rounded-full text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
              aria-label="Fechar"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3">
              <span className="publico-participar-cabecalho-icone grid h-12 w-12 place-items-center rounded-2xl bg-ouro-100 text-ouro-700">
                <ShieldCheck size={24} />
              </span>
              <div>
                <span className="publico-participar-cabecalho-label text-[11px] font-semibold tracking-wider text-ouro-700 uppercase">Inscrições & Presença</span>
                <h3 className="font-display text-xl font-bold text-stone-900">{ehRitual ? "Participar do ritual" : "Participar do encontro"}</h3>
              </div>
            </div>

            {etapa === "resultado" && minhaInscricao && <StatusInscricao inscricao={minhaInscricao} />}

            {(etapa === "participacao" || etapa === "resultado") && (
              <div className={`mt-5 flex items-center gap-3 rounded-2xl bg-stone-50 p-3 sm:p-4 ring-1 ring-stone-200/70 ${etapa === "resultado" ? "animate-surgir [animation-delay:0.15s]" : ""}`}>
                {miniaturaId && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={urlImagem(miniaturaId, 160)} width={64} height={64} decoding="async" alt={miniaturaAlt} className="h-16 w-16 shrink-0 rounded-xl object-cover ring-1 ring-stone-200" />
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-stone-900">{tituloEvento}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-stone-600">
                    <Calendar size={13} className="text-mata-600" />
                    <span>{dataCompacta ?? dataEvento} às {horaEvento}</span>
                  </p>
                  {localEvento && <p className="mt-1 text-xs text-stone-500">📍 {localEvento}</p>}
                </div>
              </div>
            )}

            {etapa === "participacao" && (
              <div className="mt-5">
                {!logado ? (
                  <SemSessao next={next} linkWhatsApp={linkWhatsApp} />
                ) : (
                  <SemInscricao
                    eventoId={eventoId}
                    podeInscrever={podeInscrever}
                    motivoBloqueio={motivoBloqueio}
                    vagasLivres={vagasLivres}
                    linkWhatsApp={linkWhatsApp}
                  />
                )}
              </div>
            )}

            {etapa === "contribuicao" && minhaInscricao && (
              <div className="mt-5">
                <PagamentoBloco
                  eventoId={eventoId}
                  inscricaoId={minhaInscricao.id}
                  valorContribuicao={valorContribuicao ?? 0}
                  pagamentoAtual={minhaInscricao.pagamento}
                  temComprovante={!!minhaInscricao.temComprovante}
                  bonusAniversario={bonusAniversario}
                  creditosDisponiveis={creditos?.disponiveis ?? 0}
                  chavePix={chavePix}
                  abrirForm={pagando}
                  setAbrirForm={setPagando}
                  onContribuicaoConcluida={revelarResultado}
                />
              </div>
            )}

            {etapa === "participacao" && logado && (
              <button type="button" onClick={fechar} className="btn-secundario mt-5 w-full">
                Voltar à página
              </button>
            )}

            {etapa === "resultado" && (
              <>
                {minhaInscricao?.situacao === "confirmada" && minhaInscricao.pagamento === "informado" && !minhaInscricao.temComprovante && (
                  <button type="button" onClick={abrirComprovanteAgora} className="btn-secundario mt-5 w-full">
                    <ImagePlus size={16} /> Anexar comprovante agora
                  </button>
                )}
                <button type="button" onClick={fechar} className="btn-primario mt-3 w-full">Fechar</button>
              </>
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
      <p className="text-sm text-stone-600">Entre com sua conta ou crie um cadastro rápido para confirmar presença, ver seu histórico e avisar quando fizer a contribuição.</p>
      <BotaoGoogle next={decodeURIComponent(next)} destaque recomendado />
      <div className="flex flex-col gap-2">
        <a href={`/cadastro?next=${next}`} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white shadow-md transition hover:bg-emerald-700 active:scale-[0.98]">
          <CalendarCheck size={18} /> Criar cadastro e confirmar
        </a>
        <a href={`/login?next=${next}`} className="btn-secundario w-full">Já tenho cadastro — Entrar</a>
      </div>
      <a href={linkWhatsApp} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 pt-1 text-center text-xs text-stone-500 hover:text-emerald-700">
        <MessageCircle size={13} className="shrink-0" /> Ficou com alguma dúvida? Entre em contato pelo WhatsApp
      </a>
    </div>
  );
}

function SemInscricao({
  eventoId, podeInscrever, motivoBloqueio, vagasLivres, linkWhatsApp,
}: {
  eventoId: string; podeInscrever: boolean; motivoBloqueio?: string | null; vagasLivres: number; linkWhatsApp: string;
}) {
  const router = useRouter();
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
      <p className="text-sm text-stone-600">
        {vagasLivres > 0
          ? `${vagasLivres} vaga${vagasLivres > 1 ? "s" : ""} disponíve${vagasLivres > 1 ? "is" : "l"}.`
          : "As vagas estão preenchidas: você entrará na lista de espera e será avisado se alguém sair."}
      </p>
      <button
        type="button"
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            const r = await confirmarParticipacaoAction(eventoId, false);
            if (r.erro) setMsg(r);
            // A inscrição atualizada determina se a próxima etapa é a contribuição ou o resultado.
            if (r.ok) router.refresh();
          })
        }
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white shadow-md transition hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-70"
      >
        <CalendarCheck size={18} /> {pendente ? "Confirmando…" : "Confirmar participação"}
      </button>
    </div>
  );
}

// Roseta de 12 pontas suaves (o contorno arredondado vem do stroke com linejoin round)
const ROSETA = Array.from({ length: 24 }, (_, i) => {
  const ang = (i / 24) * Math.PI * 2 - Math.PI / 2;
  const r = i % 2 === 0 ? 40 : 35.5;
  return `${(60 + r * Math.cos(ang)).toFixed(2)},${(60 + r * Math.sin(ang)).toFixed(2)}`;
}).join(" ");

const CORES_FESTA = ["#10b981", "#34d399", "#a3e635", "#f0c25a", "#2dd4bf", "#6ee7b7"];
const PARTICULAS = Array.from({ length: 12 }, (_, i) => ({ a: i * 30 + 15, d: 58 + (i % 3) * 7, r: 3 - (i % 3) * 0.6, cor: CORES_FESTA[i % CORES_FESTA.length] }));
const CONFETES = Array.from({ length: 8 }, (_, i) => ({ a: i * 45, d: 64 + (i % 2) * 8, cor: CORES_FESTA[(i + 2) % CORES_FESTA.length] }));
const FAISCAS = [
  { x: 18, y: 26, s: 1, atraso: 1.5 },
  { x: 102, y: 34, s: 0.75, atraso: 2.1 },
  { x: 98, y: 96, s: 0.9, atraso: 2.7 },
  { x: 22, y: 92, s: 0.6, atraso: 3.2 },
];
const ESTRELA = "M0,-6 C0.8,-1.2 1.2,-0.8 6,0 C1.2,0.8 0.8,1.2 0,6 C-0.8,1.2 -1.2,0.8 -6,0 C-1.2,-0.8 -0.8,-1.2 0,-6Z";

/** Selo animado de inscrição confirmada (roseta verde, check desenhado, explosão de partículas e brilho). */
function SeloConfirmado() {
  return (
    <div className="selo relative h-32 w-32" aria-hidden>
      <svg viewBox="0 0 120 120" className="h-full w-full overflow-visible">
        <defs>
          <radialGradient id="selo-halo-g" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="selo-roseta-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="55%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>
          <linearGradient id="selo-brilho-g" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#fff" stopOpacity="0" />
            <stop offset="50%" stopColor="#fff" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <clipPath id="selo-recorte"><polygon points={ROSETA} /></clipPath>
        </defs>

        <circle className="selo-halo" cx="60" cy="60" r="58" fill="url(#selo-halo-g)" />
        <circle className="selo-onda" cx="60" cy="60" r="44" fill="none" stroke="#34d399" strokeWidth="2" />

        {PARTICULAS.map((p, i) => (
          <circle key={`p${i}`} className="selo-particula" cx="60" cy="60" r={p.r} fill={p.cor} style={{ "--a": `${p.a}deg`, "--d": `${p.d}px` } as React.CSSProperties} />
        ))}
        {CONFETES.map((c, i) => (
          <rect key={`c${i}`} className="selo-confete" x="58.5" y="56" width="3" height="8" rx="1.5" fill={c.cor} style={{ "--a": `${c.a}deg`, "--d": `${c.d}px` } as React.CSSProperties} />
        ))}

        <g className="selo-flutua">
          <g className="selo-roseta">
            <polygon points={ROSETA} fill="url(#selo-roseta-g)" stroke="url(#selo-roseta-g)" strokeWidth="7" strokeLinejoin="round" />
            <g clipPath="url(#selo-recorte)">
              <rect className="selo-brilho" x="44" y="0" width="22" height="120" fill="url(#selo-brilho-g)" />
            </g>
            <circle className="selo-anel-int" cx="60" cy="60" r="29" fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="1.6" transform="rotate(-90)" />
          </g>
          <g className="selo-check-g">
            <path className="selo-check" d="M46 61.5 L55.5 71 L75 50.5" fill="none" stroke="#fff" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </g>

        {FAISCAS.map((f, i) => (
          <g key={`f${i}`} transform={`translate(${f.x} ${f.y}) scale(${f.s})`}>
            <path className="selo-faisca" d={ESTRELA} fill="#f0c25a" style={{ animationDelay: `${f.atraso}s`, transformBox: "fill-box", transformOrigin: "center" }} />
          </g>
        ))}
      </svg>
    </div>
  );
}

/** Selo no topo da janela de quem já está inscrito: selo verde animado (confirmado) ou ampulheta (lista de espera). */
function StatusInscricao({ inscricao }: { inscricao: NonNullable<MinhaInscricao> }) {
  const confirmada = inscricao.situacao === "confirmada";
  return (
    <div className={`mt-5 flex flex-col items-center gap-2 rounded-2xl px-4 pt-4 pb-5 text-center ring-1 ${confirmada ? "bg-gradient-to-b from-emerald-50/80 to-white ring-emerald-100" : "bg-stone-50 ring-stone-200/70"}`}>
      {confirmada ? (
        <SeloConfirmado />
      ) : (
        <span className="my-2 grid h-20 w-20 animate-surgir place-items-center rounded-full bg-amber-500 text-white shadow-lg shadow-amber-500/30">
          <Hourglass size={34} strokeWidth={2.4} />
        </span>
      )}
      {confirmada && <p className="animate-surgir text-lg font-bold text-emerald-800 [animation-delay:0.9s]">Presença confirmada!</p>}
      <p className={`text-sm ${confirmada ? "animate-surgir text-stone-600 [animation-delay:1s]" : "font-semibold text-stone-800"}`}>
        {confirmada
          ? inscricao.pagamento === "informado"
            ? "Sua contribuição foi informada e aguarda a conferência da coordenação."
            : "Você está confirmado(a) neste evento."
          : `Você está na lista de espera${inscricao.posicaoEspera ? ` (posição ${inscricao.posicaoEspera})` : ""}. Entra sozinho(a) se alguém sair.`}
      </p>
    </div>
  );
}

function PagamentoBloco({
  eventoId, inscricaoId, valorContribuicao, pagamentoAtual, temComprovante, bonusAniversario, creditosDisponiveis, chavePix, abrirForm, setAbrirForm, onContribuicaoConcluida,
}: {
  eventoId: string; inscricaoId: string; valorContribuicao: number; pagamentoAtual: SituacaoPagamento;
  temComprovante: boolean;
  bonusAniversario: { disponivel: boolean; mesNome: string | null } | null; creditosDisponiveis: number;
  chavePix?: ChavePix | null; abrirForm: boolean; setAbrirForm: (v: boolean) => void; onContribuicaoConcluida: () => void;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<{ ok?: string; erro?: string }>();
  const [mostrarPix, setMostrarPix] = useState(false);
  const [naHoraSelecionada, setNaHoraSelecionada] = useState(pagamentoAtual === "na_hora");
  const { local, erro: erroFoto, otimizando, escolher } = useImagem("comprovante");
  const podeAnexar = !temComprovante && ["pendente", "informado", "na_hora"].includes(pagamentoAtual);

  const cabecalho = (
    <p className="flex items-center justify-between text-sm font-semibold text-stone-800">
      <span className="flex items-center gap-1.5"><Receipt size={15} className="text-ouro-600" /> Contribuição</span>
      <span className="flex items-baseline gap-1 text-3xl leading-none font-extrabold tracking-tight text-ouro-700 tabular-nums">
        <span className="text-base font-bold">R$</span>
        <span>{Math.round(valorContribuicao).toLocaleString("pt-BR")}</span>
      </span>
    </p>
  );

  // Escolha: contribuir agora (Pix), já fiz a contribuição (anexa o comprovante) ou vou contribuir na hora
  if (!abrirForm) {
    const opcao = "flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60";
    return (
      <div className="publico-pagamento-escolha space-y-3 rounded-2xl bg-gradient-to-br from-ouro-50/60 to-white p-4">
        {cabecalho}
        {mostrarPix ? (
          <div className="space-y-2.5">
            {chavePix ? (
              <CartaoPix chave={chavePix} valor={valorContribuicao} exibirChave={false} onFechar={() => setMostrarPix(false)} />
            ) : (
              <div className="rounded-xl bg-stone-50 px-3.5 py-2.5 text-xs text-stone-600 ring-1 ring-stone-200">
                <div className="mb-2 flex justify-end"><button type="button" onClick={() => setMostrarPix(false)} aria-label="Voltar às opções de contribuição" className="grid h-8 w-8 place-items-center rounded-full text-stone-500 hover:bg-stone-200"><X size={17} /></button></div>
                A chave Pix ainda não foi cadastrada. Fale com a coordenação.
              </div>
            )}
            {chavePix && <>
              <p className="text-center text-xs leading-relaxed text-stone-500">Após o pagamento, anexe o comprovante no botão abaixo</p>
              <button
                type="button"
                disabled={pendente || !podeAnexar}
                onClick={() => { setNaHoraSelecionada(false); setAbrirForm(true); }}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white shadow-md transition hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ImagePlus size={16} /> Anexar comprovante do Pix
              </button>
              <button
                type="button"
                disabled={pendente || pagamentoAtual === "informado" || temComprovante}
                onClick={() => iniciar(async () => {
                  const fd = new FormData();
                  fd.set("valor", String(valorContribuicao));
                  const r = await informarPagamentoAction(eventoId, inscricaoId, fd);
                  setMsg(r);
                  if (r.ok) { onContribuicaoConcluida(); router.refresh(); }
                })}
                className="flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-stone-500 transition hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pendente ? "Enviando…" : <><Check size={15} aria-hidden /> Informar sem comprovante</>}
              </button>
            </>}
          </div>
        ) : (
          <>
        <p className="text-xs text-stone-500">Escolha como deseja registrar a contribuição:</p>

        <div className="space-y-2">
          {pagamentoAtual !== "credito" && creditosDisponiveis > 0 && (
            <button
              type="button"
              disabled={pendente}
              onClick={() => iniciar(async () => {
                const r = await usarCreditoDoParticipanteAction(eventoId, inscricaoId);
                setMsg(r);
                if (r.ok) { onContribuicaoConcluida(); router.refresh(); }
              })}
              className={`${opcao} publico-aviso-credito border-violet-200 bg-violet-50/70 hover:border-violet-300`}
            >
              <span className="publico-aviso-credito-icone-wrap relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-violet-600 text-white"><Ticket size={19} className="publico-aviso-credito-icone" aria-hidden /></span>
              <span className="relative z-10 min-w-0 flex-1 text-left">
                <span className="publico-aviso-credito-titulo block text-sm font-bold text-violet-950">Usar um crédito do seu pacote</span>
                <span className="publico-aviso-credito-detalhe block text-xs text-violet-800/80">Seu saldo atual: {creditosDisponiveis - 1}.</span>
              </span>
            </button>
          )}
          {bonusAniversario?.disponivel && (
            <button
              type="button"
              disabled={pendente}
              onClick={() => iniciar(async () => {
                const r = await usarBonusAniversarioAction(eventoId, inscricaoId);
                setMsg(r);
                if (r.ok) { onContribuicaoConcluida(); router.refresh(); }
              })}
              className={`${opcao} border-violet-300 bg-gradient-to-r from-violet-50 via-fuchsia-50 to-amber-50 text-violet-950 hover:border-violet-400`}
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-violet-600 text-white shadow-sm"><Gift size={18} aria-hidden /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold">Usar bônus de aniversário</span>
                <span className="block text-xs text-violet-800/80">Uma participação especial válida neste mês{bonusAniversario.mesNome ? ` de ${bonusAniversario.mesNome}` : ""}</span>
              </span>
            </button>
          )}
          {pagamentoAtual === "credito" && (
            <button type="button" onClick={onContribuicaoConcluida} className={`${opcao} border-violet-200 bg-violet-50/70`}>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-violet-600 text-white"><Ticket size={18} aria-hidden /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-violet-950">Manter crédito de pacote</span><span className="block text-xs text-violet-800/80">Este ritual já está confirmado com 1 crédito.</span></span>
            </button>
          )}
          <button type="button" onClick={() => { setNaHoraSelecionada(false); setMostrarPix(true); }} className={`${opcao} border-stone-200 bg-white hover:border-stone-300`}>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-100 text-emerald-700"><QrCode size={18} /></span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-stone-900">Contribuir via Pix</span>
                {creditosDisponiveis <= 0 && <span className="publico-opcao-recomendado rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">Recomendado</span>}
              </span>
              <span className="block text-xs text-stone-500">Anexe o comprovante para finalizar.</span>
            </span>
          </button>
          <button
            type="button"
            disabled={pendente}
            onClick={() => { setMostrarPix(false); setNaHoraSelecionada((v) => !v); }}
            aria-pressed={naHoraSelecionada}
            className={`${opcao} ${naHoraSelecionada ? "border-emerald-500 bg-emerald-50/70" : "border-stone-200 bg-white hover:border-stone-300"}`}
          >
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${naHoraSelecionada ? "bg-emerald-600 text-white" : "bg-emerald-100 text-emerald-700"}`}>{naHoraSelecionada ? <Check size={18} strokeWidth={2.6} /> : <Clock3 size={18} />}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-stone-900">Vou pagar em dinheiro</span>
              <span className="block text-xs text-stone-500">Contribuo no dia do ritual</span>
            </span>
          </button>
          <div className="pt-2">
            <button type="button" onClick={() => { setNaHoraSelecionada(false); setAbrirForm(true); }} className="flex min-h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-stone-500 transition hover:bg-stone-100/70 hover:text-stone-700">
              <Check size={14} aria-hidden /> Já fiz a contribuição
            </button>
          </div>
        </div>

        {naHoraSelecionada && (
          <button
            type="button"
            disabled={pendente}
            onClick={() => iniciar(async () => {
                const r = await contribuirNaHoraAction(eventoId, inscricaoId);
                setMsg(r);
                if (r.ok) { onContribuicaoConcluida(); router.refresh(); }
            })}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white shadow-md transition hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-60"
          >
            <Check size={18} /> {pendente ? "Finalizando…" : "Finalizar"}
          </button>
        )}
          </>
        )}

        {msg?.erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-200">{msg.erro}</p>}
      </div>
    );
  }

  // Comprovante enviado junto ao aviso ou anexado depois pela inscrição.
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        fd.set("valor", String(valorContribuicao));
        iniciar(async () => {
          const r = pagamentoAtual === "informado"
            ? await anexarComprovanteAction(eventoId, inscricaoId, fd)
            : await informarPagamentoAction(eventoId, inscricaoId, fd);
          setMsg(r);
          if (r.ok) { onContribuicaoConcluida(); router.refresh(); }
        });
      }}
    >
      <div className="publico-pagamento-escolha space-y-3 rounded-2xl bg-gradient-to-br from-ouro-50/60 to-white p-4">
        {cabecalho}
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
        <button type="submit" disabled={pendente || otimizando || !local} className="btn-primario flex-1">
          {pendente ? <><Upload size={15} className="animate-pulse" /> Enviando…</> : "Confirmar contribuição"}
        </button>
      </div>
    </form>
  );
}
