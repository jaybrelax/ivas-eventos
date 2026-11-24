"use client";

import { useEffect, useState } from "react";

type EventoInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

// O navegador só avisa uma vez que o app pode ser instalado; guardamos o aviso para o cartão e o menu usarem juntos.
let evento: EventoInstalar | null = null;
let instalado = false;
const ouvintes = new Set<() => void>();
const avisar = () => ouvintes.forEach((f) => f());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    evento = e as EventoInstalar;
    avisar();
  });
  window.addEventListener("appinstalled", () => {
    evento = null;
    instalado = true;
    avisar();
  });
}

/** Estado da instalação do app (PWA): botão nativo no Android/Chrome, passo a passo no iPhone. */
export function useInstalar() {
  const [, forcar] = useState(0);
  const [pronto, setPronto] = useState(false);
  const [ios, setIos] = useState(false);
  const [emApp, setEmApp] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone;
    setEmApp(!!standalone);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios|edgios/i.test(navigator.userAgent));
    setPronto(true);
    const f = () => forcar((n) => n + 1);
    ouvintes.add(f);
    return () => {
      ouvintes.delete(f);
    };
  }, []);

  const disponivel = pronto && !emApp && !instalado && (!!evento || ios);

  async function instalar() {
    if (!evento) return;
    const e = evento;
    await e.prompt();
    await e.userChoice.catch(() => null);
    evento = null;
    avisar();
  }

  return { disponivel, nativo: !!evento, ios, instalar };
}
