import { GlassWater } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { DOSE_MAX_ML, totalDoses, type Dose } from "@/lib/doses";

export type ConsumoPessoa = { id: string; nome: string; foto: string | null; doses: Dose[] };

// Tons do marrom: 1ª mais clara, 3ª quase preta (legível sem depender só da cor: cada trecho traz o valor)
const TOM: Record<Dose["n"], { fundo: string; texto: string }> = {
  1: { fundo: "#a0602f", texto: "text-white" },
  2: { fundo: "#6b3416", texto: "text-white" },
  3: { fundo: "#2e170a", texto: "text-white" },
};

/** Card "Consumo da medicina": ml consumidos no evento, total, média e um gráfico de barras empilhadas por pessoa. */
export function ConsumoMedicina({ pessoas }: { pessoas: ConsumoPessoa[] }) {
  const com = pessoas
    .map((p) => ({ ...p, doses: p.doses.filter((d) => d.ml > 0), total: totalDoses(p.doses) }))
    .filter((p) => p.total > 0)
    .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, "pt-BR"));
  const total = com.reduce((s, p) => s + p.total, 0);
  const media = com.length ? Math.round(total / com.length) : 0;
  const maximo = Math.max(DOSE_MAX_ML, ...com.map((p) => p.total));
  const porDose = ([1, 2, 3] as const).map((n) => ({ n, ml: com.reduce((s, p) => s + (p.doses.find((d) => d.n === n)?.ml ?? 0), 0) })).filter((d) => d.ml > 0);

  return (
    <section className="cartao overflow-hidden p-0 sm:p-0" aria-labelledby="consumo-titulo">
      <header className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white shadow-sm shadow-amber-950/25" style={{ background: "linear-gradient(180deg, #8a4b26 0%, #2a1308 100%)" }}>
          <GlassWater size={17} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="consumo-titulo" className="text-sm font-semibold text-stone-900">Consumo da medicina</h2>
          <p className="text-xs text-stone-500">{com.length ? `${com.length} ${com.length === 1 ? "pessoa" : "pessoas"} com dose registrada` : "Nenhuma dose registrada ainda"}</p>
        </div>
      </header>

      {com.length > 0 && (
        <div className="border-t border-amber-900/10 bg-gradient-to-b from-amber-50/60 to-white px-4 py-4 sm:px-5">
          {/* Números */}
          <dl className="grid grid-cols-3 gap-2 text-center">
            {[
              { r: "Total consumido", v: total },
              { r: "Média por pessoa", v: media },
              { r: "Maior consumo", v: com[0].total },
            ].map((x) => (
              <div key={x.r} className="rounded-xl bg-white px-2 py-2.5 ring-1 ring-amber-900/10">
                <dt className="text-[10px] font-semibold tracking-wide text-stone-500 uppercase">{x.r}</dt>
                <dd className="mt-0.5 text-xl leading-none font-bold text-amber-950 tabular-nums">{x.v}<span className="ml-0.5 text-xs font-semibold text-amber-900/60">ml</span></dd>
              </div>
            ))}
          </dl>

          {/* Legenda por dose, com o total de cada uma */}
          <ul className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-stone-600" aria-label="Legenda">
            {porDose.map((d) => (
              <li key={d.n} className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-[4px]" style={{ background: TOM[d.n].fundo }} aria-hidden />
                <span className="font-medium">{d.n}ª dose</span>
                <span className="text-stone-400 tabular-nums">{d.ml} ml</span>
              </li>
            ))}
          </ul>

          {/* Gráfico: uma barra empilhada por pessoa (1ª, 2ª, 3ª), na mesma escala */}
          <ol className="mt-3 space-y-2.5">
            {com.map((p) => (
              <li key={p.id} className="flex items-center gap-2.5">
                <Avatar nome={p.nome} foto={p.foto} tamanho={26} className="ring-0" />
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-baseline justify-between gap-2">
                    <span className="truncate text-xs font-medium text-stone-700">{p.nome}</span>
                    <span className="shrink-0 text-xs font-bold text-amber-950 tabular-nums">{p.total} ml</span>
                  </div>
                  <div
                    className="flex h-5 overflow-hidden rounded-md bg-stone-100"
                    role="img"
                    aria-label={`${p.nome}: ${p.doses.map((d) => `${d.n}ª dose ${d.ml} ml`).join(", ")}. Total ${p.total} ml.`}
                  >
                    {p.doses.map((d) => (
                      <span
                        key={d.n}
                        className={`grid min-w-0 place-items-center text-[10px] font-bold tabular-nums ${TOM[d.n].texto} border-r border-white/30 last:border-r-0`}
                        style={{ width: `${(d.ml / maximo) * 100}%`, background: TOM[d.n].fundo }}
                      >
                        {d.ml >= 12 ? d.ml : ""}
                      </span>
                    ))}
                  </div>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-[11px] text-stone-400">Escala de 0 a {maximo} ml. Mestres, guardiões e participantes.</p>
        </div>
      )}
    </section>
  );
}
