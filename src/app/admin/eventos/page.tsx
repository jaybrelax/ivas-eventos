import { urlImagem } from "@/lib/links";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Crown, List, Plus, Shield, Star, Users } from "lucide-react";
import { exigir, pode } from "@/lib/auth";
import { PODE } from "@/lib/config";
import { getDadosInstituto, listarEventos } from "@/lib/data";
import { mapaUsuarios, type ResumoUsuario } from "@/lib/usuarios";
import { candidaturasDosEventos, temGuarnicao } from "@/lib/guarnicao";
import { inscricoesDosEventos } from "@/lib/inscricoes";
import { compararFirst } from "@/lib/ordenacao-first";
import { Avatar, iniciais } from "@/components/Avatar";
import { IconeTipo } from "@/components/IconeTipo";
import { dataPorExtenso, formatarIdRitual, hoje, limitesMes, nomeMes, partesData, somarMes } from "@/lib/format";
import { CapaDiaCalendario } from "./CapaDiaCalendario";
import { Titulo, Vazio } from "@/components/Titulo";
import { Aviso } from "@/components/ui";
import type { Evento, TipoEvento } from "@/lib/types";
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

  const [{ tipos, enderecos }, pessoas, eventos, todosDoMes] = await Promise.all([
    getDadosInstituto(),
    mapaUsuarios(),
    listarEventos({ inicio, fim, tipos: tipo ? [tipo] : undefined, apenasDestaque: destaque }),
    // Contagem do mês sem filtros (só busca de novo quando há filtro ativo)
    filtrando ? listarEventos({ inicio, fim }) : null,
  ]);
  const tipoPorId = new Map(tipos.map((t) => [t.$id, t]));
  const endPorId = new Map(enderecos.map((e) => [e.$id, e]));
  // Guarnição: guardiões confirmados por gênero em cada ritual do mês
  const rituaisDoMes = eventos.filter((e) => temGuarnicao(tipoPorId.get(e.tipo_id)));
  const [candidaturas, inscricoes] = await Promise.all([
    candidaturasDosEventos(rituaisDoMes.map((e) => e.$id)),
    inscricoesDosEventos(eventos.map((e) => e.$id)),
  ]);
  const confirmadosPorEvento = new Map<string, Set<string>>();
  const adicionarConfirmado = (eventoId: string, usuarioId: string) => {
    if (!confirmadosPorEvento.has(eventoId)) confirmadosPorEvento.set(eventoId, new Set());
    confirmadosPorEvento.get(eventoId)!.add(usuarioId);
  };
  for (const c of candidaturas) if (c.situacao === "confirmada") adicionarConfirmado(c.evento_id, c.usuario_id);
  for (const i of inscricoes) if (i.situacao === "confirmada") adicionarConfirmado(i.evento_id, i.usuario_id);
  const participantesPorEvento = new Map(eventos.map((e) => [
    e.$id,
    new Set([...(e.mestres ?? []), ...(e.guardioes ?? []), ...(e.guardioes_escalados_reuniao ?? []), ...(confirmadosPorEvento.get(e.$id) ?? [])]).size,
  ]));
  const guardioesConfirmadosPorEvento = new Map<string, string[]>();
  for (const c of candidaturas) if (c.situacao === "confirmada") {
    const ids = guardioesConfirmadosPorEvento.get(c.evento_id) ?? [];
    ids.push(c.usuario_id);
    guardioesConfirmadosPorEvento.set(c.evento_id, ids);
  }
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
        subtituloClassName="hidden sm:block"
        acoes={podeEditar && <Link href="/admin/eventos/novo" className="btn-primario hidden sm:inline-flex"><Plus size={17} /> Novo evento</Link>}
      />

      {um(sp.ok) === "salvo" && <div className="mb-5"><Aviso tipo="ok">Evento salvo com sucesso.</Aviso></div>}
      {um(sp.ok) === "excluido" && <div className="mb-5"><Aviso tipo="ok">Evento excluído.</Aviso></div>}
      {um(sp.erro) === "sem-permissao" && <div className="mb-5"><Aviso tipo="info">Seu perfil não tem acesso a essa página.</Aviso></div>}

      {/* No celular o mês ocupa a linha de cima; a visualização fica à esquerda dos filtros. */}
      <div className="cartao mb-5 flex flex-wrap items-center justify-between gap-2 p-2.5 sm:flex-nowrap sm:p-3">
        <div className="flex w-full items-center justify-between gap-1 border-b border-stone-100 pb-2 sm:w-auto sm:justify-center sm:border-0 sm:pb-0">
          <Link href={link({ mes: somarMes(mes, -1) })} className="btn-icone" aria-label="Mês anterior"><ChevronLeft size={18} /></Link>
          <span className="min-w-36 text-center text-base font-semibold tracking-tight text-stone-900 capitalize">{p.mesNome} {p.ano}</span>
          <Link href={link({ mes: somarMes(mes, 1) })} className="btn-icone" aria-label="Próximo mês"><ChevronRight size={18} /></Link>
          {mes !== hj.slice(0, 7) && <Link href={link({ mes: hj.slice(0, 7) })} className="btn-secundario h-8 px-3 text-xs">Hoje</Link>}
        </div>
        <div className="segmentado">
          <Link href={link({ vista: "lista" })} data-ativo={vista === "lista"}><List size={15} /> Lista</Link>
          <Link href={link({ vista: "calendario" })} data-ativo={vista === "calendario"}><CalendarDays size={15} /> Calendário</Link>
        </div>
        <Filtros tipos={tipos} />
      </div>

      {vista === "lista" ? (
        eventos.length ? (
          <div className="space-y-8">
            {proximos.length > 0 && (
              <Secao titulo={passados.length ? "Próximos" : undefined} total={proximos.length} direita={contagemMes}>
                {proximos.map((e) => <CartaoEvento key={e.$id} e={e} t={tipoPorId.get(e.tipo_id)} hj={hj} pessoas={pessoas} guardioesConfirmados={guardioesConfirmadosPorEvento.get(e.$id) ?? []} participantes={participantesPorEvento.get(e.$id) ?? 0} />)}
              </Secao>
            )}
            {passados.length > 0 && (
              <Secao titulo={proximos.length ? "Já aconteceram" : undefined} total={passados.length} direita={proximos.length ? undefined : contagemMes}>
                {passados.map((e) => <CartaoEvento key={e.$id} e={e} t={tipoPorId.get(e.tipo_id)} hj={hj} pessoas={pessoas} guardioesConfirmados={guardioesConfirmadosPorEvento.get(e.$id) ?? []} participantes={participantesPorEvento.get(e.$id) ?? 0} passado />)}
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
          <Calendario mes={mes} eventos={eventos} tipoPorId={tipoPorId} endPorId={endPorId} hj={hj} />
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

function GrupoAvatares({ ids, pessoas, rotulo }: { ids: string[]; pessoas: Map<string, ResumoUsuario>; rotulo: string }) {
  if (!ids.length) return null;
  const visiveis = ids.slice(0, 3);
  return (
    <span className="inline-flex shrink-0 items-center -space-x-2" aria-label={`${rotulo}: ${ids.map((id) => pessoas.get(id)?.nome ?? "Usuário indisponível").join(", ")}`}>
      {visiveis.map((id) => {
        const pessoa = pessoas.get(id);
        const nome = pessoa?.nome ?? "Usuário";
        return <span key={id} className="relative grid size-6 shrink-0 place-items-center rounded-full bg-stone-200 text-[10px] font-bold text-stone-600 ring-2 ring-white" aria-hidden>
          {iniciais(nome)}
          <Avatar nome={nome} foto={pessoa?.foto} tamanho={24} leve className="absolute inset-0 ring-0" />
        </span>;
      })}
      {ids.length > visiveis.length && <span className="relative grid size-6 shrink-0 place-items-center rounded-full bg-stone-200 text-[10px] font-bold text-stone-700 ring-2 ring-white">+{ids.length - visiveis.length}</span>}
    </span>
  );
}

function CartaoEvento({ e, t, hj, passado, pessoas, guardioesConfirmados, participantes }: { e: Evento; t?: TipoEvento; hj: string; passado?: boolean; pessoas: Map<string, ResumoUsuario>; guardioesConfirmados: string[]; participantes: number }) {
  const d = partesData(e.data);
  const mestres = [...new Set(e.mestres ?? [])].sort((a, b) => compararFirst(pessoas.get(a), pessoas.get(b)));
  const guardioes = [...new Set([...(e.guardioes ?? []), ...(e.guardioes_escalados_reuniao ?? []), ...guardioesConfirmados])].filter((id) => !mestres.includes(id));
  const guardioesHomens = guardioes.filter((id) => pessoas.get(id)?.sexo === "masculino").sort((a, b) => compararFirst(pessoas.get(a), pessoas.get(b)));
  const guardias = guardioes.filter((id) => pessoas.get(id)?.sexo === "feminino").sort((a, b) => compararFirst(pessoas.get(a), pessoas.get(b)));
  const guardioesSemGenero = guardioes.filter((id) => !pessoas.get(id)?.sexo);
  const cor = t?.cor ?? "#57534e";
  const ehHoje = e.data === hj;
  return (
    <Link
      href={`/admin/eventos/${e.$id}`}
      className={`group relative flex min-h-36 items-stretch overflow-hidden rounded-2xl border bg-white shadow-cartao transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-px hover:shadow-elevado focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mata-700 ${
        e.destaque ? "border-ouro-300" : "border-stone-200/90 hover:border-stone-300"
      } ${passado ? "bg-stone-50/70" : ""}`}
    >
      {/* A capa ocupa a primeira coluna; a data fica separada à direita. */}
      <div
        className="relative isolate w-[5.5rem] shrink-0 overflow-hidden min-[420px]:w-[7.5rem] sm:w-36"
        style={{ background: `linear-gradient(135deg, ${cor}, color-mix(in oklab, ${cor} 55%, #000))` }}
      >
        {e.capa_file_id && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={urlImagem(e.capa_file_id, 320)} loading="lazy" decoding="async" alt="" aria-hidden className="absolute inset-0 -z-10 h-full w-full object-cover transition duration-500 group-hover:scale-105" style={passado ? { filter: "saturate(0.1)" } : undefined} />
        )}
        {t && <div className="absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-stone-950/70 to-transparent px-1 pb-2 pt-6">
          <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm ring-1 ring-inset ring-white/35 backdrop-blur-md backdrop-saturate-150 [text-shadow:0_1px_3px_rgb(0_0_0/0.5)]">
            {t.icone ? <IconeTipo nome={t.icone} size={11} strokeWidth={2.4} /> : <span className="size-1.5 shrink-0 rounded-full bg-white" />}
            <span className="truncate">{t.nome}</span>
          </span>
        </div>}
      </div>

      {/* Conteúdo */}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 px-3 py-3.5 sm:px-4">
        <div className="flex min-w-0 items-start gap-2">
          {ehHoje && <span className="chip bg-mata-700 text-white">Hoje</span>}
          <h3 className="min-w-0 flex-1 line-clamp-2 text-[17px] leading-snug font-bold tracking-tight text-stone-900 transition-colors group-hover:text-mata-700 sm:text-[21px]" title={e.titulo}>{e.titulo}</h3>
          {e.destaque && <Star size={15} className="shrink-0 fill-ouro-400 text-ouro-500 md:hidden" aria-label="Destaque" />}
        </div>
        {(mestres.length > 0 || guardioes.length > 0) && <div className="flex min-w-0 flex-wrap items-center gap-1" aria-label="Equipe do evento">
          {mestres.length > 0 && <span className="inline-flex shrink-0 items-center gap-1"><Crown size={14} className="shrink-0 text-mata-700" aria-label="Mestres" /><GrupoAvatares ids={mestres} pessoas={pessoas} rotulo="Mestres" /></span>}
          {guardioes.length > 0 && <span className="inline-flex shrink-0 items-center gap-1"><Shield size={14} className="shrink-0 text-mata-700" aria-label="Guardiões" /><GrupoAvatares ids={guardioesHomens} pessoas={pessoas} rotulo="Guardiões" />{guardioesHomens.length > 0 && guardias.length > 0 && <span className="w-1" aria-hidden />}<GrupoAvatares ids={guardias} pessoas={pessoas} rotulo="Guardiãs" /><GrupoAvatares ids={guardioesSemGenero} pessoas={pessoas} rotulo="Guardiões sem gênero informado" /></span>}
        </div>}
        <div className="mt-0.5 flex flex-wrap items-center justify-between gap-x-1.5 gap-y-1 border-t border-stone-100 pt-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-700 tabular-nums" title="Participantes confirmados, incluindo mestres e guardiões"><Users size={12} aria-hidden />{participantes} {participantes === 1 ? "participante" : "participantes"}</span>
          {e.ritual_numero_ano != null && e.ritual_numero_geral != null && <span className="whitespace-nowrap font-mono text-xs font-bold tracking-tight text-mata-800 tabular-nums sm:text-[13px]" title={`Ritual ${formatarIdRitual(e.ritual_numero_geral, e.ritual_ano, e.ritual_numero_ano)}`}>N° {e.ritual_numero_ano}/{e.ritual_numero_geral}</span>}
        </div>
      </div>

      <time dateTime={e.data} aria-label={dataPorExtenso(e.data)} className="flex w-16 shrink-0 flex-col items-center justify-center border-l border-stone-200 bg-stone-50/70 px-1 text-center text-stone-700 min-[420px]:w-[4.5rem] sm:w-24">
        <span className="text-[2.1rem] leading-none font-black tracking-tight text-stone-900 tabular-nums sm:text-[2.6rem]">{d.dia}</span>
        <span className="mt-0.5 text-xs font-extrabold tracking-[0.12em] uppercase text-mata-700 sm:text-sm">{d.mesCurto}</span>
        <span className="mt-2 w-full border-t border-stone-200 pt-2 text-[10px] font-bold leading-tight uppercase sm:text-[11px]">{d.diaSemana}</span>
      </time>
    </Link>
  );
}

function Calendario({ mes, eventos, tipoPorId, endPorId, hj }: { mes: string; eventos: Evento[]; tipoPorId: Map<string, TipoEvento>; endPorId: Map<string, { apelido: string }>; hj: string }) {
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
          // Dia com evento que tem imagem: a célula vira a própria imagem (miniatura leve), clicável para abrir o evento
          const comCapa = doDia.find((e) => e.capa_file_id);
          const outros = doDia.filter((e) => e !== comCapa);
          return (
            <div
              key={i}
              className={`relative min-h-20 border-b border-r border-stone-100 p-1.5 sm:min-h-28 sm:p-2 [&:nth-child(7n)]:border-r-0 ${comCapa ? "isolate overflow-hidden" : ""} ${
                !dia ? "bg-stone-50/60" : fimDeSemana ? "bg-stone-50/30" : ""
              } ${ehHoje && !comCapa ? "bg-mata-50/50" : ""}`}
            >
              {comCapa && (
                <CapaDiaCalendario
                  resumo={{
                    id: comCapa.$id, titulo: comCapa.titulo, capaFileId: comCapa.capa_file_id!, hora: comCapa.hora_inicio,
                    data: dataPorExtenso(comCapa.data).replace(/^./, (l) => l.toUpperCase()),
                    numeros: formatarIdRitual(comCapa.ritual_numero_geral, comCapa.ritual_ano, comCapa.ritual_numero_ano),
                    local: (comCapa.endereco_id ? endPorId.get(comCapa.endereco_id)?.apelido : null) || comCapa.endereco_livre || null,
                  }}
                />
              )}
              {dia && (
                <div className={`pointer-events-none relative mb-1.5 flex justify-end sm:justify-start ${comCapa ? "z-10" : ""}`}>
                  <span className={`grid h-6 min-w-6 place-items-center rounded-full px-1 text-xs font-semibold tabular-nums ${
                    ehHoje ? "bg-mata-700 text-white ring-2 ring-white/80"
                      : comCapa ? "bg-white/90 text-stone-900 shadow-[0_1px_4px_rgb(0_0_0/0.3)]"
                        : iso < hj ? "text-stone-400" : "text-stone-600"
                  }`}>
                    {dia}
                  </span>
                </div>
              )}
              <div className={`space-y-1 ${comCapa ? "relative z-10" : ""}`}>
                {(comCapa ? outros : doDia).map((e) => {
                  const t = tipoPorId.get(e.tipo_id);
                  const cor = t?.cor ?? "#57534e";
                  return (
                    <Link
                      key={e.$id}
                      href={`/admin/eventos/${e.$id}`}
                      title={`${e.hora_inicio} · ${e.titulo}`}
                      className={`block truncate rounded-md border-l-[3px] px-1.5 py-1 text-[11px] leading-tight font-medium transition hover:brightness-95 ${comCapa ? "bg-white/90 backdrop-blur-sm" : ""} ${e.destaque ? "ring-1 ring-ouro-300" : ""}`}
                      style={{ background: comCapa ? undefined : `${cor}14`, borderColor: cor, color: cor }}
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
