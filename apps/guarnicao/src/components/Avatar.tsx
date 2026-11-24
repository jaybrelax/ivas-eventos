import { urlImagem } from "@/lib/links";
import type { Perfil } from "@/lib/config";

const COR_PERFIL: Record<Perfil, string> = {
  admin: "from-ouro-300 to-ouro-600 text-mata-950",
  coordenador: "from-mata-400 to-mata-700 text-white",
  normal: "from-stone-300 to-stone-500 text-white",
};

export function iniciais(nome: string) {
  const p = nome.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p.at(-1)![0] : "")).toUpperCase();
}

/** Foto de perfil redonda; sem foto, as iniciais na cor do perfil. */
export function Avatar({ nome, foto, perfil, tamanho = 40, className = "", leve = false }: { nome: string; foto?: string | null; perfil?: Perfil | null; tamanho?: number; className?: string; /** Miniatura em baixa qualidade (imagem de 2× o tamanho, bem comprimida), para listas com muitos avatares. */ leve?: boolean }) {
  const estilo = { width: tamanho, height: tamanho, fontSize: Math.max(10, tamanho * 0.34) };
  if (foto)
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={urlImagem(foto, leve ? (tamanho <= 32 ? 64 : 128) : tamanho > 80 ? 320 : 160)} alt={nome} style={estilo} decoding="async" loading={leve ? "lazy" : undefined} className={`shrink-0 rounded-full object-cover ring-2 ring-white/70 ${className}`} />
    );
  return (
    <span style={estilo} className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br font-bold ${perfil ? COR_PERFIL[perfil] : "from-stone-200 to-stone-300 text-stone-600"} ${className}`}>
      {iniciais(nome)}
    </span>
  );
}
