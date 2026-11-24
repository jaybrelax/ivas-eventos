"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Atualiza a tela na hora quando alguém muda a escala: escuta a tabela `sinais` pelo Realtime do Appwrite
 * (WebSocket) e invalida os dados das telas. Ao reconectar, sincroniza possíveis mudanças perdidas.
 */
export function TempoReal({ endpoint, projeto, canal }: { endpoint: string; projeto: string; canal: string }) {
  const router = useRouter();

  useEffect(() => {
    let ws: WebSocket | null = null;
    let vivo = true;
    let tentativa = 0;
    let religar: ReturnType<typeof setTimeout> | undefined;
    let batida: ReturnType<typeof setInterval> | undefined;
    let adiar: ReturnType<typeof setTimeout> | undefined;
    let jaConectou = false;
    let pendente = false;

    // Junta vários avisos seguidos em uma só atualização e só atualiza com a tela visível
    const atualizar = () => {
      if (document.visibilityState !== "visible") {
        pendente = true;
        return;
      }
      clearTimeout(adiar);
      adiar = setTimeout(() => router.refresh(), 250);
    };

    const url = `${endpoint.replace(/^http/, "ws").replace(/\/$/, "")}/realtime?project=${encodeURIComponent(projeto)}&channels[]=${encodeURIComponent(canal)}`;

    const conectar = () => {
      if (!vivo) return;
      try {
        ws = new WebSocket(url);
      } catch {
        return agendar();
      }
      ws.onopen = () => {
        tentativa = 0;
        if (jaConectou) atualizar();
        jaConectou = true;
        batida = setInterval(() => ws?.readyState === WebSocket.OPEN && ws.send('{"type":"ping"}'), 20_000);
      };
      ws.onmessage = (m) => {
        try {
          const msg = JSON.parse(m.data);
          if (msg.type === "event") atualizar();
        } catch {}
      };
      ws.onclose = () => {
        clearInterval(batida);
        agendar();
      };
      ws.onerror = () => ws?.close();
    };

    const agendar = () => {
      if (!vivo) return;
      clearTimeout(religar);
      religar = setTimeout(conectar, Math.min(30_000, 1000 * 2 ** tentativa++));
    };

    const aoVoltar = () => {
      if (document.visibilityState !== "visible") return;
      if (pendente) atualizar();
      pendente = false;
      if (!ws || ws.readyState === WebSocket.CLOSED) {
        tentativa = 0;
        conectar();
      }
    };

    conectar();
    document.addEventListener("visibilitychange", aoVoltar);
    window.addEventListener("online", aoVoltar);

    return () => {
      vivo = false;
      document.removeEventListener("visibilitychange", aoVoltar);
      window.removeEventListener("online", aoVoltar);
      clearInterval(batida);
      clearTimeout(religar);
      clearTimeout(adiar);
      ws?.close();
    };
  }, [endpoint, projeto, canal, router]);

  return null;
}
