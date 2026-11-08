import Link from "next/link";
import { Crown, Medal } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { IconeGenero } from "@/components/genero";
import { dataCurta } from "@/lib/format";
import type { LinhaRanking } from "@/lib/guarnicao-estatisticas";

const MESES = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

/** Barras dos 12 meses do ano (mês atual destacado). */
export function GraficoMeses({ porMes, titulo, compacto = false }: { porMes: number[]; titulo: string; compacto?: boolean }) {
  const max = Math.max(1, ...porMes);
  const mesAtual = new Date().getMonth();
  return (
    <section className={`rounded-3xl bg-white shadow-cartao ring-1 ring-stone-200/70 ${compacto ? "p-4" : "p-5"}`}>
      <h2 className="text-sm font-semibold text-stone-900">{titulo}</h2>
      <div className={`flex items-end gap-1.5 ${compacto ? "mt-3 h-28" : "mt-4 h-32"}`}>
        {porMes.map((n, i) => (
          <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            {n > 0 && <span className="text-[10px] font-semibold text-stone-500 tabular-nums">{n}</span>}
            <div
              className={`w-full rounded-t-lg transition-all ${i === mesAtual ? "bg-emerald-600" : n ? "bg-emerald-300" : "bg-stone-100"}`}
              style={{ height: `${Math.max(6, (n / max) * 100)}%` }}
            />
            <span className={`text-[10px] font-semibold ${i === mesAtual ? "text-emerald-700" : "text-stone-400"}`}>{MESES[i]}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Ranking de quem mais serviu, com troca entre "este ano" e "todos". `destacar`: a linha de quem está vendo. */
export function Ranking({ linhas, periodo, destacar, base, linkPerfil }: { linhas: LinhaRanking[]; periodo: "ano" | "total"; destacar?: string; base: string; linkPerfil?: boolean }) {
  const ordenadas = [...linhas].sort((a, b) => b[periodo] - a[periodo] || b.total - a.total || a.nome.localeCompare(b.nome)).filter((l) => l[periodo] > 0);
  const top = ordenadas.slice(0, 10);
  const minhaPos = destacar ? ordenadas.findIndex((l) => l.id === destacar) : -1;
  const eu = minhaPos >= 10 ? ordenadas[minhaPos] : null;

  const linha = (l: LinhaRanking, pos: number) => {
    const conteudo = (
      <>
        <span className="grid w-7 shrink-0 place-items-center">
          {pos === 0 ? <Crown size={18} className="fill-ouro-300 text-ouro-500" /> : pos < 3 ? <Medal size={17} className={pos === 1 ? "text-stone-400" : "text-amber-700"} /> : <span className="text-sm font-bold text-stone-400 tabular-nums">{pos + 1}</span>}
        </span>
        <Avatar nome={l.nome} foto={l.foto} tamanho={36} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1 truncate text-sm font-medium text-stone-800">
            {l.nome} {l.sexo && <IconeGenero genero={l.sexo} size={12} />}
          </span>
          {l.ultimo && <span className="block text-[11px] text-stone-400">último em {dataCurta(l.ultimo)}</span>}
        </span>
        <span className="text-base font-bold text-stone-900 tabular-nums">{l[periodo]}</span>
      </>
    );
    const cls = `flex items-center gap-3 rounded-2xl px-2 py-2 ${l.id === destacar ? "bg-emerald-50 ring-1 ring-emerald-200" : ""}`;
    return linkPerfil ? (
      <Link href={`/guarnicao/guardioes/${l.id}`} className={`${cls} active:bg-stone-50`}>{conteudo}</Link>
    ) : (
      <div className={cls}>{conteudo}</div>
    );
  };

  return (
    <section className="rounded-3xl bg-white p-4 shadow-cartao ring-1 ring-stone-200/70">
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <h2 className="text-sm font-semibold text-stone-900">Ranking da guarnição</h2>
        <div className="flex rounded-full bg-stone-100 p-0.5 text-xs font-semibold">
          <Link href={`${base}?periodo=ano`} className={`rounded-full px-3 py-1 ${periodo === "ano" ? "bg-white text-stone-900 shadow-2xs" : "text-stone-500"}`}>Este ano</Link>
          <Link href={`${base}?periodo=total`} className={`rounded-full px-3 py-1 ${periodo === "total" ? "bg-white text-stone-900 shadow-2xs" : "text-stone-500"}`}>Sempre</Link>
        </div>
      </div>
      {top.length === 0 ? (
        <p className="py-6 text-center text-sm text-stone-500">Ninguém serviu {periodo === "ano" ? "neste ano" : ""} ainda.</p>
      ) : (
        <ol className="space-y-0.5">
          {top.map((l, i) => <li key={l.id}>{linha(l, i)}</li>)}
          {eu && (
            <>
              <li aria-hidden className="py-1 text-center text-stone-300">⋯</li>
              <li>{linha(eu, minhaPos)}</li>
            </>
          )}
        </ol>
      )}
    </section>
  );
}
