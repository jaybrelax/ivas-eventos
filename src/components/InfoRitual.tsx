import { HandCoins, Info } from "lucide-react";
import type { Instituto } from "@/lib/types";

/** Textos fixos das Configurações (Informações) mostrados na página de todo ritual. */
export function InfoRitual({ instituto, compacto = false }: { instituto: Pick<Instituto, "info_rituais" | "info_contribuicao">; compacto?: boolean }) {
  const blocos = [
    { titulo: "Informações", texto: instituto.info_rituais, Icone: Info, cor: "bg-mata-50 text-mata-600" },
    { titulo: "Contribuição", texto: instituto.info_contribuicao, Icone: HandCoins, cor: "bg-ouro-100 text-ouro-700" },
  ].filter((b) => b.texto?.trim());
  if (!blocos.length) return null;
  return (
    <div className={compacto ? "space-y-4" : "grid gap-3"}>
      {blocos.map(({ titulo, texto, Icone, cor }) => (
        <section key={titulo} className={compacto ? "" : "rounded-xl bg-stone-50 p-4 ring-1 ring-stone-100"}>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-stone-900">
            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${cor}`}><Icone size={15} /></span>
            {titulo}
          </h3>
          <p className={`leading-relaxed whitespace-pre-line text-stone-700 ${compacto ? "text-[13px]" : "text-sm"}`}>{texto}</p>
        </section>
      ))}
    </div>
  );
}
