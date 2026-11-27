"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { Check, GlassWater, Minus, Plus, RotateCw, Trash2 } from "lucide-react";
import { toast } from "@/components/Toaster";
import { Carregando } from "@/components/ui";
import { DOSE_MAX_ML, totalDoses, type Dose } from "@/lib/doses";

type Resultado = { ok?: string; erro?: string };

const ORDINAL: Record<Dose["n"], string> = { 1: "1ª dose", 2: "2ª dose", 3: "3ª dose" };
// Líquido marrom-escuro: mais claro na superfície, quase preto no fundo do copo
const LIQUIDO = "linear-gradient(180deg, #8a4b26 0%, #5a2d13 45%, #2a1308 100%)";
const FUSO = "America/Sao_Paulo";
const hora = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
const limitar = (v: number) => Math.min(DOSE_MAX_ML, Math.max(0, Math.round(Number.isFinite(v) ? v : 0)));

/** 1ª e 2ª dose sempre aparecem; a 3ª só quando existe. */
function completar(doses: Dose[]): Dose[] {
  // Mantém o horário (em) de cada dose: sem ele a dose some do histórico
  const por = new Map(doses.map((d) => [d.n, d]));
  const lista: Dose[] = [por.get(1) ?? { n: 1, ml: 0 }, por.get(2) ?? { n: 2, ml: 0 }];
  if (por.has(3)) lista.push(por.get(3)!);
  return lista.map((d) => ({ ...d }));
}

/**
 * Card "Dosagem" do modal da inscrição: quantos ml o participante tomou em cada dose. Tocar numa
 * dose abre o copo grande, que se enche (slider vertical, arrastar no copo ou −/+). Salvar atualiza a
 * tela na hora e grava em segundo plano, em fila (sem perder a última versão) e com novas tentativas.
 */
export function Dosagem({ salvarDoses, inicial, aoSalvar, aoMudarDoses }: {
  /** Grava a lista (ação da inscrição ou da equipe). */
  salvarDoses: (doses: Dose[]) => Promise<Resultado>;
  inicial: Dose[]; aoSalvar: (r: Resultado) => void;
  /** Doses que a tela mostra (inclusive as ainda gravando), para a linha do tempo do modal. */
  aoMudarDoses?: (doses: Dose[]) => void;
}) {
  const router = useRouter();
  // O que a tela mostra como salvo: muda na hora (otimista); o banco acompanha em segundo plano
  const [salvas, setSalvas] = useState<Dose[]>(() => completar(inicial));
  const [rascunho, setRascunho] = useState<Dose[]>(salvas);
  const [aberta, setAberta] = useState<Dose["n"] | null>(null);
  const [estado, setEstado] = useState<"ocioso" | "salvando" | "salvo" | "erro">("ocioso");
  // Fila de gravação: uma por vez; se mudar de novo durante o envio, só a versão mais nova vai depois
  const fila = useRef<{ emVoo: boolean; proxima: Dose[] | null; falhou: Dose[] | null }>({ emVoo: false, proxima: null, falhou: null });
  const montado = useRef(true);
  useEffect(() => {
    montado.current = true;
    return () => { montado.current = false; if (!fila.current.emVoo) delete document.documentElement.dataset.gravando; };
  }, []);
  const marcar = (e: typeof estado) => {
    // A página do evento não se atualiza sozinha enquanto há gravação pendente ou com falha
    if (e === "salvando" || e === "erro") document.documentElement.dataset.gravando = "1";
    else delete document.documentElement.dataset.gravando;
    if (montado.current) setEstado(e);
  };

  // Dados novos do servidor (router.refresh): só substituem a tela quando não há nada pendente
  const chave = JSON.stringify(inicial);
  useEffect(() => {
    if (fila.current.emVoo || fila.current.falhou) return;
    const lista = completar(JSON.parse(chave));
    setSalvas(lista);
    if (aberta === null) setRascunho(lista);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);

  // Fechar a aba com gravação pendente: o navegador pede confirmação
  useEffect(() => {
    if (estado !== "salvando" && estado !== "erro") return;
    const avisar = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [estado]);

  // Esc fecha a dose aberta antes do modal (captura no window, antes do listener do modal)
  useEffect(() => {
    if (aberta === null) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      cancelar();
    };
    window.addEventListener("keydown", esc, true);
    return () => window.removeEventListener("keydown", esc, true);
  });

  /** Uma gravação com até 3 tentativas (rede instável); erro de regra/permissão não repete. */
  async function gravar(lista: Dose[]): Promise<{ ok: true } | { erro: string }> {
    let ultimo = "Não foi possível salvar a dosagem.";
    for (let i = 0; i < 3; i++) {
      try {
        const r = await salvarDoses(lista);
        if (r.ok) return { ok: true };
        return { erro: r.erro ?? ultimo };
      } catch {
        ultimo = "Sem conexão para salvar a dosagem.";
        await new Promise((ok) => setTimeout(ok, 700 * 2 ** i));
      }
    }
    return { erro: ultimo };
  }

  async function enviar(lista: Dose[]) {
    fila.current.falhou = null;
    if (fila.current.emVoo) { fila.current.proxima = lista; return; }
    fila.current.emVoo = true;
    marcar("salvando");
    let atual: Dose[] | null = lista;
    while (atual) {
      fila.current.proxima = null;
      const r = await gravar(atual);
      if ("erro" in r) {
        // Mantém na tela o que foi digitado e oferece tentar de novo; avisa mesmo com o modal fechado
        fila.current.emVoo = false;
        fila.current.falhou = fila.current.proxima ?? atual;
        marcar("erro");
        aoSalvar({ erro: r.erro });
        toast(`Dosagem não salva: ${r.erro}`);
        return;
      }
      atual = fila.current.proxima;
    }
    fila.current.emVoo = false;
    marcar("salvo");
    router.refresh();
    setTimeout(() => { if (montado.current) setEstado((e) => (e === "salvo" ? "ocioso" : e)); }, 1800);
  }

  function aplicar(nova: Dose[]) {
    const agora = new Date().toISOString();
    const antes = new Map(salvas.map((d) => [d.n, d]));
    const lista = nova.map((d): Dose => {
      if (d.ml <= 0) return { n: d.n, ml: 0 };
      const anterior = antes.get(d.n);
      return { n: d.n, ml: d.ml, em: anterior && anterior.ml === d.ml && anterior.em ? anterior.em : agora };
    });
    setSalvas(lista);
    setRascunho(lista);
    setAberta(null);
    void enviar(lista);
  }
  function cancelar() {
    setRascunho(salvas);
    setAberta(null);
  }
  function mudar(n: Dose["n"], ml: number) {
    setRascunho((lista) => lista.map((d) => (d.n === n ? { ...d, ml: limitar(ml) } : d)));
  }
  /** "+": abre a próxima dose ainda vazia (1ª, depois 2ª); a 3ª só entra com as duas anteriores preenchidas. */
  function abrirProxima() {
    const vazia = salvas.find((d) => d.ml === 0);
    if (vazia) { setRascunho(salvas); setAberta(vazia.n); return; }
    if (salvas.length < 3) {
      setRascunho([...salvas, { n: 3, ml: 0 }]);
      setAberta(3);
    }
  }

  const total = totalDoses(salvas);
  useEffect(() => { aoMudarDoses?.(salvas); }, [salvas, aoMudarDoses]);
  const lista = aberta === null ? salvas : rascunho;
  const temTerceira = lista.some((d) => d.n === 3);
  const proximaRotulo = `Informar a ${(salvas.find((d) => d.ml === 0)?.n ?? 3)}ª dose`;
  const atual = aberta ? rascunho.find((d) => d.n === aberta) : undefined;

  return (
    <section className="overflow-hidden rounded-2xl border border-amber-900/10 bg-gradient-to-b from-amber-50/70 to-white shadow-sm">
      <div className="flex items-center gap-3 px-3.5 py-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white shadow-sm shadow-amber-950/25" style={{ background: LIQUIDO }}>
          <GlassWater size={17} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-stone-900">Dosagem</h4>
          <p className="text-xs text-stone-500">{total ? <><span className="font-semibold text-amber-950 tabular-nums">{total} ml</span> no total</> : "Nenhuma dose registrada"}</p>
        </div>
        {/* Situação da gravação em segundo plano */}
        <span role="status" aria-live="polite" className="shrink-0 text-[11px] font-semibold">
          {estado === "salvando" && <span className="inline-flex items-center gap-1 text-stone-400"><Carregando tamanho={11} /> Salvando</span>}
          {estado === "salvo" && <span className="inline-flex animate-surgir items-center gap-1 text-emerald-600"><Check size={12} aria-hidden /> Salvo</span>}
          {estado === "erro" && fila.current.falhou && (
            <button type="button" onClick={() => fila.current.falhou && void enviar(fila.current.falhou)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-red-700 ring-1 ring-red-200 hover:bg-red-50">
              <RotateCw size={12} aria-hidden /> Tentar de novo
            </button>
          )}
        </span>
        {aberta === null && (salvas.some((d) => d.ml === 0) || salvas.length < 3) && (
          <button
            type="button"
            onClick={abrirProxima}
            title={proximaRotulo}
            aria-label={proximaRotulo}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-amber-900 ring-1 ring-amber-900/20 transition hover:bg-amber-100 active:scale-95"
          >
            <Plus size={16} aria-hidden />
          </button>
        )}
      </div>

      <div className="border-t border-amber-900/10 p-3">
        {atual ? (
          <DoseAberta
            dose={atual}
            salvando={false}
            onMudar={(ml) => mudar(atual.n, ml)}
            onCancelar={cancelar}
            onSalvar={() => aplicar(rascunho)}
            onRemover={atual.n === 3 ? () => aplicar(rascunho.filter((d) => d.n !== 3)) : undefined}
          />
        ) : (
          <div className={`grid gap-2.5 ${temTerceira ? "grid-cols-3" : "grid-cols-2"}`}>
            {lista.map((d) => (
              <button
                key={d.n}
                type="button"
                onClick={() => {
                  // Dose posterior com uma anterior ainda vazia: abre primeiro a anterior
                  const anteriorVazia = salvas.find((x) => x.n < d.n && x.ml === 0);
                  setRascunho(salvas);
                  setAberta(anteriorVazia ? anteriorVazia.n : d.n);
                }}
                className="modal-dose-item group flex items-center gap-3 rounded-xl border border-amber-900/10 bg-white p-2.5 text-left transition hover:border-amber-800/30 hover:shadow-sm active:scale-[0.98]"
                aria-label={`${ORDINAL[d.n]}: ${d.ml} ml. Toque para informar.`}
              >
                <Copo ml={d.ml} pequeno />
                <span className="min-w-0">
                  <span className="block text-[11px] font-semibold tracking-wide text-stone-500 uppercase">{ORDINAL[d.n]}</span>
                  <span className={`block text-lg leading-tight font-bold tabular-nums ${d.ml ? "text-amber-950" : "text-stone-300"}`}>{d.ml ? `${d.ml} ml` : "—"}</span>
                  {d.ml > 0 && d.em && <span className="block text-[11px] text-stone-400 tabular-nums">às {hora(d.em)}</span>}
                </span>
              </button>
            ))}
          </div>
        )}

      </div>
    </section>
  );
}

/** A dose aberta: copo grande com slider vertical, valor e −/+; Cancelar e Salvar. */
function DoseAberta({ dose, salvando, onMudar, onCancelar, onSalvar, onRemover }: {
  dose: Dose; salvando: boolean; onMudar: (ml: number) => void; onCancelar: () => void; onSalvar: () => void; onRemover?: () => void;
}) {
  const copo = useRef<HTMLDivElement>(null);
  const arrastando = useRef(false);
  const repetir = useRef<{ t?: ReturnType<typeof setTimeout>; i?: ReturnType<typeof setInterval> }>({});
  const valor = useRef(dose.ml);
  valor.current = dose.ml;

  // Arrastar no copo: a altura do toque define o nível
  const pelaAltura = (y: number) => {
    const r = copo.current?.getBoundingClientRect();
    if (!r) return;
    onMudar(((r.bottom - y) / r.height) * DOSE_MAX_ML);
  };
  // Segurar − ou + repete o passo
  const parar = () => { clearTimeout(repetir.current.t); clearInterval(repetir.current.i); };
  const passo = (d: number) => {
    onMudar(valor.current + d);
    parar();
    repetir.current.t = setTimeout(() => {
      repetir.current.i = setInterval(() => onMudar((valor.current = limitar(valor.current + d))), 70);
    }, 400);
  };
  useEffect(() => parar, []);

  const botaoPasso = "grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-amber-900/15 bg-white text-amber-950 shadow-sm transition hover:bg-amber-50 active:scale-95 disabled:opacity-40";
  const atalhos = (d: number) => ({
    onPointerDown: () => passo(d), onPointerUp: parar, onPointerLeave: parar, onPointerCancel: parar,
    onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onMudar(valor.current + d); } },
  });

  return (
    <div className="animate-surgir">
      <p className="modal-dose-titulo mb-3 text-center text-sm font-bold tracking-wider text-amber-900/70 uppercase">{ORDINAL[dose.n]}</p>
      <div className="flex items-stretch justify-center gap-3">
        {/* Espaço do mesmo tamanho do slider + botões, para o copo ficar centralizado */}
        <div aria-hidden className="w-20 shrink-0" />
        {/* Copo: tocar/arrastar ajusta o nível; o valor fica dentro dele */}
        <div
          ref={copo}
          role="presentation"
          className="relative cursor-ns-resize touch-none select-none"
          onPointerDown={(e) => { arrastando.current = true; e.currentTarget.setPointerCapture(e.pointerId); pelaAltura(e.clientY); }}
          onPointerMove={(e) => arrastando.current && pelaAltura(e.clientY)}
          onPointerUp={() => { arrastando.current = false; }}
          onPointerCancel={() => { arrastando.current = false; }}
        >
          <Copo ml={dose.ml} />
          {/* Valor sobre o copo: escuro sobre o vidro e invertido (claro) onde o líquido passa por baixo */}
          <span aria-hidden className="pointer-events-none absolute inset-[2px] z-20 overflow-hidden rounded-t-md rounded-b-[26px]">
            <span className="absolute inset-0 flex flex-col items-center justify-center pb-3 text-amber-950">
              <span className="dose-valor-destaque text-6xl leading-none font-bold tracking-tight tabular-nums">{dose.ml}</span>
              <span className="mt-0.5 text-xl leading-none font-bold">ml</span>
            </span>
            <span className="absolute inset-x-0 bottom-0 overflow-hidden" style={{ height: `${Math.min(100, (dose.ml / DOSE_MAX_ML) * 100)}%` }}>
              <span className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-center pb-3 text-white" style={{ height: "calc(13rem - 4px)" }}>
                <span className="dose-valor-destaque text-6xl leading-none font-bold tracking-tight tabular-nums">{dose.ml}</span>
                <span className="mt-0.5 text-xl leading-none font-bold">ml</span>
              </span>
            </span>
          </span>
        </div>

        {/* Slider vertical (teclado e leitor de tela) */}
        <input
          type="range"
          min={0}
          max={DOSE_MAX_ML}
          step={1}
          value={dose.ml}
          onChange={(e) => onMudar(Number(e.target.value))}
          aria-label={`${ORDINAL[dose.n]} em ml`}
          aria-valuetext={`${dose.ml} ml`}
          className="dose-slider h-52 w-6 cursor-pointer accent-amber-900"
          style={{ writingMode: "vertical-lr", direction: "rtl" } as CSSProperties}
        />

        {/* + em cima e − embaixo, ao lado do slider */}
        <div className="flex flex-col justify-between">
          <button type="button" className={botaoPasso} aria-label="Aumentar 1 ml" disabled={dose.ml >= DOSE_MAX_ML} {...atalhos(1)}><Plus size={18} aria-hidden /></button>
          <button type="button" className={botaoPasso} aria-label="Diminuir 1 ml" disabled={dose.ml <= 0} {...atalhos(-1)}><Minus size={18} aria-hidden /></button>
        </div>
      </div>

      {/* Valor digitado, embaixo do copo */}
      <div className="mt-3 flex justify-center">
        <label className="relative block w-32">
          <span className="sr-only">Quantidade em ml</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={DOSE_MAX_ML}
            value={dose.ml}
            onChange={(e) => onMudar(Number(e.target.value))}
            onFocus={(e) => e.currentTarget.select()}
            className="campo h-11 pr-9 text-center text-base font-semibold tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs font-semibold text-stone-400">ml</span>
        </label>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        {onRemover ? (
          <button type="button" disabled={salvando} onClick={onRemover} className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60">
            <Trash2 size={14} aria-hidden /> Remover dose
          </button>
        ) : <span />}
        <div className="flex gap-2">
          <button type="button" disabled={salvando} onClick={onCancelar} className="btn-secundario h-10 min-w-24 justify-center px-4">Cancelar</button>
          <button type="button" disabled={salvando} onClick={onSalvar} className="inline-flex h-10 min-w-28 items-center justify-center gap-1.5 rounded-xl px-5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-60" style={{ background: LIQUIDO }}>
            {salvando ? <><Carregando tamanho={14} /> Salvando…</> : <><Check size={15} aria-hidden /> Salvar</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/** O copo: vidro com marcas a cada 10 ml e o líquido marrom subindo conforme os ml. */
function Copo({ ml, pequeno = false }: { ml: number; pequeno?: boolean }) {
  const pct = (limitar(ml) / DOSE_MAX_ML) * 100;
  return (
    <span
      className={`dose-medidor relative block shrink-0 overflow-hidden border-2 border-stone-300/80 bg-gradient-to-b from-white to-stone-50 ${
        pequeno ? "h-12 w-9 rounded-t-[4px] rounded-b-[10px]" : "h-52 w-32 rounded-t-lg rounded-b-[28px] shadow-inner"
      }`}
      aria-hidden
    >
      {/* Marcas de 10 em 10 ml */}
      {!pequeno && Array.from({ length: DOSE_MAX_ML / 10 - 1 }, (_, i) => (i + 1) * 10).map((m) => (
        <span key={m} className="absolute right-0 z-10 flex items-center gap-1" style={{ bottom: `${(m / DOSE_MAX_ML) * 100}%` }}>
          <span className={`text-[9px] font-semibold tabular-nums transition-colors ${m <= ml ? "text-amber-100/80" : "text-stone-400"}`}>{m}</span>
          <span className={`h-px w-2.5 transition-colors ${m <= ml ? "bg-amber-100/50" : "bg-stone-400/70"}`} />
        </span>
      ))}
      {/* Líquido */}
      <span
        className="absolute inset-x-0 bottom-0 transition-[height] duration-300 ease-out motion-reduce:transition-none"
        style={{ height: `${pct}%`, background: LIQUIDO }}
      >
        {pct > 0 && <span className="absolute inset-x-0 top-0 h-1 bg-amber-600/50" />}
      </span>
      {/* Reflexo do vidro */}
      <span className={`dose-medidor-reflexo absolute top-1.5 bottom-2 left-1.5 rounded-full bg-white/50 ${pequeno ? "w-0.5" : "w-1.5"}`} />
    </span>
  );
}
