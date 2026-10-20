import Link from "next/link";
import { AlertTriangle, CalendarClock, ChevronRight, Flame, Gauge, ShieldCheck, Trophy, UsersRound } from "lucide-react";
import { contextoGuarnicao, rituaisComVagas } from "@/lib/guarnicao-app";
import { MARCOS, diasDesde, historicoDe, rankingGuarnicao, rituaisPassados } from "@/lib/guarnicao-estatisticas";
import { IconeGenero } from "@/components/genero";
import { formatarIdRitual, hoje, nomeMes, partesData } from "@/lib/format";
import { Avatar } from "@/components/Avatar";
import { CabecalhoApp } from "../ui";
import { GraficoMeses, Ranking } from "./blocos";

export const metadata = { title: "Estatísticas" };

export default async function EstatisticasGuarnicao({ searchParams }: PageProps<"/guarnicao/estatisticas">) {
  const { u, visao } = (await contextoGuarnicao("/guarnicao/estatisticas"))!;
  const periodo = (await searchParams).periodo === "total" ? "total" : "ano";
  const ranking = await rankingGuarnicao();

  if (visao === "guardiao") {
    const h = await historicoDe(u.id);
    const proximoMarco = MARCOS.find((m) => m > h.total);
    const anterior = [...MARCOS].reverse().find((m) => m <= h.total) ?? 0;
    const progresso = proximoMarco ? ((h.total - anterior) / (proximoMarco - anterior)) * 100 : 100;
    const posicao = [...ranking].sort((a, b) => b.ano - a.ano || b.total - a.total).findIndex((l) => l.id === u.id) + 1;

    return (
      <>
        <CabecalhoApp u={u} titulo="Estatísticas" />
        <div className="space-y-4 px-4">
          {/* Destaque */}
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1c1040] to-emerald-800 p-5 text-white shadow-elevado">
            <div aria-hidden className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-emerald-400/20 blur-2xl" />
            <p className="relative text-xs font-semibold tracking-[0.14em] text-emerald-200 uppercase">Rituais servidos</p>
            <p className="relative mt-1 text-6xl leading-none font-black tabular-nums">{h.total}</p>
            <div className="relative mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-white/10 p-2.5 ring-1 ring-white/15">
                <p className="text-xl font-bold tabular-nums">{h.ano}</p>
                <p className="text-[11px] text-white/70">neste ano</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-2.5 ring-1 ring-white/15">
                <p className="text-xl font-bold tabular-nums">{posicao > 0 && h.ano > 0 ? `${posicao}º` : "—"}</p>
                <p className="text-[11px] text-white/70">no ranking</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-2.5 ring-1 ring-white/15">
                <p className="text-xl font-bold tabular-nums">{h.ultimo ? diasDesde(h.ultimo) : "—"}</p>
                <p className="text-[11px] text-white/70">dias desde o último</p>
              </div>
            </div>
          </section>

          {/* Próximo marco */}
          <section className="rounded-3xl bg-white p-5 shadow-cartao ring-1 ring-stone-200/70">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-ouro-100 text-ouro-700"><Trophy size={22} /></span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-stone-900">{proximoMarco ? `Próximo marco: ${proximoMarco} rituais` : "Todos os marcos conquistados!"}</p>
                <p className="text-xs text-stone-500">{proximoMarco ? `Faltam ${proximoMarco - h.total}` : "Gratidão pelo seu serviço"}</p>
              </div>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-stone-100">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600" style={{ width: `${progresso}%` }} />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {MARCOS.map((m) => (
                <span key={m} className={`rounded-full px-2.5 py-1 text-[11px] font-bold tabular-nums ${h.total >= m ? "bg-emerald-600 text-white" : "bg-stone-100 text-stone-400"}`}>{m}</span>
              ))}
            </div>
          </section>

          <GraficoMeses porMes={h.porMes} titulo={`Seus rituais em ${new Date().getFullYear()}`} />
          <Ranking linhas={ranking} periodo={periodo} destacar={u.id} base="/guarnicao/estatisticas" linkPerfil />
        </div>
      </>
    );
  }

  // ───────── Coordenação ─────────
  const proximos = await rituaisComVagas(null);
  const faltam = (r: (typeof proximos)[number]) => Math.max(0, r.vagas.masculino - r.confirmados.masculino) + Math.max(0, r.vagas.feminino - r.confirmados.feminino);
  const totalVagas = proximos.reduce((s, r) => s + r.vagas.masculino + r.vagas.feminino, 0);
  const totalConf = proximos.reduce((s, r) => s + r.confirmados.masculino + r.confirmados.feminino, 0);
  const abertas = proximos.reduce((s, r) => s + faltam(r), 0);
  const cobertura = totalVagas ? Math.round((totalConf / totalVagas) * 100) : 0;
  const atencao = proximos.filter((r) => faltam(r) > 0).slice(0, 5);
  // Quem ainda não tem ritual neste mês: não serviu nos que já passaram nem está escalado nos próximos
  const mesAtual = hoje().slice(0, 7);
  const passados = await rituaisPassados();
  const comRitualNoMes = new Set<string>([
    ...passados.filter((e) => e.data.startsWith(mesAtual)).flatMap((e) => e.guardioes ?? []),
    ...proximos.filter((r) => r.evento.data.startsWith(mesAtual)).flatMap((r) => [...r.escalados.masculino, ...r.escalados.feminino].map((p) => p.id)),
  ]);
  const semRitualNoMes = [...ranking].filter((g) => !comRitualNoMes.has(g.id)).sort((a, b) => a.nome.localeCompare(b.nome));
  const semServir = [...ranking].sort((a, b) => (a.ultimo ?? "").localeCompare(b.ultimo ?? "")).slice(0, 5);
  const kpis = [
    { rotulo: "Próximos rituais", valor: proximos.length, Icone: CalendarClock, cor: "bg-sky-50 text-sky-700" },
    { rotulo: "Vagas em aberto", valor: abertas, Icone: AlertTriangle, cor: "bg-amber-50 text-amber-700" },
    { rotulo: "Cobertura das vagas", valor: `${cobertura}%`, Icone: Gauge, cor: "bg-emerald-50 text-emerald-700" },
    { rotulo: "Guardiões ativos", valor: ranking.length, Icone: UsersRound, cor: "bg-mata-50 text-mata-700" },
  ];

  return (
    <>
      <CabecalhoApp u={u} sobre="Coordenação" titulo="Estatísticas" />
      <div className="space-y-4 px-4">
        <div className="grid grid-cols-2 gap-3">
          {kpis.map(({ rotulo, valor, Icone, cor }) => (
            <div key={rotulo} className="rounded-3xl bg-white p-4 shadow-cartao ring-1 ring-stone-200/70">
              <span className={`grid h-10 w-10 place-items-center rounded-2xl ${cor}`}><Icone size={19} /></span>
              <p className="mt-3 text-2xl font-bold text-stone-900 tabular-nums">{valor}</p>
              <p className="text-xs text-stone-500">{rotulo}</p>
            </div>
          ))}
        </div>

        <section className="rounded-3xl bg-white p-4 shadow-cartao ring-1 ring-stone-200/70">
          <h2 className="mb-2 flex items-center gap-1.5 px-1 text-sm font-semibold text-stone-900"><Flame size={16} className="text-amber-600" /> Precisam de guardiões</h2>
          {atencao.length === 0 ? (
            <p className="flex items-center gap-2 px-1 py-3 text-sm text-emerald-700"><ShieldCheck size={16} /> Todas as guarnições estão completas.</p>
          ) : (
            <ul>
              {atencao.map((r) => (
                <li key={r.evento.$id}>
                  <Link href={`/guarnicao/ritual/${r.evento.$id}`} className="flex items-center gap-3 rounded-2xl px-1 py-2.5 active:bg-stone-50">
                    <span className="w-12 shrink-0 text-center">
                      <span className="block text-lg leading-none font-black text-stone-900 tabular-nums">{partesData(r.evento.data).dia}</span>
                      <span className="block text-[10px] font-semibold text-stone-500 uppercase">{partesData(r.evento.data).mesCurto}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-stone-800">{r.evento.titulo}</span>
                      <span className="block text-xs text-stone-400">{formatarIdRitual(r.evento.ritual_numero_geral, null, null)}</span>
                    </span>
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 tabular-nums">faltam {faltam(r)}</span>
                    <ChevronRight size={16} className="text-stone-300" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-3xl bg-white p-4 shadow-cartao ring-1 ring-stone-200/70">
          <div className="mb-2 flex items-center justify-between gap-2 px-1">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-stone-900"><CalendarClock size={16} className="text-sky-700" /> Ainda não serviram em {nomeMes(Number(mesAtual.slice(5)))}</h2>
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-bold text-stone-600 tabular-nums">{semRitualNoMes.length}</span>
          </div>
          <p className="mb-2 px-1 text-xs text-stone-500">Não serviram nem estão escalados em nenhum ritual deste mês.</p>
          {semRitualNoMes.length === 0 ? (
            <p className="flex items-center gap-2 px-1 py-3 text-sm text-emerald-700"><ShieldCheck size={16} /> Toda a guarnição tem ritual neste mês.</p>
          ) : (
            <ul className="grid grid-cols-4 gap-x-2 gap-y-3 pt-1">
              {semRitualNoMes.map((g) => (
                <li key={g.id}>
                  <Link href={`/guarnicao/guardioes/${g.id}`} className="flex flex-col items-center gap-1 text-center active:scale-95">
                    <Avatar nome={g.nome} foto={g.foto} tamanho={48} />
                    <span className="flex w-full items-center justify-center gap-0.5 truncate text-xs font-medium text-stone-700">
                      {g.nome.split(" ")[0]} {g.sexo && <IconeGenero genero={g.sexo} size={11} />}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <Ranking linhas={ranking} periodo={periodo} base="/guarnicao/estatisticas" linkPerfil />

        <section className="rounded-3xl bg-white p-4 shadow-cartao ring-1 ring-stone-200/70">
          <h2 className="mb-2 px-1 text-sm font-semibold text-stone-900">Há mais tempo sem servir</h2>
          <ul>
            {semServir.map((g) => (
              <li key={g.id}>
                <Link href={`/guarnicao/guardioes/${g.id}`} className="flex items-center gap-3 rounded-2xl px-1 py-2 active:bg-stone-50">
                  <Avatar nome={g.nome} foto={g.foto} tamanho={36} />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-stone-800">{g.nome}</span>
                  <span className="text-xs text-stone-500">{g.ultimo ? `há ${diasDesde(g.ultimo)} dias` : "nunca serviu"}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
