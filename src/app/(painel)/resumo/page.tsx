import Link from "next/link";
import { CalendarRange, ChevronLeft, ChevronRight, Flame, Hash, Star } from "lucide-react";
import { exigir } from "@/lib/auth";
import { listarEventos, listarTipos } from "@/lib/data";
import { hoje, nomeMes } from "@/lib/format";
import { Titulo } from "@/components/Titulo";

const MESES_CURTOS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default async function Resumo({ searchParams }: PageProps<"/resumo">) {
  await exigir();
  const sp = await searchParams;
  const hj = hoje();
  const anoAtual = Number(hj.slice(0, 4));
  const ano = Number(sp.ano) || anoAtual;
  const [tipos, eventos] = await Promise.all([listarTipos(), listarEventos({ inicio: `${ano}-01-01`, fim: `${ano}-12-31` })]);

  const conta = (mes: number | null, tipoId: string | null) =>
    eventos.filter((e) => (mes === null || Number(e.data.slice(5, 7)) === mes) && (tipoId === null || e.tipo_id === tipoId)).length;
  const rituais = eventos.filter((e) => e.ritual_numero_geral);
  const nums = rituais.map((e) => e.ritual_numero_geral!).sort((a, b) => a - b);
  const porMes = Array.from({ length: 12 }, (_, i) => conta(i + 1, null));
  const maximo = Math.max(1, ...porMes);
  const mesAtual = ano === anoAtual ? Number(hj.slice(5, 7)) : null;
  // Linhas de grade "redondas" para a escala
  const passo = maximo <= 4 ? 1 : maximo <= 10 ? 2 : Math.ceil(maximo / 5);
  const topo = Math.ceil(maximo / passo) * passo;
  const grade = Array.from({ length: topo / passo + 1 }, (_, i) => i * passo);

  const kpis = [
    { rotulo: "Rituais no ano", valor: rituais.length, Icone: Flame, cor: "bg-violet-50 text-violet-600" },
    { rotulo: "Faixa de numeração", valor: nums.length ? `${nums[0]}–${nums.at(-1)}` : "—", Icone: Hash, cor: "bg-mata-50 text-mata-600" },
    { rotulo: "Eventos (todos os tipos)", valor: eventos.length, Icone: CalendarRange, cor: "bg-sky-50 text-sky-600" },
    { rotulo: "Em destaque", valor: eventos.filter((e) => e.destaque).length, Icone: Star, cor: "bg-ouro-50 text-ouro-600" },
  ];

  return (
    <>
      <Titulo
        sobre="Relatório"
        titulo={`Resumo de ${ano}`}
        subtitulo="Quantos eventos e rituais aconteceram em cada mês, por tipo."
        acoes={
          <div className="flex items-center gap-1 rounded-xl border border-stone-200 bg-white p-1 shadow-sm">
            <Link href={`/resumo?ano=${ano - 1}`} className="btn-fantasma h-8 px-2.5" aria-label={`Ano ${ano - 1}`}><ChevronLeft size={16} />{ano - 1}</Link>
            <span className="px-2 text-sm font-semibold tabular-nums">{ano}</span>
            {ano < anoAtual + 1 ? (
              <Link href={`/resumo?ano=${ano + 1}`} className="btn-fantasma h-8 px-2.5" aria-label={`Ano ${ano + 1}`}>{ano + 1}<ChevronRight size={16} /></Link>
            ) : <span className="w-16" />}
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {kpis.map(({ rotulo, valor, Icone, cor }) => (
          <div key={rotulo} className="cartao flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${cor}`}><Icone size={20} /></span>
            <div className="min-w-0">
              <p className="truncate text-[13px] text-stone-500">{rotulo}</p>
              <p className="text-2xl font-semibold tracking-tight text-stone-900 tabular-nums">{valor}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Gráfico: eventos por mês (uma série, uma cor) */}
      <section className="cartao mb-6">
        <div className="mb-6">
          <h2 className="cartao-titulo">Eventos por mês</h2>
          <p className="cartao-sub">Passe o mouse em uma barra para ver os tipos.</p>
        </div>
        <div className="relative h-56 pl-7">
          {grade.map((v) => (
            <div key={v} className="absolute right-0 left-7 flex items-center" style={{ bottom: `${(v / topo) * 100}%` }}>
              <span className="absolute -left-7 w-5 -translate-y-px text-right text-[11px] text-stone-400 tabular-nums">{v}</span>
              <div className={`h-px w-full ${v === 0 ? "bg-stone-300" : "bg-stone-100"}`} />
            </div>
          ))}
          <div className="relative grid h-full grid-cols-12 items-end gap-1 sm:gap-2">
            {porMes.map((n, i) => {
              const mes = i + 1;
              const tiposNoMes = tipos.map((t) => ({ t, n: conta(mes, t.$id) })).filter((x) => x.n > 0);
              return (
                <div key={mes} className="group relative flex h-full items-end justify-center" tabIndex={0} aria-label={`${nomeMes(mes)}: ${n} evento(s)`}>
                  {/* área de hover maior que a barra */}
                  <div className="absolute inset-0 rounded-lg transition group-hover:bg-stone-100/70 group-focus:bg-stone-100/70" />
                  <div
                    className={`relative w-full max-w-9 rounded-t-[4px] transition-[height,filter] duration-500 group-hover:brightness-110 ${mes === mesAtual ? "bg-ouro-500" : "bg-mata-600"}`}
                    style={{ height: `${(n / topo) * 100}%`, minHeight: n ? 3 : 0 }}
                  />
                  {n > 0 && (
                    <span className={`pointer-events-none absolute z-10 w-max rounded-xl bg-stone-900 px-3 py-2 text-xs text-white opacity-0 shadow-elevado transition group-hover:opacity-100 group-focus:opacity-100 ${i >= 9 ? "right-0" : i <= 1 ? "left-0" : ""}`} style={{ bottom: `calc(${(n / topo) * 100}% + 8px)` }}>
                      <span className="block font-semibold capitalize">{nomeMes(mes)} · {n}</span>
                      {tiposNoMes.map(({ t, n: q }) => (
                        <span key={t.$id} className="mt-1 flex items-center gap-1.5 text-stone-300">
                          <span className="h-2 w-2 rounded-full" style={{ background: t.cor }} />{t.nome}<span className="ml-auto pl-3 text-white tabular-nums">{q}</span>
                        </span>
                      ))}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-2 grid grid-cols-12 gap-1 pl-7 text-center text-[11px] text-stone-500 sm:gap-2">
          {MESES_CURTOS.map((m, i) => <span key={m} className={i + 1 === mesAtual ? "font-semibold text-ouro-700" : ""}>{m}</span>)}
        </div>
      </section>

      <section className="cartao overflow-hidden p-0 sm:p-0">
        <div className="border-b border-stone-100 px-5 py-4 sm:px-6">
          <h2 className="cartao-titulo">Detalhe por tipo</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50/80 text-left text-xs text-stone-500">
              <tr>
                <th className="px-5 py-3 font-medium sm:px-6">Mês</th>
                {tipos.map((t) => (
                  <th key={t.$id} className="px-3 py-3 text-right font-medium whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: t.cor }} />{t.nome}</span>
                  </th>
                ))}
                <th className="px-5 py-3 text-right font-medium sm:px-6">Total</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <tr key={m} className={`border-t border-stone-100 transition hover:bg-stone-50/70 ${m === mesAtual ? "bg-ouro-50/50" : ""}`}>
                  <td className="px-5 py-2.5 font-medium text-stone-700 capitalize sm:px-6">{nomeMes(m)}</td>
                  {tipos.map((t) => <td key={t.$id} className="px-3 py-2.5 text-right tabular-nums">{conta(m, t.$id) || <span className="text-stone-300">–</span>}</td>)}
                  <td className="px-5 py-2.5 text-right font-semibold tabular-nums sm:px-6">{conta(m, null) || <span className="font-normal text-stone-300">–</span>}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-stone-200 bg-stone-50 font-semibold">
                <td className="px-5 py-3 sm:px-6">Total</td>
                {tipos.map((t) => <td key={t.$id} className="px-3 py-3 text-right tabular-nums">{conta(null, t.$id)}</td>)}
                <td className="px-5 py-3 text-right tabular-nums sm:px-6">{eventos.length}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
