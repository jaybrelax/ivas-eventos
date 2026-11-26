import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, ChevronRight, CircleDollarSign, Clock, Crown, ExternalLink, Hash, MapPin, Pencil, Shield } from "lucide-react";
import { CabecalhoAba } from "./CabecalhoAba";
import type { Sexo } from "@/lib/types";
import { exigir, pode } from "@/lib/auth";
import { PODE } from "@/lib/config";
import { getDadosInstituto, getEvento } from "@/lib/data";
import { contatosDeUsuarios, listarEquipe } from "@/lib/usuarios";
import { dataPorExtenso, formatarIdRitual, partesData } from "@/lib/format";
import { urlImagem, urlPublicaEvento } from "@/lib/links";
import { SITE_URL } from "@/lib/site";
import { podeGerenciarEvento, podeIsentarContribuicao } from "@/lib/gestao-evento";
import { AtualizarAoVivo } from "./AtualizarAoVivo";
import { ConsumoMedicina, type ConsumoPessoa } from "./ConsumoMedicina";
import { AbasEvento, ID_PAGINA_EVENTO } from "./AbasEvento";
import { CentralEvento } from "./CentralEvento";
import { dadosCentral } from "./central-dados";
import { resumoDepoimentos } from "@/lib/depoimentos";
import { DepoimentosRitual } from "@/components/DepoimentosRitual";
import { Suspense } from "react";
import { guardioesDoEvento, podeVerCentral } from "@/lib/central";
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
import { ListaPresenca, type PessoaPresenca } from "./ListaPresenca";
import { MenuEquipeCard, MenuEquipeMobile } from "./GerenciarEquipe";

type MembroEquipe = { id: string; nome: string; foto: string | null; sexo: Sexo | null };

/** Superfície dos cards a partir do tablet: vidro claro, cantos generosos, borda e sombra suaves. */
const SUPERFICIE = "md:rounded-[22px] md:border-white/70 md:bg-white/75 md:shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_32px_-14px_rgb(20_42_29/0.2)] md:ring-1 md:ring-black/[0.04] md:backdrop-blur-2xl md:backdrop-saturate-[1.8]";

async function DepoimentosRitualLazy({ eventoId }: { eventoId: string }) {
  const resumo = await resumoDepoimentos(eventoId);
  return <DepoimentosRitual resumo={resumo} />;
}

/**
 * Visualização do evento para a equipe, numa página só: capa com data e local, estatísticas
 * (coordenação), a equipe em destaque, a lista de presença com todos juntos (mestres, guardiões e
 * participantes) e, para a coordenação, a gestão de inscrições e guarnição. Textos públicos
 * (descrição, como participar, contribuição) ficam na página pública. Editar fica em /editar.
 */
export default async function VerEvento({ params, searchParams }: PageProps<"/admin/eventos/[id]">) {
  const sessao = await exigir();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [evento, { tipos, enderecos, instituto, pix }, equipe] = await Promise.all([getEvento(id), getDadosInstituto(), listarEquipe()]);
  if (!evento) notFound();

  const u = sessao;
  const editor = podeGerenciarEvento(u, evento);
  const gerenciar = editor;
  const tipo = tipos.find((t) => t.$id === evento.tipo_id);
  const reuniaoTipo = ehReuniao(tipo);
  const [guarnicao, reuniao, participantes, guardioesDoRitual] = await Promise.all([
    temGuarnicao(tipo) ? dadosGuarnicao(evento, u, gerenciar) : null,
    reuniaoTipo ? dadosReuniao(evento, u.id, true) : null,
    dadosParticipantes(evento, tipo, instituto.valor_contribuicao, gerenciar, { estado: instituto.estado, cidade: instituto.cidade }, podeIsentarContribuicao(u, evento), pix.find((c) => c.padrao) ?? pix[0] ?? null),
    gerenciar ? [] : guardioesDoEvento(evento),
  ]);
  // A Central nesta área é acessível apenas a admin e coordenação.
  const central = gerenciar || podeVerCentral(u, evento, guardioesDoRitual) ? await dadosCentral(evento, u, gerenciar) : null;
  const podeLerDepoimentos = u.perfil === "admin" || u.perfil === "coordenador";
  const abaCentral = central && {
    id: "central", rotulo: "Central", icone: "central" as const, detalheSempre: true,
    // Total de registros da Central (todos os tipos)
    detalhe: central.posts.length ? String(central.posts.length) : undefined,
    painel: <CentralEvento eventoId={evento.$id} dados={central} />,
  };
  const abaAvaliacoes = gerenciar && podeLerDepoimentos ? {
    id: "avaliacoes", rotulo: "Avaliações", icone: "avaliacoes" as const,
    painel: <Suspense fallback={<div className="m-4 h-32 animate-pulse rounded-2xl bg-stone-100" aria-label="Carregando avaliações" />}><DepoimentosRitualLazy eventoId={evento.$id} /></Suspense>,
  } : null;
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

  // Contato do guardião (card de informações no modal de dosagem): só para quem gerencia o evento
  const contatosEquipe = gerenciar ? await contatosDeUsuarios([...mestres, ...guardioes].map((m) => m.id)) : new Map();
  const membros: MembroLista[] = [
    ...mestres.map((p) => ({ id: p.id, nome: p.nome, foto: p.foto, sexo: p.sexo, first: !!pessoaDaEquipe.get(p.id)?.first, papel: "mestre" as const })),
    ...guardioes.filter((g) => !mestres.some((m) => m.id === g.id)).map((p) => ({ id: p.id, nome: p.nome, foto: p.foto, sexo: p.sexo, first: !!pessoaDaEquipe.get(p.id)?.first, papel: "guardiao" as const })),
  ];
  membros.forEach((m) => { m.contato = contatosEquipe.get(m.id) ?? null; });
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
  const totalMl = consumo.reduce((t, p) => t + p.doses.reduce((x, d) => x + d.ml, 0), 0);
  const data = partesData(evento.data);
  const resumo = participantes?.temContribuicao ? resumoContribuicoes(participantes) : null;

  // Números (participantes e contribuições): no celular ficam na aba Financeiro; no computador, acima das abas
  const numeros = temNumeros && participantes && resumo ? (
    <dl className={`cartao grid grid-cols-2 overflow-hidden p-0 max-sm:[&>*]:border-stone-100 max-sm:[&>*:nth-child(-n+2)]:border-b max-sm:[&>*:nth-child(odd)]:border-r sm:grid-cols-4 sm:divide-x sm:divide-stone-100 sm:p-0 md:divide-black/[0.05] md:py-1 ${SUPERFICIE}`}>
      <Numero rotulo="Recebido" valor={resumo.recebido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} detalhe={`${resumo.pagos} ${resumo.pagos === 1 ? "confirmada" : "confirmadas"}`} cor="text-emerald-700" />
      <Numero rotulo="Para conferir" valor={String(resumo.conferir)} detalhe={resumo.conferir ? "comprovantes" : "nada pendente"} cor={resumo.conferir ? "text-amber-700" : "text-stone-900"} alerta={resumo.conferir > 0} />
      <Numero rotulo="Em aberto" valor={String(resumo.aberto)} detalhe={resumo.isentos ? `${resumo.isentos} ${resumo.isentos === 1 ? "isento" : "isentos"}` : "pendentes"} />
      <Numero rotulo="Pacotes" valor={String(resumo.pacotes)} detalhe={resumo.pacotes === 1 ? "pacote usado" : "pacotes usados"} cor={resumo.pacotes ? "text-violet-700" : "text-stone-900"} />
    </dl>
  ) : null;
  // Gestão do evento: abas (no celular, menu no rodapé). A aba aberta no carregamento vem do `?aba=`.
  const comAbas = gerenciar && !!participantes;
  const abaInicial = ["lista", "consumo", "central", "avaliacoes", "financeiro"].includes(um(sp.aba) ?? "") ? um(sp.aba)! : "lista";

  return (
    <>
      <AtualizarAoVivo />
      {/* Mobile: a capa do evento ao fundo, atrás da capa e da data, desbotando para a cor da página */}
      {evento.capa_file_id && (
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[23rem] overflow-hidden md:h-[27rem]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={urlImagem(evento.capa_file_id, 640)} alt="" className="h-full w-full scale-110 object-cover blur-md" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-b from-transparent via-fundo/80 to-fundo" />
        </div>
      )}
      {/* Largura máxima de 720 px (o fundo desfocado fica fora, de ponta a ponta) */}
      {/* `data-aba`: a aba aberta (o AbasEvento atualiza); no celular, fora de Participantes o cabeçalho fica compacto */}
      <div id={ID_PAGINA_EVENTO} data-aba={comAbas ? abaInicial : undefined} className={`mx-auto w-full max-w-[720px] ${comAbas ? "max-md:pb-24" : ""}`}>
      <div className="mb-1 flex items-center justify-between gap-3 md:mt-0 md:mb-5">
        <Link href={`/admin/eventos?mes=${evento.data.slice(0, 7)}`} className={`inline-flex min-h-11 items-center gap-2 text-base font-semibold tracking-[0.12em] uppercase md:min-h-0 md:gap-1.5 md:text-xs md:tracking-[0.14em] ${evento.capa_file_id ? "text-white drop-shadow" : "text-ouro-600"}`}>
          <ArrowLeft size={18} className="md:size-[13px]" /> Voltar
        </Link>
        <MenuEventoMobile url={`${SITE_URL}${caminhoPublico}`} caminho={caminhoPublico} titulo={evento.titulo} resumo={{ capaFileId: evento.capa_file_id ?? null, data: `${dataPorExtenso(evento.data)} · ${evento.hora_inicio}`, numeros: formatarIdRitual(evento.ritual_numero_geral, evento.ritual_ano, evento.ritual_numero_ano), gestaoUrl: `${SITE_URL}/admin/eventos/${evento.$id}` }} claro={!!evento.capa_file_id} editarHref={editor ? `/admin/eventos/${evento.$id}/editar` : undefined} />
        <div className="hidden flex-wrap items-center gap-2 md:flex">
          <Link href={caminhoPublico} target="_blank" rel="noopener noreferrer" className="btn-secundario rounded-full! border-white/70! bg-white/75! backdrop-blur-xl"><ExternalLink size={15} /> Ver público</Link>
          {editor && <Link href={`/admin/eventos/${evento.$id}/editar`} className="btn-primario rounded-full!"><Pencil size={15} /> Editar evento</Link>}
        </div>
      </div>
      {um(sp.ok) === "salvo" && <div className="mb-5"><Aviso tipo="ok">Evento salvo com sucesso.</Aviso></div>}

      {/* Faixa do evento: capa (sem nada por cima) e, ao lado, tudo na altura dela: quando/onde, números e equipe */}
      <section className="mb-3 grid grid-cols-2 gap-3 md:mb-4 md:gap-4 md:grid-cols-[15rem_minmax(0,1fr)]">
        {/* Celular: ao trocar para Consumo/Central/Financeiro, capa e data encolhem e somem com suavidade (a linha recolhe) enquanto a miniatura aparece ao lado do título */}
        <div className="col-span-2 grid grid-rows-[1fr] transition-[grid-template-rows,opacity,margin] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none in-data-[aba=consumo]:-mb-3 in-data-[aba=consumo]:grid-rows-[0fr] in-data-[aba=consumo]:opacity-0 in-data-[aba=central]:-mb-3 in-data-[aba=central]:grid-rows-[0fr] in-data-[aba=central]:opacity-0 in-data-[aba=financeiro]:-mb-3 in-data-[aba=financeiro]:grid-rows-[0fr] in-data-[aba=financeiro]:opacity-0 md:contents">
        <div className="-mx-6 -mt-2 -mb-10 grid min-h-0 grid-cols-2 gap-3 overflow-hidden px-6 pt-2 pb-10 md:contents">
        <div className="relative aspect-square origin-top-left overflow-hidden rounded-2xl bg-mata-950 shadow-elevado max-md:transition-transform max-md:duration-500 max-md:ease-[cubic-bezier(0.32,0.72,0,1)] max-md:in-data-[aba=consumo]:scale-[0.28] max-md:in-data-[aba=central]:scale-[0.28] max-md:in-data-[aba=financeiro]:scale-[0.28] motion-reduce:transition-none md:rounded-[22px] md:shadow-[0_2px_4px_rgb(0_0_0/0.06),0_18px_40px_-14px_rgb(20_42_29/0.4)] md:ring-1 md:ring-black/[0.06]">
          {evento.capa_file_id ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={urlImagem(evento.capa_file_id, 640)} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-mata-700 via-mata-900 to-mata-950" />
          )}
        </div>

        {/* Mobile: ao lado da capa, data em destaque, local e numeração do ritual */}
        <div className="vidro vidro-evento-entrada flex flex-col overflow-hidden rounded-2xl md:hidden">
          <div className="flex flex-1 flex-col justify-center px-3 py-2.5 text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.3)]">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-mata-100 uppercase">{data.diaSemana}</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-[52px] leading-[0.9] font-bold tracking-tight tabular-nums">{data.dia}</span>
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
        </div>
        </div>

        <div className={`cartao col-span-2 flex min-w-0 flex-col overflow-hidden p-0 sm:p-0 max-md:border-0! max-md:bg-transparent! max-md:shadow-none! max-md:backdrop-blur-none! md:col-span-1 md:justify-between md:divide-y-0 ${SUPERFICIE}`}>
          {/* Título; a partir do tablet, a data fica à esquerda dele e horário e local logo abaixo */}
          <div className="flex items-center gap-3 px-4 pt-3.5 pb-3 max-md:px-1! max-md:pt-1! max-md:pb-1! in-data-[aba=consumo]:py-2.5 in-data-[aba=central]:py-2.5 in-data-[aba=financeiro]:py-2.5 in-data-[aba=consumo]:pl-2.5 in-data-[aba=central]:pl-2.5 in-data-[aba=financeiro]:pl-2.5 md:flex-wrap md:items-start md:gap-x-4 md:gap-y-3.5 md:px-6! md:pt-5! md:pb-0!">
            {/* Celular, fora de Participantes: a capa vira uma miniatura ao lado do título */}
            <span aria-hidden className="block h-12 w-0 -mr-3 shrink-0 scale-50 overflow-hidden rounded-xl bg-mata-900 opacity-0 ring-1 ring-black/[0.06] transition-all delay-100 duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none in-data-[aba=consumo]:mr-0 in-data-[aba=consumo]:w-12 in-data-[aba=consumo]:scale-100 in-data-[aba=consumo]:opacity-100 in-data-[aba=central]:mr-0 in-data-[aba=central]:w-12 in-data-[aba=central]:scale-100 in-data-[aba=central]:opacity-100 in-data-[aba=financeiro]:mr-0 in-data-[aba=financeiro]:w-12 in-data-[aba=financeiro]:scale-100 in-data-[aba=financeiro]:opacity-100 md:hidden!">
              {evento.capa_file_id && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={urlImagem(evento.capa_file_id, 128)} alt="" className="h-full w-full object-cover" />
              )}
            </span>
            {/* Data como ícone de calendário */}
            <div className="hidden w-[68px] shrink-0 overflow-hidden rounded-lg bg-white text-center shadow-[0_1px_2px_rgb(0_0_0/0.06)] ring-1 ring-black/[0.06] md:block">
              <p className="bg-mata-600 py-1 text-[10px] font-semibold tracking-[0.14em] text-white uppercase">{data.diaSemana.split("-")[0].slice(0, 3)}</p>
              <p className="pt-1 text-[32px] leading-none font-extrabold tracking-tight text-stone-900 tabular-nums">{data.dia}</p>
              <p className="pt-0.5 pb-1.5 text-[10px] font-medium tracking-[0.12em] text-stone-400 uppercase">{data.mesCurto}</p>
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="min-w-0 line-clamp-3 font-display text-[22px] leading-[1.15] font-semibold text-stone-900 transition-[font-size,color] duration-500 motion-reduce:transition-none max-md:in-data-[aba=consumo]:text-white max-md:in-data-[aba=consumo]:[text-shadow:0_1px_4px_rgb(0_0_0/0.45)] max-md:in-data-[aba=central]:text-white max-md:in-data-[aba=central]:[text-shadow:0_1px_4px_rgb(0_0_0/0.45)] max-md:in-data-[aba=financeiro]:text-white max-md:in-data-[aba=financeiro]:[text-shadow:0_1px_4px_rgb(0_0_0/0.45)] in-data-[aba=consumo]:text-lg in-data-[aba=central]:text-lg in-data-[aba=financeiro]:text-lg md:text-[26px]! md:leading-[1.1] md:tracking-[-0.015em]" title={evento.titulo}>{evento.titulo}</h1>
            </div>
            {/* Horário e local: na linha de baixo, abaixo do card da data */}
            <p className="hidden basis-full flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-stone-700 md:flex">
              <span className="inline-flex items-center gap-2">
                <Clock size={16} className="shrink-0 text-mata-600" aria-hidden />
                <span className="capitalize">{data.diaSemana}</span>
                <span className="font-semibold text-stone-900 tabular-nums">{evento.hora_inicio}</span>
              </span>
              <span className="inline-flex min-w-0 items-center gap-2">
                <MapPin size={16} className="shrink-0 text-ouro-600" aria-hidden />
                {end?.link_maps ? (
                  <a href={end.link_maps} target="_blank" rel="noopener noreferrer" title={end.endereco} className="group inline-flex min-w-0 items-center gap-0.5 font-medium text-stone-900 transition-colors hover:text-mata-700">
                    <span className="truncate">{end.apelido}</span>
                    <ChevronRight size={15} className="shrink-0 text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-mata-500" aria-hidden />
                  </a>
                ) : (
                  <span className="min-w-0 truncate font-medium text-stone-900" title={end?.endereco}>{end ? end.apelido : (evento.endereco_livre || "Local a definir")}</span>
                )}
              </span>
            </p>
          </div>

          {/* Numeração do ritual: dois cards iguais, o geral em destaque e o do ano ao lado */}
          <div className="hidden md:block">
            <div aria-hidden className="mx-6 h-px bg-gradient-to-r from-transparent via-stone-900/15 to-transparent" />
            {(evento.ritual_numero_geral || evento.ritual_numero_ano) && (
              <dl className="grid grid-cols-2 divide-x divide-stone-900/10 px-6 pt-4 pb-5">
                <div className="flex items-center justify-center gap-2 px-4 py-2">
                  <dt className="sr-only">Número geral do ritual</dt>
                  <dd className="inline-flex items-center gap-2 text-[15px] font-semibold text-mata-800 tabular-nums"><Hash size={16} className="text-mata-500" aria-hidden /> Ritual N° {evento.ritual_numero_geral ?? "–"}</dd>
                </div>
                <div className="flex items-center justify-center gap-2 px-4 py-2">
                  <dt className="sr-only">Número do ritual no ano</dt>
                  <dd className="inline-flex items-center gap-2 text-[15px] font-semibold text-stone-800 tabular-nums"><CalendarDays size={16} className="text-stone-400" aria-hidden /> {evento.ritual_numero_ano ?? "–"}° de {evento.ritual_ano ?? data.ano}</dd>
                </div>
              </dl>
            )}
          </div>
        </div>
      </section>

      {/* Equipe do ritual: mestres e guardiões numa linha só, em card próprio (a partir do tablet) */}
      {temEquipe && (
        <div className={`cartao mb-3 hidden p-0 md:mb-4 md:block ${SUPERFICIE}`}>
          {/* Título e engrenagem de gerenciar (fora da área rolável, para o menu não ser cortado) */}
          <div className="flex items-center justify-between gap-3 px-6 pt-4">
            <h2 className="text-sm font-semibold text-stone-900">Equipe do Ritual</h2>
            {editor && <MenuEquipeCard mestres={{ eventoId: evento.$id, equipe: equipe.filter((p) => !p.mock), inicial: evento.mestres ?? [] }} guarnicao={guarnicao} />}
          </div>
          <div className="flex items-start overflow-x-auto px-6 pt-3 pb-4">
            <GrupoCompacto titulo="Mestres" Icone={Crown} cor="text-mata-700" anel="ring-mata-300" pessoas={mestres} />
            {(guarnicao || reuniaoTipo || guardioes.length > 0) && (
              <GrupoCompacto
                titulo="Guardiões" Icone={Shield} cor="text-sky-700" anel="ring-sky-300" pessoas={guardioes}
                vagas={guarnicao ? guarnicao.vagas.masculino + guarnicao.vagas.feminino : undefined}
              />
            )}
          </div>
        </div>
      )}

      {/* Com abas, os números ficam na aba Financeiro */}
      {numeros && !comAbas && <div className="mb-3 md:mb-4">{numeros}</div>}

      {gerenciar && participantes ? (
        <div className="mb-3 md:mb-4">
          <AbasEvento
            inicial={um(sp.aba)}
            abas={[
              { id: "lista", rotulo: "Participantes", icone: "lista", detalhe: String(participantes.confirmados.length + membros.filter((m) => !participantes.confirmados.some((c) => c.id === m.id)).length), painel: (
                <div>
        {participantes ? (
          <Participantes
            dados={{ ...participantes, linkPerfil: pode(u, PODE.editarEventos) }} semResumo embutido equipe={membros} guardioes={guardioesGerais} titulo="Lista de presença"
            acoes={gerenciar ? (
              <MenuEquipeMobile
                mestres={{ eventoId: evento.$id, equipe: equipe.filter((p) => !p.mock), inicial: evento.mestres ?? [] }}
                guarnicao={guarnicao}
              />
            ) : undefined}
          />
        ) : (
          <ListaPresenca pessoas={presenca} espera={0} vagas={null} linkFicha={editor} />
        )}
                </div>
              ) },
              { id: "consumo", rotulo: "Consumo", icone: "consumo", detalhe: totalMl ? `${totalMl} ml` : undefined, painel: <ConsumoMedicina pessoas={consumo} embutido /> },
              ...(abaCentral ? [abaCentral] : []),
              ...(abaAvaliacoes ? [abaAvaliacoes] : []),
              ...(numeros ? [{ id: "financeiro", rotulo: "Financeiro", icone: "financeiro" as const, painel: (
                <div>
                  <CabecalhoAba
                    Icone={CircleDollarSign}
                    titulo="Contribuições"
                    resumo={resumo ? `${resumo.pagos} de ${participantes.confirmados.length} confirmadas · ${resumo.recebido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}` : undefined}
                    fundo="linear-gradient(180deg, #2f9e6e 0%, #0f4a33 100%)"
                    className="px-3 pt-2.5 pb-1 sm:px-4 md:px-5 md:pt-4"
                  />
                  <div className="p-2 pt-1 sm:p-4 sm:pt-2 md:p-5 md:pt-3 md:pb-0 [&>dl]:border-0! [&>dl]:bg-transparent! [&>dl]:shadow-none! [&>dl]:ring-0! [&>dl]:backdrop-blur-none!">{numeros}</div>
                  {/* Só os inscritos (sem a equipe do ritual), com a contribuição de cada um no lugar das doses */}
                  <Participantes dados={{ ...participantes, linkPerfil: pode(u, PODE.editarEventos) }} semResumo embutido financeiro guardioes={guardioesGerais} titulo="Participantes" />
                </div>
              ) }] : []),
            ]}
          />
        </div>
      ) : (
      <div className="mb-3 md:mb-4">
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
          <ListaPresenca pessoas={presenca} espera={0} vagas={null} linkFicha={editor} />
        )}
      </div>
      )}

      {/* Guardião do ritual (sem gestão do evento): a Central num card próprio, logo abaixo da lista */}
      {!(gerenciar && participantes) && abaCentral && (
        <div className="mb-3 md:mb-4">
          <AbasEvento inicial={um(sp.aba)} abas={[abaCentral]} />
        </div>
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

      </div>
    </>
  );
}

/** Número da faixa do evento: rótulo pequeno, valor e detalhe; Participantes ganha a barra de ocupação. */
function Numero({ rotulo, valor, detalhe, cor = "text-stone-900", barra, alerta = false }: { rotulo: string; valor: string; detalhe: string; cor?: string; barra?: number; alerta?: boolean }) {
  return (
    <div className="min-w-0 px-3 py-2.5 md:px-5 md:py-3">
      <dt className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-stone-500 uppercase md:text-xs md:tracking-normal md:normal-case">
        {rotulo}
        {alerta && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />}
      </dt>
      <dd className={`mt-0.5 truncate text-lg leading-tight font-semibold tracking-tight tabular-nums md:mt-1 md:text-[22px] md:tracking-[-0.02em] ${cor}`}>{valor}</dd>
      {barra !== undefined && (
        <dd className="mt-1 h-1 overflow-hidden rounded-full bg-stone-100 md:mt-1.5 md:bg-stone-900/[0.06]" aria-hidden>
          <span className="block h-full rounded-full bg-mata-500" style={{ width: `${barra}%` }} />
        </dd>
      )}
      <dd className="mt-0.5 truncate text-[11px] text-stone-400 md:mt-1 md:text-xs" title={detalhe}>{detalhe}</dd>
    </div>
  );
}

/** Grupo da equipe na faixa: cabeçalho com contagem e "Gerenciar", fotos pequenas com o primeiro nome. */
function GrupoCompacto({ titulo, Icone, cor, anel, pessoas, vagas, acao }: {
  titulo: string; Icone: typeof Crown; cor: string; anel: string; pessoas: MembroEquipe[]; vagas?: number; acao?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col md:first:pr-6 md:[&:not(:first-child)]:border-l md:[&:not(:first-child)]:border-black/[0.06] md:[&:not(:first-child)]:pl-6">
      <p className={`mb-1 flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase md:mb-2.5 md:text-[13px] md:tracking-normal md:normal-case ${cor}`}>
        <Icone size={13} aria-hidden className="max-md:hidden" /> {titulo}
        <span className="rounded-full bg-stone-100 px-1.5 text-[10px] text-stone-500 tabular-nums md:bg-transparent md:px-0 md:text-[13px] md:font-normal md:text-stone-400">{pessoas.length}{vagas !== undefined ? `/${vagas}` : ""}</span>
        {acao && <span className="normal-case tracking-normal md:ml-1">{acao}</span>}
      </p>
      {pessoas.length ? (
        <ul className="flex min-h-0 flex-wrap gap-x-1 gap-y-1.5 overflow-hidden md:gap-x-2.5">
          {pessoas.map((p) => (
            <li key={p.id} className="flex min-w-12 flex-col items-center gap-0.5 text-center md:w-[4.25rem] md:min-w-0" title={p.nome}>
              <span className="relative">
                <Avatar nome={p.nome} foto={p.foto} tamanho={46} className={`ring-2 max-md:h-11! max-md:w-11! md:ring-white md:shadow-[0_0_0_1px_rgb(0_0_0/0.06),0_2px_6px_-2px_rgb(0_0_0/0.15)] ${anel}`} />
                {p.sexo && (
                  <span className="absolute -right-1 -bottom-1 grid h-4 w-4 place-items-center">
                    <IconeGenero genero={p.sexo} size={10} />
                  </span>
                )}
              </span>
              <span className="w-full text-xs leading-tight font-medium whitespace-nowrap text-stone-700 md:truncate md:text-[13px]">{p.nome.split(" ")[0]}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-stone-400">Ninguém escalado.</p>
      )}
    </div>
  );
}
