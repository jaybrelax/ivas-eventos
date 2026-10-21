import Link from "next/link";
import type { ReactNode } from "react";
import { Avatar } from "@/components/Avatar";
import { UserRound } from "lucide-react";
import type { Usuario } from "@/lib/auth";

/**
 * Cabeçalho grande das telas do app (estilo "large title" do iOS): símbolo do IVAS ao lado do título
 * e, à direita, a saudação (opcional) junto do avatar, que leva ao perfil.
 */
export function CabecalhoApp({ titulo, sobre, u, direita, saudacao }: { titulo: string; sobre?: ReactNode; u: Usuario; direita?: ReactNode; saudacao?: string }) {
  return (
    <header className="sticky top-0 z-30 bg-stone-50/85 px-5 pt-[calc(1rem+env(safe-area-inset-top))] pb-3 backdrop-blur-xl">
      <div className="flex items-end justify-between gap-3">
        <div className="flex min-w-0 items-end gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/simbolo-ivas.webp" alt="IVAS" width={38} height={38} className="mb-0.5 h-[38px] w-[38px] shrink-0 object-contain" />
          <div className="min-w-0">
            {sobre && <p className="text-xs font-semibold tracking-[0.14em] text-emerald-700 uppercase">{sobre}</p>}
            <h1 className="truncate text-[28px] leading-tight font-bold tracking-tight text-stone-900">{titulo}</h1>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {direita}
          {saudacao && <span className="max-w-24 truncate text-right text-sm leading-tight font-semibold text-stone-600">{saudacao}</span>}
          <Link href="/guarnicao/perfil" aria-label="Meu perfil" className="rounded-full transition active:scale-95">
            <Avatar nome={u.nome} foto={u.foto} perfil={u.perfil} tamanho={40} className="ring-white" />
          </Link>
        </div>
      </div>
    </header>
  );
}

/** Estado vazio / em construção, centralizado. */
export function Vazio({ icone, titulo, texto }: { icone: ReactNode; titulo: string; texto: string }) {
  return (
    <div className="mx-5 mt-6 flex flex-col items-center rounded-3xl bg-white px-6 py-12 text-center shadow-cartao ring-1 ring-stone-200/70">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">{icone}</span>
      <p className="mt-4 text-lg font-semibold text-stone-900">{titulo}</p>
      <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-stone-500">{texto}</p>
    </div>
  );
}

/**
 * Círculo de vaga livre. Com `destaque` (vaga que o guardião pode ocupar) ganha ondas que se expandem,
 * um aro tracejado girando e um leve pulsar; sem destaque, é só o círculo discreto com o ícone.
 */
export function VagaLivre({ destaque = false, tamanho = 36, texto }: { destaque?: boolean; tamanho?: number; texto?: string }) {
  const lado = { width: tamanho, height: tamanho };
  const conteudo = texto ? <span className="text-[10px] font-bold">{texto}</span> : <UserRound size={Math.round(tamanho * 0.45)} strokeWidth={2.2} />;
  if (!destaque)
    return (
      <span title="Vaga livre" style={lado} className="grid shrink-0 place-items-center rounded-full border-2 border-dashed border-stone-300 bg-stone-50 text-stone-300">
        {conteudo}
      </span>
    );
  return (
    <span title="Vaga livre para você" style={lado} className="relative grid shrink-0 place-items-center">
      <span aria-hidden className="absolute inset-0 animate-vaga-onda rounded-full border-2 border-emerald-400" />
      <span aria-hidden className="absolute inset-0 animate-vaga-onda rounded-full border-2 border-emerald-400 [animation-delay:1.2s]" />
      <span aria-hidden className="absolute inset-0 animate-vaga-giro rounded-full border-2 border-dashed border-emerald-500" />
      <span className="relative grid animate-vaga-respira place-items-center rounded-full bg-emerald-100 text-emerald-700 shadow-[0_0_14px_-2px_rgb(122_82_227/0.55)]" style={{ width: tamanho - 8, height: tamanho - 8 }}>
        {conteudo}
      </span>
    </span>
  );
}
