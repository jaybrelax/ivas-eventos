import Link from "next/link";
import { ChevronRight, Clock, Hourglass, Shield, Users } from "lucide-react";
import { exigir } from "@/lib/auth";
import { PODE } from "@/lib/config";
import { getDadosInstituto, listarEventos } from "@/lib/data";
import { candidaturasDosEventos, vagasDe } from "@/lib/guarnicao";
import { hoje, partesData } from "@/lib/format";
import { Titulo, Vazio, BadgeTipo } from "@/components/Titulo";
import { IconeGenero } from "@/components/genero";

/** Gestão da guarnição (coordenação e admin): vagas e candidatos dos próximos rituais. */
export default async function GuarnicaoPage() {
  await exigir(PODE.editarEventos);
  const hj = hoje();
  const ate = new Date(Date.parse(`${hj}T12:00:00Z`) + 90 * 86_400_000).toISOString().slice(0, 10);
  const [{ tipos }, eventos] = await Promise.all([getDadosInstituto(), listarEventos({ inicio: hj, fim: ate })]);
  const tipoPorId = new Map(tipos.map((t) => [t.$id, t]));
  const rituais = eventos.filter((e) => tipoPorId.get(e.tipo_id)?.conta_como_ritual);
  const candidaturas = await candidaturasDosEventos(rituais.map((e) => e.$id));

  const linhas = rituais.map((e) => {
    const vagas = vagasDe(e);
    const doEvento = candidaturas.filter((c) => c.evento_id === e.$id);
    const conta = (sexo: "masculino" | "feminino", situacao: "confirmada" | "espera") =>
      doEvento.filter((c) => c.sexo === sexo && c.situacao === situacao).length;
    const m = conta("masculino", "confirmada");
    const f = conta("feminino", "confirmada");
    const espera = conta("masculino", "espera") + conta("feminino", "espera");
    const livres = Math.max(0, vagas.masculino - m) + Math.max(0, vagas.feminino - f);
    return { e, vagas, m, f, espera, livres };
  });
  const totalLivres = linhas.reduce((s, l) => s + l.livres, 0);
  const totalEspera = linhas.reduce((s, l) => s + l.espera, 0);
  const completos = linhas.filter((l) => !l.livres).length;

  const kpis = [
    { rotulo: "Rituais nos próximos 90 dias", valor: linhas.length, Icone: Shield, cor: "bg-mata-50 text-mata-600" },
    { rotulo: "Vagas em aberto", valor: totalLivres, Icone: Users, cor: "bg-sky-50 text-sky-600" },
    { rotulo: "Na lista de espera", valor: totalEspera, Icone: Hourglass, cor: "bg-amber-50 text-amber-600" },
    { rotulo: "Guarnições completas", valor: completos, Icone: Clock, cor: "bg-emerald-50 text-emerald-600" },
  ];

  return (
    <>
      <Titulo
        sobre="Agenda"
        titulo="Guarnição"
        subtitulo="Vagas de guardiões e guardiãs dos próximos rituais. Abra um evento para incluir, retirar ou ver a lista de espera."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {kpis.map(({ rotulo, valor, Icone, cor }) => (
          <div key={rotulo} className="cartao flex flex-col items-start gap-2.5 p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${cor}`}><Icone size={18} /></span>
            <div className="min-w-0">
              <p className="text-xs leading-tight text-stone-500 sm:text-[13px]">{rotulo}</p>
              <p className="text-2xl font-semibold tracking-tight text-stone-900 tabular-nums">{valor}</p>
            </div>
          </div>
        ))}
      </div>

      {linhas.length ? (
        <div className="grid gap-3">
          {linhas.map(({ e, vagas, m, f, espera, livres }) => {
            const t = tipoPorId.get(e.tipo_id);
            const d = partesData(e.data);
            const cor = t?.cor ?? "#57534e";
            return (
              <Link
                key={e.$id}
                href={`/eventos/${e.$id}#guarnicao`}
                className="group flex items-center gap-4 rounded-2xl border border-stone-200/80 bg-white p-3 shadow-cartao transition hover:-translate-y-px hover:border-stone-300 hover:shadow-elevado sm:p-4"
              >
                <div className="flex w-16 shrink-0 flex-col items-center justify-center rounded-xl py-2 text-center" style={{ background: `${cor}12`, color: cor }}>
                  <span className="text-[11px] font-semibold tracking-wider uppercase">{d.mesCurto}</span>
                  <span className="text-2xl leading-none font-bold tabular-nums">{d.dia}</span>
                  <span className="mt-0.5 text-[10px] font-medium capitalize opacity-80">{d.diaSemana.slice(0, 3)}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-semibold text-stone-900 group-hover:text-mata-700">{e.titulo}</h3>
                    {t && <BadgeTipo nome={t.nome} cor={t.cor} />}
                    {e.candidaturas_abertas === false && <span className="chip bg-stone-100 text-stone-500">Candidaturas fechadas</span>}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-stone-600 tabular-nums">
                    <span className="inline-flex items-center gap-1.5"><Clock size={14} />{e.hora_inicio}</span>
                    <Vagas sexo="masculino" n={m} total={vagas.masculino} />
                    <Vagas sexo="feminino" n={f} total={vagas.feminino} />
                    {espera > 0 && <span className="inline-flex items-center gap-1.5 text-amber-700"><Hourglass size={14} />{espera} na espera</span>}
                  </div>
                </div>
                <span className={`chip shrink-0 ${livres ? "bg-sky-50 text-sky-700" : "bg-emerald-50 text-emerald-700"}`}>
                  {livres ? `${livres} vaga${livres > 1 ? "s" : ""}` : "Completa"}
                </span>
                <ChevronRight size={18} className="hidden shrink-0 text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-stone-500 sm:block" />
              </Link>
            );
          })}
        </div>
      ) : (
        <Vazio icone={<Shield size={26} />} titulo="Nenhum ritual nos próximos 90 dias" texto="Quando houver rituais agendados, as vagas da guarnição aparecem aqui." />
      )}
    </>
  );
}

function Vagas({ sexo, n, total }: { sexo: "masculino" | "feminino"; n: number; total: number }) {
  return (
    <span className="inline-flex items-center gap-1.5" title={sexo === "masculino" ? "Guardiões confirmados / vagas" : "Guardiãs confirmadas / vagas"}>
      <IconeGenero genero={sexo} size={14} />
      <span className={n >= total ? "font-semibold text-emerald-700" : ""}>{n}/{total}</span>
    </span>
  );
}
