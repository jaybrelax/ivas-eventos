import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock, Crown, ExternalLink, MapPin, Pencil, Shield } from "lucide-react";
import type { Sexo } from "@/lib/types";
import { exigir, pode } from "@/lib/auth";
import { PODE } from "@/lib/config";
import { getDadosInstituto, getEvento } from "@/lib/data";
import { listarEquipe } from "@/lib/usuarios";
import { dataPorExtenso, partesData } from "@/lib/format";
import { urlImagem, urlPublicaEvento } from "@/lib/links";
import { SITE_URL } from "@/lib/site";
import { podeGerenciarEvento } from "@/lib/gestao-evento";
import { AtualizarAoVivo } from "./AtualizarAoVivo";
import { ConsumoMedicina, type ConsumoPessoa } from "./ConsumoMedicina";
import { lerDosesEquipe } from "@/lib/doses";
import { MenuEventoMobile } from "./MenuEventoMobile";
import { ehReuniao, guardioesDaReuniao, temGuarnicao } from "@/lib/guarnicao";
import { dadosReuniao } from "@/lib/reuniao";
import { Aviso } from "@/components/ui";
import { Avatar } from "@/components/Avatar";
import { BadgeDestaque, BadgeTipo } from "@/components/Titulo";
import { IconeGenero } from "@/components/genero";
import { Guarnicao } from "../Guarnicao";
import { dadosGuarnicao } from "../guarnicao-dados";
import { PresencaReuniao } from "../PresencaReuniao";
import { Participantes, type MembroLista } from "../Participantes";
import { dadosParticipantes } from "../participantes-dados";
import { resumoContribuicoes } from "./EstatisticasEvento";
import { LinksEvento } from "./LinksEvento";
import { ListaPresenca, type PessoaPresenca } from "./ListaPresenca";
import { GerenciarGuardioes, GerenciarMestres, MenuEquipeMobile } from "./GerenciarEquipe";

type MembroEquipe = { id: string; nome: string; foto: string | null; sexo: Sexo | null };

/**
 * Visualização do evento para a equipe, numa página só: capa com data e local, estatísticas
 * (coordenação), a equipe em destaque, a lista de presença com todos juntos (mestres, guardiões e
 * participantes) e, para a coordenação, a gestão de inscrições e guarnição. Textos públicos
 * (descrição, como participar, contribuição) ficam na página pública. Editar fica em /editar.
 */
export default async function VerEvento({ params, searchParams }: PageProps<"/admin/eventos/[id]">) {
  const u = await exigir();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [evento, { tipos, enderecos, instituto }, equipe] = await Promise.all([getEvento(id), getDadosInstituto(), listarEquipe()]);
  if (!evento) notFound();

  const gerenciar = podeGerenciarEvento(u, evento);
  const tipo = tipos.find((t) => t.$id === evento.tipo_id);
  const reuniaoTipo = ehReuniao(tipo);
  const [guarnicao, reuniao, participantes] = await Promise.all([
    temGuarnicao(tipo) ? dadosGuarnicao(evento, u, gerenciar) : null,
    reuniaoTipo ? dadosReuniao(evento, u.id, true) : null,
    dadosParticipantes(evento, tipo, instituto.valor_contribuicao, gerenciar, { estado: instituto.estado, cidade: instituto.cidade }),
  ]);
  const end = enderecos.find((e) => e.$id === evento.endereco_id);
  const caminhoPublico = urlPublicaEvento(evento, tipo);
  const um = (v: unknown) => (typeof v === "string" ? v : Array.isArray(v) ? v[0] : undefined);

  // Equipe: mestres escalados e guardiões (confirmados na guarnição ou escalados na reunião)
  const pessoaDaEquipe = new Map(equipe.map((p) => [p.$id, p]));
  const mestres: MembroEquipe[] = (evento.mestres ?? []).flatMap((mid) => {
    const p = pessoaDaEquipe.get(mid);
    return p && !p.mock ? [{ id: p.$id, nome: p.nome, foto: p.foto, sexo: p.sexo }] : [];
  });
  const guardioes: MembroEquipe[] = guarnicao
    ? (["masculino", "feminino"] as const).flatMap((sx) => guarnicao.confirmados[sx].filter((g) => !g.oculto).map((g) => ({ id: g.id, nome: g.nome, foto: g.foto, sexo: sx })))
    : reuniaoTipo
      ? guardioesDaReuniao(evento).flatMap((gid) => {
        const p = pessoaDaEquipe.get(gid);
        return p && !p.mock ? [{ id: p.$id, nome: p.nome, foto: p.foto, sexo: p.sexo }] : [];
      })
      : [];

  // Lista de presença: todos juntos, sem repetir quem tem mais de um papel
  const vistos = new Set<string>();
  const presenca: PessoaPresenca[] = [
    ...mestres.map((p) => ({ ...p, papel: "mestre" as const })),
    ...guardioes.map((p) => ({ ...p, papel: "guardiao" as const })),
    ...(participantes?.confirmados ?? []).map((p) => ({ id: p.id, nome: p.nome, foto: p.foto, papel: "participante" as const })),
  ].filter((p) => (vistos.has(p.id) ? false : (vistos.add(p.id), true)));

  const membros: MembroLista[] = [
    ...mestres.map((p) => ({ id: p.id, nome: p.nome, foto: p.foto, sexo: p.sexo, first: !!pessoaDaEquipe.get(p.id)?.first, papel: "mestre" as const })),
    ...guardioes.filter((g) => !mestres.some((m) => m.id === g.id)).map((p) => ({ id: p.id, nome: p.nome, foto: p.foto, sexo: p.sexo, first: !!pessoaDaEquipe.get(p.id)?.first, papel: "guardiao" as const })),
  ];
  const guardioesGerais = equipe.filter((p) => p.funcao === "guardiao" && !p.mock).map((p) => p.$id);
  // Os 4 cards (participantes e contribuições) só fazem sentido para a coordenação em evento com inscrições pagas
  const temNumeros = gerenciar && !!participantes?.temContribuicao;
  const temEquipe = mestres.length > 0 || guardioes.length > 0 || !!guarnicao || reuniaoTipo;
  // Consumo: doses da inscrição e, para a equipe sem inscrição, as guardadas no evento
  const consumo: ConsumoPessoa[] = (() => {
    if (!gerenciar || !participantes) return [];
    const mapa = new Map<string, ConsumoPessoa>();
    for (const m of membros) mapa.set(m.id, { id: m.id, nome: m.nome, foto: m.foto, doses: [] });
    const equipeDoses = lerDosesEquipe(evento.doses_equipe);
    for (const [id, doses] of Object.entries(equipeDoses)) {
      const m = mapa.get(id);
      if (m) m.doses = doses;
    }
    for (const c of participantes.confirmados) {
      const dosesInsc = c.doses ?? [];
      const atual = mapa.get(c.id);
      if (atual) { if (dosesInsc.length) atual.doses = dosesInsc; }
      else mapa.set(c.id, { id: c.id, nome: c.nome, foto: c.foto, doses: dosesInsc });
    }
    return [...mapa.values()];
  })();
  const data = partesData(evento.data);
  const resumo = participantes?.temContribuicao ? resumoContribuicoes(participantes) : null;

  return (
    <>
      <AtualizarAoVivo />
      {/* Mobile: a capa do evento ao fundo, atrás da capa e da data, desbotando para a cor da página */}
      {evento.capa_file_id && (
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[23rem] overflow-hidden md:h-[27rem] lg:hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={urlImagem(evento.capa_file_id, 640)} alt="" className="h-full w-full scale-110 object-cover blur-[2px]" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-b from-transparent via-fundo/80 to-fundo" />
        </div>
      )}
      <div className="-mt-1 mb-2 flex items-center justify-between gap-3 md:mt-0 md:mb-5">
        <Link href={`/admin/eventos?mes=${evento.data.slice(0, 7)}`} className={`inline-flex min-h-11 items-center gap-2 text-base font-semibold tracking-[0.12em] uppercase md:min-h-0 md:gap-1.5 md:text-xs md:tracking-[0.14em] lg:text-ouro-600 lg:drop-shadow-none lg:hover:text-ouro-700 ${evento.capa_file_id ? "text-white drop-shadow lg:text-ouro-600 lg:drop-shadow-none" : "text-ouro-600"}`}>
          <ArrowLeft size={18} className="md:size-[13px]" /> Agenda
        </Link>
        <MenuEventoMobile url={`${SITE_URL}${caminhoPublico}`} caminho={caminhoPublico} titulo={evento.titulo} claro={!!evento.capa_file_id} editarHref={gerenciar ? `/admin/eventos/${evento.$id}/editar` : undefined} />
        <div className="hidden flex-wrap items-center gap-2 md:flex">
          <Link href={caminhoPublico} target="_blank" rel="noopener noreferrer" className="btn-secundario"><ExternalLink size={16} /> Ver público</Link>
          {gerenciar && <Link href={`/admin/eventos/${evento.$id}/editar`} className="btn-primario"><Pencil size={16} /> Editar evento</Link>}
        </div>
      </div>
      {um(sp.ok) === "salvo" && <div className="mb-5"><Aviso tipo="ok">Evento salvo com sucesso.</Aviso></div>}

      {/* Faixa do evento: capa (sem nada por cima) e, ao lado, tudo na altura dela: quando/onde, números e equipe */}
      <section className="mb-4 grid grid-cols-2 gap-3 md:mb-6 md:gap-4 md:grid-cols-[13rem_minmax(0,1fr)] lg:grid-cols-[16rem_minmax(0,1fr)]">
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-mata-950 shadow-elevado md:ring-1 md:ring-stone-900/5">
          {evento.capa_file_id ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={urlImagem(evento.capa_file_id, 640)} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-mata-700 via-mata-900 to-mata-950" />
          )}
        </div>

        {/* Mobile: ao lado da capa, data em destaque, local e numeração do ritual */}
        <div className="vidro flex flex-col overflow-hidden rounded-2xl md:hidden">
          <div className="flex flex-1 flex-col justify-center px-3 py-2.5 text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.3)]">
            <p className="text-[10px] font-semibold tracking-[0.16em] text-mata-200 uppercase">{data.diaSemana}</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-[46px] leading-none font-bold tracking-tight tabular-nums">{data.dia}</span>
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="flex items-center gap-1 text-[11px] font-medium text-mata-100 tabular-nums"><Clock size={11} aria-hidden /> {evento.hora_inicio}</span>
                <span className="truncate text-[15px] font-semibold text-ouro-300">{data.mesNome.charAt(0).toUpperCase() + data.mesNome.slice(1)}</span>
              </span>
            </div>
            <p className="mt-2 flex min-w-0 items-center gap-1 text-[13px] font-medium text-white/90">
              <MapPin size={13} className="shrink-0 text-mata-200" aria-hidden /> <span className="truncate">{end ? end.apelido : (evento.endereco_livre || "Local a definir")}</span>
            </p>
          </div>
          {(evento.ritual_numero_geral || evento.ritual_numero_ano) && (
            <dl className="grid grid-cols-2 divide-x divide-white/15 border-t border-white/20 bg-white/10 text-white">
              <div className="px-1 py-1.5 text-center">
                <dt className="text-[9px] font-semibold tracking-wider text-white/70 uppercase">Ritual</dt>
                <dd className="text-lg leading-tight font-bold tabular-nums">{evento.ritual_numero_geral ?? "–"}</dd>
              </div>
              <div className="px-1 py-1.5 text-center">
                <dt className="text-[9px] font-semibold tracking-wider text-white/70 uppercase">Do ano</dt>
                <dd className="text-lg leading-tight font-bold tabular-nums">{evento.ritual_numero_ano ?? "–"}</dd>
              </div>
            </dl>
          )}
        </div>

        <div className="cartao col-span-2 flex min-w-0 flex-col divide-y divide-stone-100 overflow-hidden p-0 sm:p-0 md:col-span-1 md:max-lg:h-auto lg:h-[16rem] md:max-lg:border-white/60 md:max-lg:bg-white/65 md:max-lg:shadow-elevado md:max-lg:backdrop-blur-xl md:max-lg:backdrop-saturate-150 md:max-lg:divide-white/50">
          {/* Título (uma linha) e tipo */}
          <div className="flex items-center gap-3 px-4 pt-3.5 pb-3 md:px-5 md:pt-3 md:pb-2.5">
            <h1 className="min-w-0 flex-1 truncate text-lg leading-tight font-semibold tracking-tight text-stone-900 md:text-xl lg:text-[22px]" title={evento.titulo}>{evento.titulo}</h1>
            {(tipo || evento.destaque) && (
              <p className="hidden shrink-0 items-center gap-1.5 lg:flex">
                {tipo && <BadgeTipo nome={tipo.nome} cor={tipo.cor} icone={tipo.icone} />}
                {evento.destaque && <BadgeDestaque />}
              </p>
            )}
          </div>

          {/* Quando, onde e numeração do ritual */}
          <div className="hidden flex-col items-start gap-2.5 px-5 py-2.5 md:flex lg:flex-row lg:items-center lg:justify-between lg:gap-4">
            <ul className="flex min-w-0 flex-col gap-1 text-sm">
              <li className="flex items-center gap-4">
                <span className="flex items-center gap-2 text-stone-800">
                  <CalendarDays size={15} className="text-mata-600" aria-hidden />
                  <span className="font-medium capitalize">{dataPorExtenso(evento.data)}</span>
                </span>
                <span className="flex items-center gap-2 text-stone-800">
                  <Clock size={15} className="text-mata-600" aria-hidden />
                  <span className="font-medium tabular-nums">{evento.hora_inicio}</span>
                </span>
              </li>
              <li className="flex min-w-0 items-center gap-2 text-stone-800">
                <MapPin size={15} className="shrink-0 text-mata-600" aria-hidden />
                <span className="truncate font-medium" title={end?.endereco}>{end ? end.apelido : (evento.endereco_livre || "Local a definir")}</span>
                {end?.link_maps && (
                  <a href={end.link_maps} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold text-mata-700 hover:underline">
                    Mapa <ExternalLink size={11} aria-hidden />
                  </a>
                )}
              </li>
            </ul>
            {(evento.ritual_numero_geral || evento.ritual_numero_ano) && (
              <dl className="flex shrink-0 divide-x divide-mata-200/70 overflow-hidden rounded-xl bg-gradient-to-br from-mata-50 to-white shadow-sm ring-1 ring-mata-200/80">
                {evento.ritual_numero_geral ? (
                  <div className="px-3.5 py-1.5 text-center">
                    <dt className="text-[9px] font-semibold tracking-wider text-mata-600 uppercase">Ritual</dt>
                    <dd className="font-mono text-xl leading-tight font-bold text-mata-800 tabular-nums">Nº {evento.ritual_numero_geral}</dd>
                  </div>
                ) : null}
                {evento.ritual_numero_ano ? (
                  <div className="px-3.5 py-1.5 text-center">
                    <dt className="text-[9px] font-semibold tracking-wider text-mata-600 uppercase">Do ano</dt>
                    <dd className="font-mono text-xl leading-tight font-bold text-mata-800 tabular-nums">{evento.ritual_numero_ano}/{evento.ritual_ano}</dd>
                  </div>
                ) : null}
              </dl>
            )}
          </div>

          {/* Equipe */}
          {temEquipe && (
            <div className="hidden min-h-0 flex-1 flex-row flex-wrap md:flex md:max-lg:py-3 content-start items-start gap-x-4 gap-y-2 md:gap-x-0 overflow-hidden px-4 pt-2.5 pb-3 md:px-5 md:pt-2.5 md:pb-2">
              <GrupoCompacto
                titulo="Mestres" Icone={Crown} cor="text-mata-700" anel="ring-mata-300" pessoas={mestres}
                acao={gerenciar ? <GerenciarMestres eventoId={evento.$id} equipe={equipe.filter((p) => !p.mock)} inicial={evento.mestres ?? []} /> : undefined}
              />
              {(guarnicao || reuniaoTipo || guardioes.length > 0) ? (
                <GrupoCompacto
                  titulo="Guardiões" Icone={Shield} cor="text-sky-700" anel="ring-sky-300" pessoas={guardioes}
                  vagas={guarnicao ? guarnicao.vagas.masculino + guarnicao.vagas.feminino : undefined}
                  acao={gerenciar && guarnicao ? <GerenciarGuardioes dados={guarnicao} /> : undefined}
                />
              ) : null}
            </div>
          )}
        </div>
      </section>

      <div className="mb-4 md:mb-6">
        {participantes ? (
          <Participantes
            dados={{ ...participantes, linkPerfil: pode(u, PODE.editarEventos) }} semResumo equipe={membros} guardioes={guardioesGerais} titulo="Lista de presença"
            acoes={gerenciar ? (
              <MenuEquipeMobile
                mestres={{ eventoId: evento.$id, equipe: equipe.filter((p) => !p.mock), inicial: evento.mestres ?? [] }}
                guarnicao={guarnicao}
              />
            ) : undefined}
          />
        ) : (
          <ListaPresenca pessoas={presenca} espera={0} vagas={null} linkFicha={gerenciar} />
        )}
      </div>

      {temNumeros && participantes && resumo && (
        <div className="mb-4 md:mb-6">
          <dl className="cartao grid grid-cols-2 overflow-hidden p-0 max-sm:[&>*]:border-stone-100 max-sm:[&>*:nth-child(-n+2)]:border-b max-sm:[&>*:nth-child(odd)]:border-r sm:grid-cols-4 sm:divide-x sm:divide-stone-100 sm:p-0">
            <Numero
              rotulo="Participantes"
              valor={`${participantes.confirmados.length}/${participantes.vagas}`}
              detalhe={`${Math.max(0, participantes.vagas - participantes.confirmados.length)} vagas livres${participantes.espera.length ? ` · ${participantes.espera.length} na espera` : ""}`}
              barra={participantes.vagas ? Math.min(100, Math.round((participantes.confirmados.length / participantes.vagas) * 100)) : 0}
            />
            <Numero rotulo="Recebido" valor={resumo.recebido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} detalhe={`${resumo.pagos} ${resumo.pagos === 1 ? "confirmada" : "confirmadas"}`} cor="text-emerald-700" />
            <Numero rotulo="Para conferir" valor={String(resumo.conferir)} detalhe={resumo.conferir ? "comprovantes" : "nada pendente"} cor={resumo.conferir ? "text-amber-700" : "text-stone-900"} alerta={resumo.conferir > 0} />
            <Numero rotulo="Em aberto" valor={String(resumo.aberto)} detalhe={resumo.isentos ? `${resumo.isentos} ${resumo.isentos === 1 ? "isento" : "isentos"}` : "pendentes"} />
          </dl>
        </div>
      )}

      {gerenciar && participantes && (
        <div className="mb-4 md:mb-6"><ConsumoMedicina pessoas={consumo} /></div>
      )}

      {gerenciar ? (
        reuniao && <div className="mb-6"><PresencaReuniao dados={reuniao} /></div>
      ) : (
        // Quem não gerencia age por aqui: o guardião se candidata e a reunião marca presença
        <div className="space-y-6">
          {guarnicao && <Guarnicao dados={guarnicao} />}
          {reuniao && <PresencaReuniao dados={reuniao} />}
        </div>
      )}

      <div className="mt-6 hidden md:block">
        <LinksEvento
          url={`${SITE_URL}${caminhoPublico}`}
          caminho={caminhoPublico}
          bannerHref={`/admin/banners?evento=${evento.$id}`}
          nomeArquivo={`qr-${evento.ritual_numero_geral ?? evento.$id}.png`}
        />
      </div>
    </>
  );
}

/** Número da faixa do evento: rótulo pequeno, valor e detalhe; Participantes ganha a barra de ocupação. */
function Numero({ rotulo, valor, detalhe, cor = "text-stone-900", barra, alerta = false }: { rotulo: string; valor: string; detalhe: string; cor?: string; barra?: number; alerta?: boolean }) {
  return (
    <div className="min-w-0 px-4 py-3 md:px-5 md:py-2.5">
      <dt className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-stone-500 uppercase">
        {rotulo}
        {alerta && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />}
      </dt>
      <dd className={`mt-0.5 truncate text-lg leading-tight font-semibold tracking-tight tabular-nums ${cor}`}>{valor}</dd>
      {barra !== undefined && (
        <dd className="mt-1 h-1 overflow-hidden rounded-full bg-stone-100" aria-hidden>
          <span className="block h-full rounded-full bg-mata-500" style={{ width: `${barra}%` }} />
        </dd>
      )}
      <dd className="mt-0.5 truncate text-[11px] text-stone-400" title={detalhe}>{detalhe}</dd>
    </div>
  );
}

/** Grupo da equipe na faixa: cabeçalho com contagem e "Gerenciar", fotos pequenas com o primeiro nome. */
function GrupoCompacto({ titulo, Icone, cor, anel, pessoas, vagas, acao }: {
  titulo: string; Icone: typeof Crown; cor: string; anel: string; pessoas: MembroEquipe[]; vagas?: number; acao?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col md:first:pr-5 md:[&:not(:first-child)]:border-l md:[&:not(:first-child)]:border-stone-100 md:[&:not(:first-child)]:pl-5 md:max-lg:w-full md:max-lg:border-l-0! md:max-lg:pl-0! md:max-lg:pr-0!">
      <p className={`mb-1 flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase ${cor}`}>
        <Icone size={13} aria-hidden className="max-md:hidden" /> {titulo}
        <span className="rounded-full bg-stone-100 px-1.5 text-[10px] text-stone-500 tabular-nums">{pessoas.length}{vagas !== undefined ? `/${vagas}` : ""}</span>
        {acao && <span className="normal-case tracking-normal">{acao}</span>}
      </p>
      {pessoas.length ? (
        <ul className="flex min-h-0 flex-wrap gap-x-1 gap-y-1.5 overflow-hidden md:gap-x-2.5">
          {pessoas.map((p) => (
            <li key={p.id} className="flex min-w-12 flex-col items-center gap-0.5 text-center md:w-14 md:min-w-0" title={p.nome}>
              <span className="relative">
                <Avatar nome={p.nome} foto={p.foto} tamanho={46} className={`ring-2 max-md:h-11! max-md:w-11! ${anel}`} />
                {p.sexo && (
                  <span className="absolute -right-1 -bottom-1 grid h-4 w-4 place-items-center">
                    <IconeGenero genero={p.sexo} size={10} />
                  </span>
                )}
              </span>
              <span className="w-full text-[11px] leading-tight font-medium whitespace-nowrap text-stone-700 md:truncate md:text-[10px]">{p.nome.split(" ")[0]}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-stone-400">Ninguém escalado.</p>
      )}
    </div>
  );
}
