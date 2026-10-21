"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Atualiza a tela na hora quando alguém muda a escala: escuta a tabela `sinais` pelo Realtime do Appwrite
 * (WebSocket) e recarrega os dados da página. Se a conexão cair, reconecta e recarrega ao voltar;
 * enquanto estiver sem conexão, confere de minuto em minuto como reserva.
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
    let conectado = false;
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
        conectado = true;
        batida = setInterval(() => ws?.readyState === WebSocket.OPEN && ws.send('{"type":"ping"}'), 20_000);
      };
      ws.onmessage = (m) => {
        try {
          const msg = JSON.parse(m.data);
          if (msg.type === "event") atualizar();
        } catch {}
      };
      ws.onclose = () => {
        conectado = false;
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
      // Ao voltar para o app: recarrega o que ficou pendente (ou tudo, se a conexão caiu) e religa se preciso
      if (pendente || !conectado) router.refresh();
      pendente = false;
      if (!ws || ws.readyState === WebSocket.CLOSED) {
        tentativa = 0;
        conectar();
      }
    };

    conectar();
    document.addEventListener("visibilitychange", aoVoltar);
    window.addEventListener("online", aoVoltar);
    const reserva = setInterval(() => !conectado && document.visibilityState === "visible" && router.refresh(), 60_000);

    return () => {
      vivo = false;
      document.removeEventListener("visibilitychange", aoVoltar);
      window.removeEventListener("online", aoVoltar);
      clearInterval(reserva);
      clearInterval(batida);
      clearTimeout(religar);
      clearTimeout(adiar);
      ws?.close();
    };
  }, [endpoint, projeto, canal, router]);

  return null;
}
