"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Maximize2, Minimize2 } from "lucide-react";

const ALTURA_INICIAL = 256;

/** Medidas ficam fora da animação; o gesto altera uma única camada da imagem. */
export function CapaRitual({ src, children }: { src?: string; children: ReactNode }) {
  const capa = useRef<HTMLDivElement>(null);
  const imagem = useRef<HTMLImageElement>(null);
  const gradiente = useRef<HTMLDivElement>(null);
  const alternar = useRef<() => void>(() => {});
  const [expandida, setExpandida] = useState(false);
  const [pronta, setPronta] = useState(false);

  useEffect(() => {
    if (!src) return;
    const el = capa.current!;
    const img = imagem.current!;
    const fundo = gradiente.current!;
    const preferencia = window.matchMedia("(prefers-reduced-motion: reduce)");
    let desmontado = false;
    let decodificada = false;
    let preparada = false;
    let frame = 0;
    let anterior = 0;
    let largura = 0;
    let tela = 0;
    let topo = 0;
    let maximo = 0;
    let alturaInicial = 256;
    let larguraInicial = 0;
    let alturaFinal = 0;
    let larguraFinal = 0;
    let atual = 0;
    let alvo = 0;
    let amortecimento = 65;
    let alturaAplicada = ALTURA_INICIAL;
    let expandidaAplicada = false;
    let scroll = window.scrollY;
    let noTopo = false;
    let toque: { x: number; y: number; capturado: boolean } | null = null;

    const desenhar = (tempo: number) => {
      frame = 0;
      if (!preparada) return;
      const dt = anterior ? Math.min(64, tempo - anterior) : 16;
      anterior = tempo;
      atual = preferencia.matches ? alvo : atual + (alvo - atual) * (1 - Math.exp(-dt / amortecimento));
      if (Math.abs(alvo - atual) < 0.08) atual = alvo;
      const p = maximo ? atual / maximo : 0;
      const altura = ALTURA_INICIAL + atual;
      const distancia = Math.max(0, scroll - topo);
      const avancou = Math.min(1, distancia / (altura * 0.92));
      const visibilidade = 1 - avancou * avancou * (3 - 2 * avancou);
      const deslocamento = preferencia.matches ? 0 : Math.min(distancia * 0.28, 100) * (1 - p);
      const x = (largura - larguraInicial) / 2 * (1 - p) + (largura - larguraFinal) / 2 * p;
      const y = (ALTURA_INICIAL - alturaInicial) / 2 * (1 - p) + deslocamento;
      const escala = 1 + (larguraFinal / larguraInicial - 1) * p;

      // Somente a expansão muda o espaço do cabeçalho. A rolagem comum não provoca layout.
      if (altura !== alturaAplicada) {
        el.style.height = altura + "px";
        fundo.style.transform = `scaleY(${1 + (176 / ALTURA_INICIAL - 1) * p})`;
        alturaAplicada = altura;
      }
      img.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${escala})`;
      img.style.opacity = String((0.8 + 0.2 * p) * visibilidade);
      const completa = alvo > 0 && atual >= maximo * 0.98;
      if (completa !== expandidaAplicada) {
        expandidaAplicada = completa;
        setExpandida(completa);
      }
      if (atual !== alvo) frame = requestAnimationFrame(desenhar);
      else anterior = 0;
    };
    const agendar = () => { if (!frame && preparada) frame = requestAnimationFrame(desenhar); };

    // Leitura de layout somente ao carregar ou mudar a largura/altura da tela.
    const medir = () => {
      if (!decodificada || !img.naturalWidth || !el.clientWidth) return;
      const novaLargura = el.clientWidth;
      const novaTela = window.innerHeight;
      if (preparada && largura === novaLargura && tela === novaTela) return;
      const p = maximo ? atual / maximo : 0;
      const pAlvo = maximo ? alvo / maximo : 0;
      largura = novaLargura;
      tela = novaTela;
      topo = el.getBoundingClientRect().top + window.scrollY;
      const proporcao = img.naturalHeight / img.naturalWidth;
      larguraInicial = Math.max(largura, ALTURA_INICIAL / proporcao);
      alturaInicial = larguraInicial * proporcao;
      alturaFinal = Math.min(largura * proporcao, Math.max(160, tela - 240));
      larguraFinal = alturaFinal / proporcao;
      maximo = Math.max(96, alturaFinal + 112 - ALTURA_INICIAL);
      atual = p * maximo;
      alvo = pAlvo * maximo;
      img.style.width = larguraInicial + "px";
      img.style.height = alturaInicial + "px";
      img.style.maxWidth = "none";
      img.style.transformOrigin = "0 0";
      img.style.willChange = "transform, opacity";
      preparada = true;
      setPronta(true);
      agendar();
    };
    const carregar = async () => {
      try { await img.decode(); } catch { /* O evento load ainda pode entregar uma imagem válida. */ }
      if (!desmontado) {
        decodificada = img.complete && img.naturalWidth > 0;
        medir();
      }
    };
    void carregar();
    img.addEventListener("load", carregar);
    const observer = new ResizeObserver(medir);
    observer.observe(el);
    window.addEventListener("resize", medir);
    preferencia.addEventListener("change", agendar);

    const impedido = (alvoEvento: EventTarget | null) => !!document.querySelector("dialog[open], [role='dialog']") ||
      (alvoEvento instanceof Element && !!alvoEvento.closest("button, a, input, textarea, select, summary"));
    const mudar = (delta: number, resposta: number) => {
      alvo = Math.max(0, Math.min(maximo, alvo + delta));
      amortecimento = resposta;
      agendar();
    };
    const roda = (e: WheelEvent) => {
      // A rolagem rumo ao conteúdo permanece nativa, inclusive com a capa aberta.
      if (!preparada || e.deltaY >= 0 || e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY) || impedido(e.target)) return;
      e.preventDefault();
      const unidade = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? tela : 1;
      mudar(-e.deltaY * unidade, 55);
    };
    const comecar = (e: TouchEvent) => {
      toque = preparada && noTopo && e.touches.length === 1 && !impedido(e.target)
        ? { x: e.touches[0].clientX, y: e.touches[0].clientY, capturado: false } : null;
    };
    const mover = (e: TouchEvent) => {
      if (!toque || e.touches.length !== 1) return;
      const { clientX: x, clientY: y } = e.touches[0];
      const delta = y - toque.y;
      if (!toque.capturado && Math.abs(x - toque.x) > Math.abs(delta)) { toque = null; return; }
      if (noTopo && (delta > 0 || toque.capturado)) {
        if (!e.cancelable) return;
        e.preventDefault();
        toque.capturado = true;
        mudar(delta * 1.4, 22);
      }
      toque.y = y;
    };
    const soltar = () => { toque = null; };
    const escutarNoTopo = () => {
      const agora = scroll <= 1;
      if (agora === noTopo) return;
      noTopo = agora;
      // Fora do topo, nenhum listener bloqueia o processamento nativo da rolagem.
      if (agora) {
        window.addEventListener("wheel", roda, { passive: false });
        window.addEventListener("touchmove", mover, { passive: false });
      } else {
        window.removeEventListener("wheel", roda);
        window.removeEventListener("touchmove", mover);
      }
    };
    const rolar = () => {
      const antes = scroll;
      scroll = window.scrollY;
      escutarNoTopo();
      if (Math.min(antes, scroll) < topo + ALTURA_INICIAL + atual) agendar();
    };
    escutarNoTopo();
    window.addEventListener("scroll", rolar, { passive: true });
    window.addEventListener("touchstart", comecar, { passive: true });
    window.addEventListener("touchend", soltar, { passive: true });
    window.addEventListener("touchcancel", soltar, { passive: true });
    alternar.current = () => {
      alvo = alvo > maximo * 0.5 ? 0 : maximo;
      amortecimento = 85;
      agendar();
    };
    return () => {
      desmontado = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      img.removeEventListener("load", carregar);
      window.removeEventListener("resize", medir);
      preferencia.removeEventListener("change", agendar);
      window.removeEventListener("scroll", rolar);
      window.removeEventListener("wheel", roda);
      window.removeEventListener("touchstart", comecar);
      window.removeEventListener("touchmove", mover);
      window.removeEventListener("touchend", soltar);
      window.removeEventListener("touchcancel", soltar);
      alternar.current = () => {};
    };
  }, [src]);

  return <div ref={capa} data-capa-expansivel={src || undefined} className="relative -mb-px overflow-hidden bg-stone-50" style={{ height: ALTURA_INICIAL, overflowAnchor: "none" }}>
    {src && <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={imagem} src={src} alt="Capa do ritual" fetchPriority="high" decoding="async" draggable={false} className="absolute top-0 left-0 h-full w-full object-cover opacity-80" />
      <button type="button" disabled={!pronta} onClick={() => alternar.current()} aria-expanded={expandida} aria-label={expandida ? "Recolher imagem" : "Ver imagem completa"} title={expandida ? "Recolher imagem" : "Ver imagem completa"} className="absolute top-[calc(0.75rem+env(safe-area-inset-top))] left-16 z-10 grid h-10 w-10 place-items-center rounded-full bg-black/35 text-white ring-1 ring-white/30 backdrop-blur-md active:scale-90 disabled:opacity-50">{expandida ? <Minimize2 size={18} /> : <Maximize2 size={18} />}</button>
    </>}
    <div ref={gradiente} aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 origin-bottom bg-gradient-to-t from-stone-50 from-5% via-stone-50/75 via-25% to-transparent to-85%" style={{ height: ALTURA_INICIAL }} />
    {children}
  </div>;
}
