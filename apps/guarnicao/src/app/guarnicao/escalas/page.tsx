import { urlRitualGuarnicao } from "@/lib/guarnicao-links";
import Link from "next/link";
import { CalendarCheck, ChevronRight, Crown, History, Hourglass, ShieldCheck } from "lucide-react";
import { contextoGuarnicao } from "@/lib/guarnicao-app";
import { candidaturasDosEventos, inicioDe, participacoesDe, temGuarnicao } from "@/lib/guarnicao";
import { listarEventos, listarTipos } from "@/lib/data";
import type { Usuario } from "@/lib/auth";
import { formatarIdRitual, partesData } from "@/lib/format";
import { concordar } from "@/lib/genero";
import { urlImagem } from "@/lib/links";
import type { Evento } from "@/lib/types";
import { CabecalhoApp, Vazio } from "../ui";

export const metadata = { title: "Minhas escalas" };

/** Escalas do guardião e rituais em que o mestre foi designado. */
export default async function EscalasGuarnicao() {
  const { u, visao } = (await contextoGuarnicao("/guarnicao/escalas"))!;
  if (visao === "mestre") return EscalasMestre({ u });
  const minhas = await participacoesDe(u.id);
  const eventos = minhas.length ? await listarEventos({ ids: [...new Set(minhas.map((c) => c.evento_id))] }) : [];
  const porId = new Map(eventos.map((e) => [e.$id, e]));
  const agora = Date.now();

  // Posição na espera: a ordem de chegada entre os do mesmo gênero que estão esperando
  const esperando = minhas.filter((c) => c.situacao === "espera");
  const filas = await candidaturasDosEventos(esperando.map((c) => c.evento_id));
  const posicao = (eventoId: string) => {
    const minha = esperando.find((c) => c.evento_id === eventoId)!;
    return filas.filter((c) => c.evento_id === eventoId && c.situacao === "espera" && c.sexo === minha.sexo).sort((a, b) => a.ordem - b.ordem).findIndex((c) => c.usuario_id === u.id) + 1;
  };

  const itens = minhas
    .map((c) => ({ c, e: porId.get(c.evento_id) }))
    .filter((x): x is { c: (typeof minhas)[number]; e: Evento } => !!x.e);
  const proximas = itens.filter((x) => inicioDe(x.e).getTime() > agora - 6 * 3_600_000).sort((a, b) => (a.e.data + a.e.hora_inicio).localeCompare(b.e.data + b.e.hora_inicio));
  const historico = itens.filter((x) => x.c.situacao === "confirmada" && inicioDe(x.e).getTime() <= agora - 6 * 3_600_000).sort((a, b) => b.e.data.localeCompare(a.e.data));

  return (
    <>
      <CabecalhoApp u={u} titulo="Minhas escalas" />

      {!proximas.length && !historico.length ? (
        <Vazio icone={<CalendarCheck size={26} />} titulo="Nenhuma escala ainda" texto="Quando você se candidatar a um ritual, ele aparece aqui. Veja as vagas na aba Rituais." />
      ) : (
        <div className="space-y-6 px-4">
          {proximas.length > 0 && (
            <section>
              <h2 className="mb-2 px-1 text-xs font-semibold tracking-wider text-stone-500 uppercase">Próximas</h2>
              <ul className="space-y-1.5">
                {proximas.map(({ c, e }) => (
                  <li key={c.$id}>
                    <Item e={e}>
                      {c.situacao === "confirmada" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><ShieldCheck size={13} /> {concordar(c.sexo, "Escalado", "Escalada")}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700"><Hourglass size={13} /> Na espera · {posicao(e.$id)}º da fila</span>
                      )}
                    </Item>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {historico.length > 0 && (
            <section>
              <h2 className="mb-2 flex items-center gap-1.5 px-1 text-xs font-semibold tracking-wider text-stone-500 uppercase"><History size={13} /> Histórico · {historico.length}</h2>
              <ul className="space-y-1.5">
                {historico.map(({ c, e }) => (
                  <li key={c.$id}><Item e={e} passado><span className="text-xs text-stone-500">Serviu neste ritual</span></Item></li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </>
  );
}

async function EscalasMestre({ u }: { u: Usuario }) {
  const [eventos, tipos] = await Promise.all([listarEventos(), listarTipos()]);
  const tiposRitual = new Set(tipos.filter(temGuarnicao).map((t) => t.$id));
  const meus = eventos.filter((e) => tiposRitual.has(e.tipo_id) && (e.mestres ?? []).includes(u.id));
  const corte = Date.now() - 6 * 3_600_000;
  const proximas = meus.filter((e) => inicioDe(e).getTime() > corte).sort((a, b) => inicioDe(a).getTime() - inicioDe(b).getTime());
  const historico = meus.filter((e) => inicioDe(e).getTime() <= corte).sort((a, b) => inicioDe(b).getTime() - inicioDe(a).getTime());

  return (
    <>
      <CabecalhoApp u={u} sobre="Mestre" titulo="Minhas escalas" />
      {!meus.length ? (
        <Vazio icone={<CalendarCheck size={26} />} titulo="Nenhuma escala ainda" texto="Os rituais em que você for escalado como mestre aparecerão aqui." />
      ) : (
        <div className="space-y-6 px-4">
          {proximas.length > 0 && (
            <section>
              <h2 className="mb-2 px-1 text-xs font-semibold tracking-wider text-stone-500 uppercase">Próximas</h2>
              <ul className="space-y-1.5">
                {proximas.map((e) => <li key={e.$id}><Item e={e}><span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><Crown size={13} /> Mestre escalado</span></Item></li>)}
              </ul>
            </section>
          )}
          {historico.length > 0 && (
            <section>
              <h2 className="mb-2 flex items-center gap-1.5 px-1 text-xs font-semibold tracking-wider text-stone-500 uppercase"><History size={13} /> Histórico · {historico.length}</h2>
              <ul className="space-y-1.5">
                {historico.map((e) => <li key={e.$id}><Item e={e} passado><span className="text-xs text-stone-500">Conduziu este ritual</span></Item></li>)}
              </ul>
            </section>
          )}
        </div>
      )}
    </>
  );
}

function Item({ e, passado, children }: { e: Evento; passado?: boolean; children: React.ReactNode }) {
  const d = partesData(e.data);
  const id = formatarIdRitual(e.ritual_numero_geral, null, null);
  return (
    <Link href={urlRitualGuarnicao(e)} className={`flex items-center gap-3 rounded-3xl bg-white p-3 shadow-cartao ring-1 ring-stone-200/70 active:scale-[0.985] ${passado ? "opacity-80" : ""}`}>
      <div className="relative isolate grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[#1c1040] text-white">
        {e.capa_file_id && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={urlImagem(e.capa_file_id, 160)} alt="" loading="lazy" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-80" />
        )}
        <span className="text-center leading-none [text-shadow:0_1px_6px_rgb(0_0_0/0.6)]">
          <span className="block text-xl font-black tabular-nums">{d.dia}</span>
          <span className="block text-[10px] font-bold tracking-wider uppercase">{d.mesCurto}</span>
        </span>
      </div>
      <div className="min-w-0 flex-1">
        {id && <p className="font-mono text-[11px] text-emerald-700">Ritual {id}</p>}
        <p className="truncate text-sm font-semibold text-stone-900">{e.titulo}</p>
        <div className="mt-0.5">{children}</div>
      </div>
      <ChevronRight size={18} className="shrink-0 text-stone-300" />
    </Link>
  );
}
