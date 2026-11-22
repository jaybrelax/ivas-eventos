"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { Download, ExternalLink, Image as ImageIcon, Link2 } from "lucide-react";
import { CopiarLinkPublico } from "../CopiarLinkPublico";

/** Links do evento: endereço público (copiar/abrir), banner e QR code para divulgação. */
export function LinksEvento({ url, caminho, bannerHref, nomeArquivo }: { url: string; caminho: string; bannerHref: string; nomeArquivo: string }) {
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    QRCode.toDataURL(url, { margin: 1, width: 512, errorCorrectionLevel: "M" }).then(setQr).catch(() => setQr(null));
  }, [url]);

  return (
    <section className="cartao">
      <h2 className="cartao-titulo flex items-center gap-2"><Link2 size={17} className="text-mata-600" /> Links do evento</h2>
      <p className="cartao-sub">Para divulgar: página pública, banner e QR code.</p>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-center gap-2 rounded-xl bg-stone-50 px-3 py-2.5 ring-1 ring-stone-200">
            <span className="min-w-0 flex-1 truncate font-mono text-xs text-stone-600" title={url}>{url}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <CopiarLinkPublico url={url} />
            <Link href={caminho} target="_blank" rel="noopener noreferrer" className="btn-secundario"><ExternalLink size={16} /> Abrir página</Link>
            <Link href={bannerHref} className="btn-secundario"><ImageIcon size={16} /> Gerar banner</Link>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3 sm:flex-col">
          <div className="grid h-28 w-28 place-items-center overflow-hidden rounded-xl bg-white p-1.5 ring-1 ring-stone-200">
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="QR code da página pública do evento" className="h-full w-full" />
            ) : (
              <span className="h-full w-full animate-pulse rounded-lg bg-stone-100" />
            )}
          </div>
          {qr && (
            <a href={qr} download={nomeArquivo} className="inline-flex items-center gap-1.5 text-xs font-semibold text-mata-700 hover:underline">
              <Download size={13} /> Baixar QR code
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
