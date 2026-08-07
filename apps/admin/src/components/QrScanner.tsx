import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface QrScannerProps {
  onResult: (text: string) => void;
  onError?: (err: string) => void;
}

export function QrScanner({ onResult, onError }: QrScannerProps) {
  const cbRef = useRef(onResult);
  cbRef.current = onResult;

  const errRef = useRef(onError);
  errRef.current = onError;

  useEffect(() => {
    let cancelled = false;
    let handled = false;

    // Garante um container limpo antes de inicializar, removendo qualquer
    // resíduo (ex.: <video>) de uma instância anterior da câmera.
    const el = document.getElementById("qr-reader");
    if (el) el.innerHTML = "";

    const scanner = new Html5Qrcode("qr-reader");

    const dispose = async () => {
      await Promise.race([
        (async () => {
          try {
            await scanner.stop();
          } catch {
            // Não está escaneando ou já foi parado.
          }
        })(),
        new Promise((r) => setTimeout(r, 1500)),
      ]);
      try {
        scanner.clear();
      } catch {
        // Já foi limpo.
      }
    };

    const start = async () => {
      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText) => {
            if (cancelled || handled) return;
            handled = true;
            // Para a câmera e limpa o elemento ANTES de notificar o pai,
            // evitando que o vídeo congele em tela branca após a leitura.
            void dispose().then(() => {
              if (!cancelled) cbRef.current(decodedText);
            });
          },
          () => {}
        );
        if (cancelled) {
          await dispose();
        }
      } catch (err: any) {
        if (!cancelled) {
          errRef.current?.(String(err?.message || err || "Não foi possível acessar a câmera"));
        }
      }
    };

    // Inicia após o layout para garantir que o container tenha dimensão.
    const frame = requestAnimationFrame(() => start());

    return () => {
      cancelled = true;
      void dispose();
      cancelAnimationFrame(frame);
    };
  }, []);

  return <div id="qr-reader" className="w-full overflow-hidden rounded-xl min-h-[280px]" />;
}
