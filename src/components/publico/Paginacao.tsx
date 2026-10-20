import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Números a mostrar: primeira, última e vizinhas da atual, com reticências nos buracos. */
function numeros(atual: number, total: number): (number | "…")[] {
  const alvo = new Set([1, total, atual - 1, atual, atual + 1]);
  const lista = [...alvo].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const saida: (number | "…")[] = [];
  lista.forEach((n, i) => {
    if (i > 0 && n - lista[i - 1] > 1) saida.push("…");
    saida.push(n);
  });
  return saida;
}

/** Paginação por links (funciona sem JavaScript). `href(n)` devolve o endereço da página n. */
export function Paginacao({ atual, total, href }: { atual: number; total: number; href: (pagina: number) => string }) {
  if (total <= 1) return null;
  const base = "grid h-10 min-w-10 place-items-center rounded-xl border px-3 text-sm font-semibold transition";
  const ativo = "border-transparent bg-gradient-to-r from-ouro-400 to-ouro-600 text-mata-950 shadow-md";
  const normal = "border-stone-200 bg-white text-stone-700 hover:border-ouro-300 hover:bg-ouro-50";
  const desligado = "pointer-events-none border-stone-200 bg-stone-50 text-stone-300";

  return (
    <nav aria-label="Paginação dos eventos" className="mt-12 flex flex-wrap items-center justify-center gap-2">
      <Link href={href(atual - 1)} aria-label="Página anterior" aria-disabled={atual <= 1} tabIndex={atual <= 1 ? -1 : undefined} className={`${base} ${atual <= 1 ? desligado : normal}`}>
        <ChevronLeft size={16} />
      </Link>
      {numeros(atual, total).map((n, i) =>
        n === "…" ? (
          <span key={`g${i}`} className="px-1 text-stone-400" aria-hidden>…</span>
        ) : (
          <Link key={n} href={href(n)} aria-label={`Página ${n}`} aria-current={n === atual ? "page" : undefined} className={`${base} ${n === atual ? ativo : normal}`}>
            {n}
          </Link>
        ),
      )}
      <Link href={href(atual + 1)} aria-label="Próxima página" aria-disabled={atual >= total} tabIndex={atual >= total ? -1 : undefined} className={`${base} ${atual >= total ? desligado : normal}`}>
        <ChevronRight size={16} />
      </Link>
    </nav>
  );
}
