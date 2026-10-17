import Link from "next/link";
import { CalendarDays, CalendarRange, ChevronLeft, ChevronRight, Clock, Flame, List, MapPin, Plus, Shield, Sparkles, Star, Users } from "lucide-react";
import { exigir, pode } from "@/lib/auth";
import { PODE } from "@/lib/config";
import { getDadosInstituto, listarEventos } from "@/lib/data";
import { listarEquipe } from "@/lib/usuarios";
import { candidaturasDosEventos, vagasDe } from "@/lib/guarnicao";
import { IconeGenero } from "@/components/genero";
import { formatarIdRitual, hoje, limitesMes, nomeMes, partesData, somarMes } from "@/lib/format";
import { BadgeDestaque, BadgeRitual, BadgeTipo, Titulo, Vazio } from "@/components/Titulo";
import { Aviso } from "@/components/ui";
import type { Endereco, Evento, Pessoa, TipoEvento } from "@/lib/types";
import { Filtros } from "./Filtros";

const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function diasAte(de: string, ate: string) {
  return Math.round((Date.parse(`${ate}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / 86_400_000);
}

export default async function Agenda({ searchParams }: PageProps<"/eventos">) {
  const u = await exigir();
  const sp = await searchParams;
  const hj = hoje();
  const mes = /^\d{4}-\d{2}$/.test(um(sp.mes) ?? "") ? um(sp.mes)! : hj.slice(0, 7);
  const vista = um(sp.vista) === "calendario" ? "calendario" : "lista";
  const tipo = um(sp.tipo) || "";
  const destaque = um(sp.destaque) === "1";
  const { inicio, fim } = limitesMes(mes);
  const ano = Number(mes.slice(0, 4));

  const [{ tipos, enderecos }, equipe, eventos, doAno, futuros] = await Promise.all([
    getDadosInstituto(),
    listarEquipe(),
    listarEventos({ inicio, fim, tipos: tipo ? [tipo] : undefined, apenasDestaque: destaque }),
    listarEventos({ inicio: `${ano}-01-01`, fim: `${ano}-12-31` }),
    listarEventos({ inicio: hj }),
  ]);
  const tipoPorId = new Map(tipos.map((t) => [t.$id, t]));
  const endPorId = new Map(enderecos.map((e) => [e.$id, e]));
  const pessoaPorId = new Map(equipe.map((p) => [p.$id, p]));
  // Guarnição: guardiões confirmados por gênero em cada ritual do mês
  const rituaisDoMes = eventos.filter((e) => tipoPorId.get(e.tipo_id)?.conta_como_ritual);
  const candidaturas = await candidaturasDosEventos(rituaisDoMes.map((e) => e.$id));
  const guarnicaoPorId = new Map(
    rituaisDoMes.map((e) => {
      const conf = candidaturas.filter((c) => c.evento_id === e.$id && c.situacao === "confirmada");
      const v = vagasDe(e);
      return [e.$id, { m: conf.filter((c) => c.sexo === "masculino").length, f: conf.filter((c) => c.sexo === "feminino").length, vm: v.masculino, vf: v.feminino }];
    }),
  );
  const rituaisAno = doAno.filter((e) => e.ritual_numero_geral).length;
  const doMes = doAno.filter((e) => e.data.startsWith(mes));
  const proximo = futuros[0];
  const podeEditar = pode(u, PODE.editarEventos);

  const link = (extra: Record<string, string>) => {
    const p = new URLSearchParams({ mes, vista, ...(tipo && { tipo }), ...(destaque && { destaque: "1" }), ...extra });
    return `/eventos?${p}`;
  };
  const p = partesData(`${mes}-01`);
  const proximos = eventos.filter((e) => e.data >= hj);
  // Já aconteceram: do mais recente para o mais antigo (a lista vem em ordem crescente).
  const passados = eventos.filter((e) => e.data < hj).reverse();

  const kpis = [
    { rotulo: `Eventos em ${p.mesNome}`, valor: doMes.length, Icone: CalendarRange, cor: "text-mata-600 bg-mata-50" },
    { rotulo: `Rituais em ${ano}`, valor: rituaisAno, Icone: Flame, cor: "text-orange-600 bg-orange-50" },
    { rotulo: "Destaques no mês", valor: doMes.filter((e) => e.destaque).length, Icone: Star, cor: "text-ouro-600 bg-ouro-50" },
  ];

  return (
    <>
      <Titulo
        sobre="Agenda"
        titulo="Eventos e rituais"
        subtitulo="Acompanhe o mês, filtre por tipo e abra um evento para editar."
        acoes={podeEditar && <Link href="/eventos/novo" className="btn-primario"><Plus size={17} /> Novo evento</Link>}
      />

      {um(sp.ok) === "salvo" && <div className="mb-5"><Aviso tipo="ok">Evento salvo com sucesso.</Aviso></div>}
      {um(sp.ok) === "excluido" && <div className="mb-5"><Aviso tipo="ok">Evento excluído.</Aviso></div>}
      {um(sp.erro) === "sem-permissao" && <div className="mb-5"><Aviso tipo="info">Seu perfil não tem acesso a essa página.</Aviso></div>}

      {/* Indicadores */}
      <div className="mb-6 grid grid-cols-3 gap-2.5 sm:gap-3 xl:grid-cols-4">
        {kpis.map(({ rotulo, valor, Icone, cor }) => (
          <div key={rotulo} className="cartao flex flex-col items-start gap-2.5 p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl sm:h-11 sm:w-11 ${cor}`}><Icone size={18} /></span>
            <div className="min-w-0">
              <p className="text-xs leading-tight text-stone-500 first-letter:uppercase sm:truncate sm:text-[13px]">{rotulo}</p>
              <p className="text-2xl font-semibold tracking-tight text-stone-900 tabular-nums">{valor}</p>
            </div>
          </div>
        ))}
        <ProximoEvento evento={proximo} tipo={proximo ? tipoPorId.get(proximo.tipo_id) : undefined} hj={hj} />
      </div>

      {/* Barra de navegação e filtros */}
      <div className="cartao mb-5 flex flex-wrap items-center gap-3 p-3 sm:p-3">
        <div className="flex items-center gap-1">
          <Link href={link({ mes: somarMes(mes, -1) })} className="btn-icone" aria-label="Mês anterior"><ChevronLeft size={18} /></Link>
          <span className="min-w-36 text-center text-base font-semibold tracking-tight text-stone-900 capitalize">{p.mesNome} {p.ano}</span>
          <Link href={link({ mes: somarMes(mes, 1) })} className="btn-icone" aria-label="Próximo mês"><ChevronRight size={18} /></Link>
          {mes !== hj.slice(0, 7) && <Link href={link({ mes: hj.slice(0, 7) })} className="btn-secundario ml-1 h-8 px-3 text-xs">Hoje</Link>}
        </div>
        <div className="hidden h-6 w-px bg-stone-200 md:block" />
        <Filtros tipos={tipos} />
        <div className="segmentado ml-auto">
          <Link href={link({ vista: "lista" })} data-ativo={vista === "lista"}><List size={15} /> Lista</Link>
          <Link href={link({ vista: "calendario" })} data-ativo={vista === "calendario"}><CalendarDays size={15} /> Calendário</Link>
        </div>
      </div>

      {vista === "lista" ? (
        eventos.length ? (
          <div className="space-y-8">
            {proximos.length > 0 && (
              <Secao titulo={passados.length ? "Próximos" : undefined} total={proximos.length}>
                {proximos.map((e) => <CartaoEvento key={e.$id} e={e} t={tipoPorId.get(e.tipo_id)} end={e.endereco_id ? endPorId.get(e.endereco_id) : undefined} hj={hj} pessoas={pessoaPorId} guarnicao={guarnicaoPorId.get(e.$id)} />)}
              </Secao>
            )}
            {passados.length > 0 && (
              <Secao titulo={proximos.length ? "Já aconteceram" : undefined} total={passados.length}>
                {passados.map((e) => <CartaoEvento key={e.$id} e={e} t={tipoPorId.get(e.tipo_id)} end={e.endereco_id ? endPorId.get(e.endereco_id) : undefined} hj={hj} pessoas={pessoaPorId} guarnicao={guarnicaoPorId.get(e.$id)} passado />)}
              </Secao>
            )}
          </div>
        ) : (
          <Vazio
            icone={<CalendarDays size={26} />}
            titulo={`Nenhum evento em ${nomeMes(p.mes)}`}
            texto={tipo || destaque ? "Nenhum evento corresponde aos filtros. Tente limpar os filtros." : "Este mês ainda está livre na agenda."}
            acao={podeEditar && <Link href="/eventos/novo" className="btn-primario"><Plus size={17} /> Criar evento</Link>}
          />
        )
      ) : (
        <Calendario mes={mes} eventos={eventos} tipoPorId={tipoPorId} hj={hj} />
      )}
    </>
  );
}

function ProximoEvento({ evento, tipo, hj }: { evento?: Evento; tipo?: TipoEvento; hj: string }) {
  if (!evento)
    return (
      <div className="cartao col-span-3 flex items-center gap-4 p-4 sm:p-5 xl:col-span-1">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-stone-100 text-stone-500"><Sparkles size={20} /></span>
        <div>
          <p className="text-[13px] text-stone-500">Próximo evento</p>
          <p className="text-sm font-medium text-stone-700">Nada agendado</p>
        </div>
      </div>
    );
  const n = diasAte(hj, evento.data);
  const quando = n === 0 ? "Hoje" : n === 1 ? "Amanhã" : `Em ${n} dias`;
  return (
    <Link
      href={`/eventos/${evento.$id}`}
      className="group relative col-span-3 flex items-center gap-4 overflow-hidden rounded-2xl xl:col-span-1 bg-gradient-to-br from-mata-800 to-mata-950 p-4 text-white shadow-elevado transition hover:-translate-y-0.5 sm:p-5"
    >
      <div aria-hidden className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-ouro-400/20 blur-2xl" />
      <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/10 text-ouro-300 ring-1 ring-white/15"><Clock size={20} /></span>
      <div className="relative min-w-0">
        <p className="text-[13px] text-mata-200">Próximo · <span className="font-semibold text-ouro-300">{quando}</span></p>
        <p className="truncate font-semibold">{evento.titulo}</p>
        <p className="truncate text-xs text-mata-300">{tipo?.nome} · {evento.hora_inicio}</p>
      </div>
    </Link>
  );
}

function Secao({ titulo, total, children }: { titulo?: string; total: number; children: React.ReactNode }) {
  return (
    <section>
      {titulo && (
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-500">
          {titulo}
          <span className="rounded-full bg-stone-200/70 px-2 py-0.5 text-xs text-stone-600 tabular-nums">{total}</span>
        </h2>
      )}
      <div className="grid gap-3">{children}</div>
    </section>
  );
}

function resumoEquipe(e: Evento, pessoas: Map<string, Pessoa>) {
  const mestres = (e.mestres ?? []).map((id) => pessoas.get(id)?.nome).filter(Boolean) as string[];
  // Os guardiões aparecem no indicador da guarnição.
  return mestres.length ? `${mestres.length > 1 ? "Mestres" : "Mestre"} ${mestres.map((n) => n.split(" ")[0]).join(", ")}` : "";
}

function CartaoEvento({ e, t, end, hj, passado, pessoas, guarnicao }: { e: Evento; t?: TipoEvento; end?: Endereco; hj: string; passado?: boolean; pessoas: Map<string, Pessoa>; guarnicao?: { m: number; f: number; vm: number; vf: number } }) {
  const equipeTxt = resumoEquipe(e, pessoas);
  const d = partesData(e.data);
  const idR = formatarIdRitual(e.ritual_numero_geral, e.ritual_ano, e.ritual_numero_ano);
  const cor = t?.cor ?? "#57534e";
  const ehHoje = e.data === hj;
  return (
    <Link
      href={`/eventos/${e.$id}`}
      className={`group relative flex items-stretch gap-4 overflow-hidden rounded-2xl border bg-white p-3 shadow-cartao transition hover:-translate-y-px hover:shadow-elevado sm:p-4 ${
        e.destaque ? "border-ouro-300 ring-1 ring-ouro-200" : "border-stone-200/80 hover:border-stone-300"
      } ${passado ? "opacity-70 hover:opacity-100" : ""}`}
    >
      {e.destaque && <div aria-hidden className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-ouro-300 to-ouro-600" />}

      {/* Data */}
      <div className="flex w-16 shrink-0 flex-col items-center justify-center rounded-xl py-2 text-center" style={{ background: `${cor}12`, color: cor }}>
        <span className="text-[11px] font-semibold tracking-wider uppercase">{d.mesCurto}</span>
        <span className="text-2xl leading-none font-bold tabular-nums">{d.dia}</span>
        <span className="mt-0.5 text-[10px] font-medium capitalize opacity-80">{d.diaSemana.slice(0, 3)}</span>
      </div>

      {/* Capa */}
      {e.capa_file_id && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/api/arquivo/${e.capa_file_id}`} alt="" className="hidden w-32 shrink-0 rounded-xl object-cover ring-1 ring-stone-200 sm:block" />
      )}

      {/* Conteúdo */}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          {ehHoje && <span className="chip bg-mata-700 text-white">Hoje</span>}
          <h3 className="truncate font-semibold text-stone-900 transition group-hover:text-mata-700">{e.titulo}</h3>
          {e.destaque && <Star size={15} className="shrink-0 fill-ouro-400 text-ouro-500" aria-label="Destaque" />}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-stone-500">
          <span className="inline-flex items-center gap-1.5"><Clock size={14} />{e.hora_inicio}</span>
          <span className="inline-flex min-w-0 items-center gap-1.5"><MapPin size={14} /><span className="truncate">{end ? end.apelido : e.endereco_livre}</span></span>
          {equipeTxt && <span className="inline-flex min-w-0 items-center gap-1.5"><Users size={14} /><span className="truncate">{equipeTxt}</span></span>}
          {guarnicao && (
            <span className="inline-flex items-center gap-1.5 tabular-nums" title="Guarnição: guardiões confirmados / vagas">
              <Shield size={14} />
              <IconeGenero genero="masculino" size={13} />{guarnicao.m}/{guarnicao.vm}
              <IconeGenero genero="feminino" size={13} className="ml-1" />{guarnicao.f}/{guarnicao.vf}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 md:hidden">
          {t && <BadgeTipo nome={t.nome} cor={t.cor} />}
          {idR && <BadgeRitual id={idR} />}
        </div>
      </div>

      <div className="hidden shrink-0 flex-col items-end justify-center gap-1.5 md:flex">
        {t && <BadgeTipo nome={t.nome} cor={t.cor} />}
        {idR && <BadgeRitual id={idR} />}
        {e.destaque && <BadgeDestaque />}
      </div>
      <ChevronRight size={18} className="hidden shrink-0 self-center text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-stone-500 sm:block" />
    </Link>
  );
}

function Calendario({ mes, eventos, tipoPorId, hj }: { mes: string; eventos: Evento[]; tipoPorId: Map<string, TipoEvento>; hj: string }) {
  const { fim } = limitesMes(mes);
  const dias = Number(fim.slice(8));
  const primeiroDia = new Date(`${mes}-01T12:00:00Z`).getUTCDay();
  const celulas: (number | null)[] = [...Array(primeiroDia).fill(null), ...Array.from({ length: dias }, (_, i) => i + 1)];
  while (celulas.length % 7) celulas.push(null);
  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-cartao">
      <div className="grid grid-cols-7 border-b border-stone-200 bg-stone-50/80 text-center text-[11px] font-semibold tracking-wider text-stone-500 uppercase">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => <div key={d} className="py-2.5">{d}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {celulas.map((dia, i) => {
          const iso = dia ? `${mes}-${String(dia).padStart(2, "0")}` : "";
          const doDia = dia ? eventos.filter((e) => e.data === iso) : [];
          const fimDeSemana = i % 7 === 0 || i % 7 === 6;
          const ehHoje = iso === hj;
          return (
            <div
              key={i}
              className={`min-h-20 border-b border-r border-stone-100 p-1.5 sm:min-h-28 sm:p-2 [&:nth-child(7n)]:border-r-0 ${
                !dia ? "bg-stone-50/60" : fimDeSemana ? "bg-stone-50/30" : ""
              } ${ehHoje ? "bg-mata-50/50" : ""}`}
            >
              {dia && (
                <div className="mb-1.5 flex justify-end sm:justify-start">
                  <span className={`grid h-6 min-w-6 place-items-center rounded-full px-1 text-xs font-semibold tabular-nums ${ehHoje ? "bg-mata-700 text-white" : iso < hj ? "text-stone-400" : "text-stone-600"}`}>
                    {dia}
                  </span>
                </div>
              )}
              <div className="space-y-1">
                {doDia.map((e) => {
                  const t = tipoPorId.get(e.tipo_id);
                  const cor = t?.cor ?? "#57534e";
                  return (
                    <Link
                      key={e.$id}
                      href={`/eventos/${e.$id}`}
                      title={`${e.hora_inicio} · ${e.titulo}`}
                      className={`block truncate rounded-md border-l-[3px] px-1.5 py-1 text-[11px] leading-tight font-medium transition hover:brightness-95 ${e.destaque ? "ring-1 ring-ouro-300" : ""}`}
                      style={{ background: `${cor}14`, borderColor: cor, color: cor }}
                    >
                      {e.destaque && "★ "}<span className="hidden opacity-75 sm:inline">{e.hora_inicio} </span>{e.titulo}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
