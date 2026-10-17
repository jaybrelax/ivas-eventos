import { Mars, Venus } from "lucide-react";

export type Genero = "masculino" | "feminino";

export const GENERO_ROTULO: Record<Genero, string> = { masculino: "Masculino", feminino: "Feminino" };

const COR: Record<Genero, string> = { masculino: "text-sky-600", feminino: "text-rose-500" };

/** Símbolo do gênero: ♂ para masculino, ♀ para feminino. */
export function IconeGenero({ genero, size = 14, className = "" }: { genero: Genero; size?: number; className?: string }) {
  const Icone = genero === "masculino" ? Mars : Venus;
  return <Icone size={size} strokeWidth={2.4} className={`shrink-0 ${COR[genero]} ${className}`} aria-hidden />;
}
