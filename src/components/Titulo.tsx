import type { ReactNode } from "react";
import { Star } from "lucide-react";

export function Titulo({
  titulo,
  subtitulo,
  acoes,
  sobre,
}: {
  titulo: string;
  subtitulo?: ReactNode;
  acoes?: ReactNode;
  /** Linha pequena acima do título (ex.: seção ou numeração). */
  sobre?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
      <div className="min-w-0">
        {sobre && <div className="mb-1.5 text-xs font-semibold tracking-[0.14em] text-ouro-600 uppercase">{sobre}</div>}
        <h1 className="text-[26px] leading-tight font-semibold tracking-tight text-stone-900 sm:text-[30px]">{titulo}</h1>
        {subtitulo && <p className="mt-1.5 max-w-2xl text-sm text-stone-500">{subtitulo}</p>}
      </div>
      {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
    </header>
  );
}

export function BadgeTipo({ nome, cor }: { nome: string; cor: string }) {
  return (
    <span className="chip ring-1 ring-inset" style={{ background: `${cor}14`, color: cor, ["--tw-ring-color" as string]: `${cor}33` }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: cor }} />
      {nome}
    </span>
  );
}

export function BadgeDestaque() {
  return (
    <span className="chip bg-ouro-100 text-ouro-700 ring-1 ring-ouro-300/60 ring-inset">
      <Star size={11} className="fill-ouro-500 text-ouro-500" />
      Destaque
    </span>
  );
}

export function BadgeRitual({ id }: { id: string }) {
  return <span className="chip bg-mata-50 font-mono text-[11px] tracking-tight text-mata-700 ring-1 ring-mata-200 ring-inset">{id}</span>;
}

export function Vazio({ icone, titulo, texto, acao }: { icone: ReactNode; titulo: string; texto?: ReactNode; acao?: ReactNode }) {
  return (
    <div className="cartao flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-mata-50 to-ouro-50 text-mata-600 ring-1 ring-stone-200">
        {icone}
      </div>
      <p className="font-semibold text-stone-900">{titulo}</p>
      {texto && <p className="mt-1 max-w-sm text-sm text-stone-500">{texto}</p>}
      {acao && <div className="mt-5">{acao}</div>}
    </div>
  );
}
