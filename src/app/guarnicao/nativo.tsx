"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

/** Vibração curta (Android); no iPhone não faz nada. */
export function vibrar(ms = 15) {
  try {
    (navigator as Navigator & { vibrate?: (p: number) => boolean }).vibrate?.(ms);
  } catch {}
}

const LIMITE = 72;

/** "Puxar para atualizar": no topo da tela, arrastar para baixo recarrega os dados. */
export function PuxarAtualizar({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [puxado, setPuxado] = useState(0);
  const [atualizando, iniciar] = useTransition();
  const inicio = useRef<number | null>(null);
  const valor = useRef(0);

  useEffect(() => {
    const comecar = (e: TouchEvent) => {
      // Só quando a página está no topo e nenhum painel está aberto
      inicio.current = window.scrollY <= 0 && !document.querySelector('[role="dialog"]') ? e.touches[0].clientY : null;
    };
    const mover = (e: TouchEvent) => {
      if (inicio.current === null) return;
      const d = e.touches[0].clientY - inicio.current;
      valor.current = d > 0 ? Math.min(110, d * 0.5) : 0;
      setPuxado(valor.current);
    };
    const soltar = () => {
      if (inicio.current === null) return;
      inicio.current = null;
      if (valor.current >= LIMITE) {
        vibrar(10);
        iniciar(() => router.refresh());
      }
      valor.current = 0;
      setPuxado(0);
    };
    window.addEventListener("touchstart", comecar, { passive: true });
    window.addEventListener("touchmove", mover, { passive: true });
    window.addEventListener("touchend", soltar);
    return () => {
      window.removeEventListener("touchstart", comecar);
      window.removeEventListener("touchmove", mover);
      window.removeEventListener("touchend", soltar);
    };
  }, [router]);

  const visivel = puxado > 8 || atualizando;
  return (
    <>
      <div
        aria-hidden={!visivel}
        className="pointer-events-none fixed inset-x-0 top-[calc(0.5rem+env(safe-area-inset-top))] z-50 flex justify-center transition-opacity"
        style={{ opacity: visivel ? 1 : 0, transform: `translateY(${atualizando ? 40 : puxado * 0.6}px)` }}
      >
        <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-emerald-700 shadow-elevado ring-1 ring-stone-200">
          <RefreshCw size={18} className={atualizando ? "animate-spin" : ""} style={atualizando ? undefined : { transform: `rotate(${puxado * 3}deg)` }} />
        </span>
      </div>
      {children}
    </>
  );
}

/** Tela de abertura do app instalado: o escudo aparece e some suavemente (uma vez por sessão). */
export function Abertura() {
  const [fase, setFase] = useState<"oculta" | "visivel" | "saindo">("oculta");
  useEffect(() => {
    const instalado = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone;
    let ja = false;
    try {
      ja = sessionStorage.getItem("ivas-abertura") === "1";
      sessionStorage.setItem("ivas-abertura", "1");
    } catch {}
    if (!instalado || ja) return;
    setFase("visivel");
    const t1 = setTimeout(() => setFase("saindo"), 900);
    const t2 = setTimeout(() => setFase("oculta"), 1350);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);
  if (fase === "oculta") return null;
  return (
    <div className={`fixed inset-0 z-[60] grid place-items-center bg-[#1c1040] transition-opacity duration-400 ${fase === "saindo" ? "opacity-0" : "opacity-100"}`}>
      <div className="flex flex-col items-center gap-4 text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/guarnicao-512.png" alt="" width={120} height={120} className="h-28 w-28 animate-surgir drop-shadow-[0_10px_30px_rgb(122_82_227/0.6)]" />
        <span className="text-sm font-bold tracking-[0.3em] uppercase">Guarnição</span>
      </div>
    </div>
  );
}

/** Faixa no topo quando o aparelho está sem internet (as telas mostram a última versão guardada). */
export function AvisoOffline() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const atualizar = () => setOffline(!navigator.onLine);
    atualizar();
    window.addEventListener("online", atualizar);
    window.addEventListener("offline", atualizar);
    return () => {
      window.removeEventListener("online", atualizar);
      window.removeEventListener("offline", atualizar);
    };
  }, []);
  if (!offline) return null;
  return (
    <div role="status" className="sticky top-0 z-40 bg-amber-500 px-4 pt-[calc(0.35rem+env(safe-area-inset-top))] pb-1.5 text-center text-xs font-bold text-white">
      Sem internet · mostrando a última versão salva neste aparelho
    </div>
  );
}
