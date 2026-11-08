"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { Check, Minus, Plus, X } from "lucide-react";

/** Diâmetro da área circular visível (px na tela). */
const VISOR = 260;
/** Lado da miniatura gerada: pequena e leve, pensada para avatares. */
const SAIDA = 256;
const QUALIDADE = 0.8;

/**
 * Escolher o trecho da foto antes de enviar: a imagem se arrasta e aproxima dentro de uma máscara circular.
 * `aoConfirmar` recebe a miniatura já recortada (quadrada, WEBP, leve).
 */
export function RecorteFoto({ arquivo, aoCancelar, aoConfirmar }: { arquivo: File; aoCancelar: () => void; aoConfirmar: (recortada: File) => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [gerando, setGerando] = useState(false);
  const arrasto = useRef<{ px: number; py: number; x: number; y: number } | null>(null);

  useEffect(() => {
    const u = URL.createObjectURL(arquivo);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [arquivo]);

  useEffect(() => {
    if (!url) return;
    const i = new Image();
    i.onload = () => setImg(i);
    i.src = url;
  }, [url]);

  // Escala base: a imagem cobre o visor inteiro; o zoom aproxima a partir daí
  const base = img ? VISOR / Math.min(img.naturalWidth, img.naturalHeight) : 1;
  const escala = base * zoom;
  const largura = img ? img.naturalWidth * escala : VISOR;
  const altura = img ? img.naturalHeight * escala : VISOR;

  const limitar = (x: number, y: number) => ({
    x: Math.min(0, Math.max(VISOR - largura, x)),
    y: Math.min(0, Math.max(VISOR - altura, y)),
  });

  // Centro da imagem (em coordenadas da foto original) que fica no meio do visor
  const escalaAnt = useRef(0);
  useEffect(() => {
    if (!img) return;
    if (!escalaAnt.current) {
      // Primeira abertura: a imagem começa centralizada
      setPos(limitar((VISOR - largura) / 2, (VISOR - altura) / 2));
    } else {
      // Zoom: mantém o mesmo ponto da foto no centro do visor
      const cx = (VISOR / 2 - pos.x) / escalaAnt.current;
      const cy = (VISOR / 2 - pos.y) / escalaAnt.current;
      setPos(limitar(VISOR / 2 - cx * escala, VISOR / 2 - cy * escala));
    }
    escalaAnt.current = escala;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escala, img]);

  // Toques ativos na área da foto: um dedo arrasta; dois dedos (pinça) aproximam ou afastam
  const toques = useRef(new Map<number, { x: number; y: number }>());
  const pinca = useRef<{ d: number; z: number } | null>(null);
  const distancia = () => {
    const [a, b] = [...toques.current.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };
  const limitarZoom = (z: number) => Math.min(3, Math.max(1, z));

  const iniciarArrasto = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    toques.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (toques.current.size >= 2) {
      arrasto.current = null;
      pinca.current = { d: distancia(), z: zoom };
    } else {
      arrasto.current = { px: e.clientX, py: e.clientY, x: pos.x, y: pos.y };
    }
  };
  const mover = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!toques.current.has(e.pointerId)) return;
    toques.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const p = pinca.current;
    if (p && toques.current.size >= 2) {
      if (p.d > 0) setZoom(limitarZoom((p.z * distancia()) / p.d));
      return;
    }
    const a = arrasto.current;
    if (!a) return;
    setPos(limitar(a.x + (e.clientX - a.px), a.y + (e.clientY - a.py)));
  };
  const soltar = (e: ReactPointerEvent<HTMLDivElement>) => {
    toques.current.delete(e.pointerId);
    if (toques.current.size < 2) pinca.current = null;
    if (toques.current.size === 1) {
      // Saiu um dos dedos da pinça: o que ficou volta a arrastar a partir daqui
      const [t] = [...toques.current.values()];
      arrasto.current = { px: t.x, py: t.y, x: pos.x, y: pos.y };
    } else if (toques.current.size === 0) {
      arrasto.current = null;
    }
  };

  const confirmar = () => {
    if (!img) return;
    setGerando(true);
    // Trecho da imagem original que aparece dentro do visor circular
    const sx = -pos.x / escala;
    const sy = -pos.y / escala;
    const lado = VISOR / escala;
    const canvas = document.createElement("canvas");
    canvas.width = SAIDA;
    canvas.height = SAIDA;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setGerando(false);
      return;
    }
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, sx, sy, lado, lado, 0, 0, SAIDA, SAIDA);
    const nomeBase = arquivo.name.replace(/\.[^.]+$/, "") || "foto";
    const finalizar = (blob: Blob | null, tipo: string) => {
      if (!blob) {
        setGerando(false);
        return;
      }
      const ext = tipo === "image/webp" ? "webp" : "jpg";
      aoConfirmar(new File([blob], `${nomeBase}.${ext}`, { type: tipo }));
    };
    canvas.toBlob((b) => {
      if (b && b.type === "image/webp") return finalizar(b, "image/webp");
      // Navegador sem WEBP: cai para JPEG
      canvas.toBlob((j) => finalizar(j, "image/jpeg"), "image/jpeg", QUALIDADE);
    }, "image/webp", QUALIDADE);
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex flex-col bg-[#0c0a14] text-white" role="dialog" aria-modal="true" aria-label="Ajustar foto de perfil">
      <div className="flex items-center justify-between px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3">
        <button type="button" onClick={aoCancelar} aria-label="Cancelar" className="grid h-10 w-10 place-items-center rounded-full bg-white/10 active:scale-90">
          <X size={20} />
        </button>
        <p className="text-sm font-semibold">Ajustar foto</p>
        <span className="h-10 w-10" aria-hidden />
      </div>

      <div className="flex flex-1 items-center justify-center px-4">
        <div
          className="relative touch-none select-none"
          style={{ width: VISOR, height: VISOR, cursor: arrasto.current ? "grabbing" : "grab" }}
          onPointerDown={iniciarArrasto}
          onPointerMove={mover}
          onPointerUp={soltar}
          onPointerCancel={soltar}
          onWheel={(e) => setZoom((z) => limitarZoom(z * (e.deltaY < 0 ? 1.08 : 1 / 1.08)))}
        >
          {/* Só o círculo mostra a foto */}
          <div className="absolute inset-0 overflow-hidden rounded-full">
            {url && img && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={url}
                alt=""
                draggable={false}
                className="absolute max-w-none"
                style={{ width: largura, height: altura, left: pos.x, top: pos.y }}
              />
            )}
          </div>
          {/* Máscara: escurece tudo fora do círculo */}
          <div aria-hidden className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-white/80" />
        </div>
      </div>

      <div className="space-y-4 px-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setZoom((z) => Math.max(1, +(z - 0.1).toFixed(2)))} aria-label="Diminuir zoom" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 active:scale-90">
            <Minus size={16} />
          </button>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            aria-label="Zoom"
            className="flex-1 accent-emerald-500"
          />
          <button type="button" onClick={() => setZoom((z) => Math.min(3, +(z + 0.1).toFixed(2)))} aria-label="Aumentar zoom" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 active:scale-90">
            <Plus size={16} />
          </button>
        </div>
        <p className="text-center text-xs text-white/60">Arraste para posicionar e use dois dedos para aproximar. Só a parte do círculo vai ser usada.</p>
        <button
          type="button"
          onClick={confirmar}
          disabled={!img || gerando}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-sm font-bold text-white active:scale-[0.98] disabled:opacity-50"
        >
          <Check size={18} /> {gerando ? "Preparando…" : "Usar esta foto"}
        </button>
      </div>
    </div>,
    document.body,
  );
}
