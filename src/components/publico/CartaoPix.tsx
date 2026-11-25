"use client";

import { useEffect, useState } from "react";
import { Check, Copy, QrCode } from "lucide-react";
import type { ChavePix } from "@/lib/types";
import { gerarPayloadPix, ROTULO_PIX } from "@/lib/pix";

const formatoReal = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/**
 * Chave Pix com botão de copiar. Com `valor`, o QR Code e o botão usam o mesmo código Pix com valor.
 * Aparece na janela “Participar” e na compra de pacotes.
 */
export function CartaoPix({ chave, valor, descricao, exibirChave = true }: { chave: ChavePix; valor?: number | null; descricao?: string; exibirChave?: boolean }) {
  const [copiado, setCopiado] = useState(false);
  const [qr, setQr] = useState<{ imagem: string; codigo: string } | null>(null);
  const [erroQr, setErroQr] = useState(false);
  const codigoPix = valor && valor > 0
    ? gerarPayloadPix({ tipo: chave.tipo, chave: chave.chave, favorecido: chave.favorecido, cidade: chave.cidade, valor, descricao })
    : null;

  useEffect(() => {
    if (!codigoPix) return;
    let cancelado = false;
    (async () => {
      try {
        const QRCode = (await import("qrcode")).default;
        const imagem = await QRCode.toDataURL(codigoPix, { margin: 1, width: 320, errorCorrectionLevel: "M" });
        if (!cancelado) { setQr({ imagem, codigo: codigoPix }); setErroQr(false); }
      } catch {
        if (!cancelado) setErroQr(true);
      }
    })();
    return () => { cancelado = true; };
  }, [codigoPix]);

  const textoCopiar = codigoPix ?? chave.chave;
  const imagemQr = qr?.codigo === codigoPix ? qr.imagem : null;

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(textoCopiar);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch { /* sem permissão: o texto continua selecionável */ }
  };

  return (
    <div className="rounded-2xl border border-mata-100 bg-gradient-to-br from-mata-50/70 via-white to-ouro-50/60 p-4 text-stone-900 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-white text-mata-700 shadow-sm ring-1 ring-mata-100"><QrCode size={15} aria-hidden /></span>
          <p className="text-sm font-semibold text-stone-900">Pix <span className="font-normal text-stone-500">· {ROTULO_PIX[chave.tipo] || chave.tipo}</span></p>
        </div>
        <p className="min-w-0 truncate text-right text-xs text-stone-500" title={chave.favorecido}>{chave.favorecido}</p>
      </div>

      {exibirChave && (
        <div className="mt-3 rounded-xl bg-white/80 px-3 py-2.5 ring-1 ring-mata-100">
          <p className="text-[11px] font-medium text-stone-500">Chave</p>
          <p className="mt-0.5 font-mono text-sm leading-snug font-semibold break-all text-stone-900 select-all">{chave.chave}</p>
        </div>
      )}

      {codigoPix && valor ? (
        <div className="mt-4 flex flex-col items-center">
          <div className="rounded-xl bg-white p-2.5 shadow-sm ring-1 ring-mata-100">
            {imagemQr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imagemQr} alt={`QR Code Pix de ${formatoReal(valor)}`} className="h-48 w-48 sm:h-52 sm:w-52" />
            ) : (
              <div role="status" className="grid h-48 w-48 place-items-center text-center text-xs text-stone-500 sm:h-52 sm:w-52">
                {erroQr ? "Não foi possível exibir o QR Code. Use o Pix copiar e colar." : "Preparando QR Code…"}
              </div>
            )}
          </div>
          <p className="mt-3 text-[11px] font-medium tracking-wide text-stone-500 uppercase">Valor a pagar</p>
          <p className="text-2xl font-semibold tracking-tight text-stone-900 tabular-nums">{formatoReal(valor)}</p>
        </div>
      ) : null}

      <button
        type="button"
        onClick={copiar}
        className={`mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition active:scale-[0.98] ${
          copiado ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 ring-inset" : "bg-mata-700 text-white shadow-sm hover:bg-mata-800"
        }`}
      >
        {copiado ? <Check size={16} aria-hidden /> : <Copy size={15} aria-hidden />}
        {copiado ? "Copiado" : codigoPix ? "Pix copiar e colar" : "Copiar chave Pix"}
      </button>
      {chave.banco && <p className="mt-3 text-center text-[11px] text-stone-400">{chave.banco}</p>}
    </div>
  );
}
