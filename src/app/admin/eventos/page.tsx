import { urlImagem } from "@/lib/links";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, List, MapPin, Plus, Shield, Star, Users } from "lucide-react";
import { exigir, pode } from "@/lib/auth";
import { PODE } from "@/lib/config";
import { getDadosInstituto, listarEventos } from "@/lib/data";
import { listarEquipe } from "@/lib/usuarios";
import { candidaturasDosEventos, temGuarnicao, vagasDe } from "@/lib/guarnicao";
import { IconeGenero } from "@/components/genero";
import { formatarIdRitual, hoje, limitesMes, nomeMes, partesData, somarMes } from "@/lib/format";
import { BadgeDestaque, BadgeTipo, Titulo, Vazio } from "@/components/Titulo";
import { Aviso } from "@/components/ui";
import type { Endereco, Evento, Pessoa, TipoEvento } from "@/lib/types";
import { Filtros } from "./Filtros";

const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function Agenda({ searchParams }: PageProps<"/admin/eventos">) {
  const u = await exigir();
  const sp = await searchParams;
  const hj = hoje();
  const mes = /^\d{4}-\d{2}$/.test(um(sp.mes) ?? "") ? um(sp.mes)! : hj.slice(0, 7);
  const vista = um(sp.vista) === "calendario" ? "calendario" : "lista";
  const tipo = um(sp.tipo) || "";
  const destaque = um(sp.destaque) === "1";
  const { inicio, fim } = limitesMes(mes);
  const filtrando = !!tipo || destaque;

  const [{ tipos, enderecos }, equipe, eventos, todosDoMes] = await Promise.all([
    getDadosInstituto(),
    listarEquipe(),
    listarEventos({ inicio, fim, tipos: tipo ? [tipo] : undefined, apenasDestaque: destaque }),
    // Contagem do mês sem filtros (só busca de novo quando há filtro ativo)
    filtrando ? listarEventos({ inicio, fim }) : null,
  ]);
  const tipoPorId = new Map(tipos.map((t) => [t.$id, t]));
  const endPorId = new Map(enderecos.map((e) => [e.$id, e]));
  const pessoaPorId = new Map(equipe.map((p) => [p.$id, p]));
  // Guarnição: guardiões confirmados por gênero em cada ritual do mês
  const rituaisDoMes = eventos.filter((e) => temGuarnicao(tipoPorId.get(e.tipo_id)));
  const candidaturas = await candidaturasDosEventos(rituaisDoMes.map((e) => e.$id));
  const guarnicaoPorId = new Map(
    rituaisDoMes.map((e) => {
      const conf = candidaturas.filter((c) => c.evento_id === e.$id && c.situacao === "confirmada");
      const v = vagasDe(e);
      return [e.$id, { m: conf.filter((c) => c.sexo === "masculino").length, f: conf.filter((c) => c.sexo === "feminino").length, vm: v.masculino, vf: v.feminino }];
    }),
  );
  const totalDoMes = (todosDoMes ?? eventos).length;
  const contagemMes = (
    <span className="text-xs font-medium text-stone-500">
      <span className="font-semibold text-mata-700 tabular-nums">{totalDoMes}</span> {totalDoMes === 1 ? "evento" : "eventos"} no mês
    </span>
  );
  const podeEditar = pode(u, PODE.editarEventos);

  const link = (extra: Record<string, string>) => {
    const p = new URLSearchParams({ mes, vista, ...(tipo && { tipo }), ...(destaque && { destaque: "1" }), ...extra });
    return `/admin/eventos?${p}`;
  };
  const p = partesData(`${mes}-01`);
  const proximos = eventos.filter((e) => e.data >= hj);
  // Já aconteceram: do mais recente para o mais antigo (a lista vem em ordem crescente).
  const passados = eventos.filter((e) => e.data < hj).reverse();


  return (
    <>
      <Titulo
        sobre="Agenda"
        titulo="Eventos e rituais"
        subtitulo="Acompanhe o mês, filtre por tipo e abra um evento para editar."
        acoes={podeEditar && <Link href="/admin/eventos/novo" className="btn-primario"><Plus size={17} /> Novo evento</Link>}
      />

      {um(sp.ok) === "salvo" && <div className="mb-5"><Aviso tipo="ok">Evento salvo com sucesso.</Aviso></div>}
      {um(sp.ok) === "excluido" && <div className="mb-5"><Aviso tipo="ok">Evento excluído.</Aviso></div>}
      {um(sp.erro) === "sem-permissao" && <div className="mb-5"><Aviso tipo="info">Seu perfil não tem acesso a essa página.</Aviso></div>}

      {/* Uma barra só: filtros · mês · lista/calendário. No celular o mês ocupa a linha de cima. */}
      <div className="cartao mb-5 flex flex-wrap items-center justify-between gap-2 p-2.5 sm:flex-nowrap sm:p-3">
        <div className="order-2 sm:order-1">
          <Filtros tipos={tipos} />
        </div>
        <div className="order-1 flex w-full items-center justify-between gap-1 border-b border-stone-100 pb-2 sm:order-2 sm:w-auto sm:justify-center sm:border-0 sm:pb-0">
          <Link href={link({ mes: somarMes(mes, -1) })} className="btn-icone" aria-label="Mês anterior"><ChevronLeft size={18} /></Link>
          <span className="min-w-36 text-center text-base font-semibold tracking-tight text-stone-900 capitalize">{p.mesNome} {p.ano}</span>
          <Link href={link({ mes: somarMes(mes, 1) })} className="btn-icone" aria-label="Próximo mês"><ChevronRight size={18} /></Link>
          {mes !== hj.slice(0, 7) && <Link href={link({ mes: hj.slice(0, 7) })} className="btn-secundario h-8 px-3 text-xs">Hoje</Link>}
        </div>
        <div className="segmentado order-3">
          <Link href={link({ vista: "lista" })} data-ativo={vista === "lista"}><List size={15} /> Lista</Link>
          <Link href={link({ vista: "calendario" })} data-ativo={vista === "calendario"}><CalendarDays size={15} /> Calendário</Link>
        </div>
      </div>

      {vista === "lista" ? (
        eventos.length ? (
          <div className="space-y-8">
            {proximos.length > 0 && (
              <Secao titulo={passados.length ? "Próximos" : undefined} total={proximos.length} direita={contagemMes}>
                {proximos.map((e) => <CartaoEvento key={e.$id} e={e} t={tipoPorId.get(e.tipo_id)} end={e.endereco_id ? endPorId.get(e.endereco_id) : undefined} hj={hj} pessoas={pessoaPorId} guarnicao={guarnicaoPorId.get(e.$id)} />)}
              </Secao>
            )}
            {passados.length > 0 && (
              <Secao titulo={proximos.length ? "Já aconteceram" : undefined} total={passados.length} direita={proximos.length ? undefined : contagemMes}>
                {passados.map((e) => <CartaoEvento key={e.$id} e={e} t={tipoPorId.get(e.tipo_id)} end={e.endereco_id ? endPorId.get(e.endereco_id) : undefined} hj={hj} pessoas={pessoaPorId} guarnicao={guarnicaoPorId.get(e.$id)} passado />)}
              </Secao>
            )}
          </div>
        ) : (
          <Vazio
            icone={<CalendarDays size={26} />}
            titulo={`Nenhum evento em ${nomeMes(p.mes)}`}
            texto={tipo || destaque ? "Nenhum evento corresponde aos filtros. Tente limpar os filtros." : "Este mês ainda está livre na agenda."}
            acao={podeEditar && <Link href="/admin/eventos/novo" className="btn-primario"><Plus size={17} /> Criar evento</Link>}
          />
        )
      ) : (
        <>
          <div className="mb-3 flex justify-end">{contagemMes}</div>
          <Calendario mes={mes} eventos={eventos} tipoPorId={tipoPorId} hj={hj} />
        </>
      )}
    </>
  );
}

function Secao({ titulo, total, direita, children }: { titulo?: string; total: number; direita?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      {(titulo || direita) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {titulo ? (
            <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-500">
              {titulo}
              <span className="rounded-full bg-stone-200/70 px-2 py-0.5 text-xs text-stone-600 tabular-nums">{total}</span>
            </h2>
          ) : <span />}
          {direita}
        </div>
      )}
      <div className="grid gap-2">{children}</div>
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
      href={`/admin/eventos/${e.$id}`}
      className={`group relative flex items-stretch overflow-hidden rounded-xl border bg-white shadow-cartao transition hover:-translate-y-px hover:shadow-elevado ${
        e.destaque ? "border-ouro-300 ring-1 ring-ouro-200" : "border-stone-200/80 hover:border-stone-300"
      } ${passado ? "opacity-70 hover:opacity-100" : ""}`}
    >
      {/* Coluna da data: a capa preenche a altura toda e a data fica num quadro de vidro */}
      <div
        className="relative isolate grid w-28 shrink-0 place-items-center overflow-hidden sm:w-36"
        style={{ background: `linear-gradient(135deg, ${cor}, color-mix(in oklab, ${cor} 55%, #000))` }}
      >
        {e.capa_file_id && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={urlImagem(e.capa_file_id, 320)} loading="lazy" decoding="async" alt="" aria-hidden className="absolute inset-0 -z-10 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        )}
        <div aria-hidden className="absolute inset-0 -z-10 bg-black/15" />
        <div className="my-3 flex w-[4.5rem] flex-col items-center rounded-xl bg-white/20 px-2 py-2 text-center text-white shadow-[0_8px_24px_-8px_rgb(0_0_0/0.5)] ring-1 ring-white/35 backdrop-blur-md backdrop-saturate-150 [text-shadow:0_1px_6px_rgb(0_0_0/0.45)] sm:w-20">
          <span className="text-[11px] font-bold tracking-[0.18em] uppercase">{d.mesCurto}</span>
          <span className="text-[2.1rem] leading-none font-black tabular-nums sm:text-[2.4rem]">{d.dia}</span>
          <span className="mt-0.5 text-[10px] font-medium capitalize opacity-90 sm:text-[11px]">{d.diaSemana.slice(0, 3)}</span>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          {ehHoje && <span className="chip bg-mata-700 text-white">Hoje</span>}
          <h3 className="truncate text-[17px] leading-snug font-semibold text-stone-900 transition group-hover:text-mata-700 sm:text-xl">{e.titulo}</h3>
          {e.destaque && <Star size={15} className="shrink-0 fill-ouro-400 text-ouro-500 md:hidden" aria-label="Destaque" />}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-stone-500">
          <span className="inline-flex items-center gap-1.5"><Clock size={14} />{e.hora_inicio}</span>
          <span className="inline-flex min-w-0 items-center gap-1.5"><MapPin size={14} /><span className="truncate">{end ? end.apelido : e.endereco_livre}</span></span>
          {equipeTxt && <span className="inline-flex min-w-0 items-center gap-1.5"><Users size={14} /><span className="truncate">{equipeTxt}</span></span>}
          {guarnicao && (
            <span className="inline-flex items-center gap-1.5 tabular-nums" title={`Guardiões confirmados (vagas: ${guarnicao.vm} ♂ · ${guarnicao.vf} ♀)`}>
              <Shield size={14} /> Guardiões
              <IconeGenero genero="masculino" size={13} className="ml-0.5" />{guarnicao.m}
              <IconeGenero genero="feminino" size={13} className="ml-1" />{guarnicao.f}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 md:hidden">
          {t && <BadgeTipo nome={t.nome} cor={t.cor} icone={t.icone} />}
          {idR && <span className="font-mono text-[11px] font-medium tracking-tight text-mata-700">{idR}</span>}
        </div>
      </div>

      <div className="hidden shrink-0 flex-col items-end justify-center gap-1.5 py-4 md:flex">
        {t && <BadgeTipo nome={t.nome} cor={t.cor} icone={t.icone} />}
        {e.destaque && <BadgeDestaque />}
        {/* Número do ritual sem fundo, abaixo do destaque */}
        {idR && <span className="pr-1 font-mono text-[11px] font-medium tracking-tight text-mata-700">{idR}</span>}
      </div>
      <ChevronRight size={18} className="mr-3 hidden shrink-0 self-center text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-stone-500 sm:block" />
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
                      href={`/admin/eventos/${e.$id}`}
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
