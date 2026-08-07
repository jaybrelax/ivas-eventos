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
    const scanner = new Html5Qrcode("qr-reader");

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText) => {
          if (cancelled || handled) return;
          handled = true;
          scanner
            .stop()
            .then(() => scanner.clear())
            .catch(() => {});
          cbRef.current(decodedText);
        },
        () => {}
      )
      .catch((err: any) => {
        if (!cancelled) {
          errRef.current?.(String(err?.message || err || "Não foi possível acessar a câmera"));
        }
      });

    return () => {
      cancelled = true;
      scanner
        .stop()
        .then(() => scanner.clear())
        .catch(() => {});
    };
  }, []);

  return <div id="qr-reader" className="w-full overflow-hidden rounded-xl" />;
}
