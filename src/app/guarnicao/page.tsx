import { urlRitualGuarnicao } from "@/lib/guarnicao-links";
import Link from "next/link";
import { CalendarClock, CalendarX2, Clock, FileText, History, Hourglass, MapPin, ShieldCheck, Sparkles, Users, UserRoundPen } from "lucide-react";
import { contextoGuarnicao, rituaisComVagas, type RitualGuarnicao } from "@/lib/guarnicao-app";
import { fimPrazoPresenca, participacoesPorMes, regrasGuarnicao } from "@/lib/guarnicao";
import { hoje, partesData } from "@/lib/format";
import { concordar } from "@/lib/genero";
import { urlImagem } from "@/lib/links";
import { IconeGenero } from "@/components/genero";
import { Avatar } from "@/components/Avatar";
import type { Sexo } from "@/lib/types";
import { AvatarEscalado, CabecalhoApp, Vazio, VagaLivre } from "./ui";
import { BuscaRituais } from "./BuscaRituais";
import { Carrossel } from "./Carrossel";
import { MaisRituais } from "./MaisRituais";
import { AreaLista, ChipFiltro, NavegacaoRituais } from "./NavegacaoRituais";

/** Quantos cards a lista mostra de cada vez; ao rolar até o fim, vêm mais `PAGINA`. */
const PAGINA = 12;

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Busca pelo tema (título) ou pelo número geral do ritual ("532", "nº 532", "ritual 532"). */
function casaBusca(r: RitualGuarnicao, q: string) {
  if (semAcento(r.evento.titulo).includes(semAcento(q))) return true;
  const numero = /^\D*\d+\D*$/.test(q) ? q.replace(/\D/g, "") : "";
  return !!numero && String(r.evento.ritual_numero_geral ?? "").startsWith(numero);
}

export const metadata = { title: "Rituais" };

/** Tela inicial do app: os próximos rituais com as vagas da guarnição. */
export default async function RituaisGuarnicao({ searchParams }: PageProps<"/guarnicao">) {
  const ctx = (await contextoGuarnicao())!;
  const { u, visao } = ctx;
  const sp = await searchParams;
  // Coordenação e guardiões alternam para os rituais que já aconteceram
  const anteriores = (visao === "coordenador" || visao === "guardiao") && sp.periodo === "anteriores";
  const soComVaga = !anteriores && !u.suspensoAte && sp.filtro === "vaga";
  // Com busca, procura nos próximos e também nos do último ano
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 60) : "";
  // Quantos cards mostrar (de 12 em 12, conforme a rolagem)
  const pedido = Number.parseInt(typeof sp.n === "string" ? sp.n : "", 10);
  const mostrar = Number.isFinite(pedido) ? Math.min(Math.max(pedido, PAGINA), 480) : PAGINA;
  // Guardião nos próximos precisa de todos para contar "com vaga para mim"; nos demais, busca só o que vai aparecer
  const limite = q || (visao === "guardiao" && !anteriores) ? undefined : mostrar + 1;
  const [rituais, { limiteMes, horasPresenca }, porMes] = await Promise.all([
    q
      ? Promise.all([rituaisComVagas(u.id, 120), rituaisComVagas(u.id, 120, true)]).then(([prox, ant]) => [...prox, ...ant].filter((r) => casaBusca(r, q)))
      : rituaisComVagas(u.id, 120, anteriores, limite),
    regrasGuarnicao(),
    visao === "guardiao" ? participacoesPorMes(u.id) : Promise.resolve(new Map<string, number>()),
  ]);
  const sexo = u.sexo;
  // Na reunião, guardiões e mestres marcam presença ou justificam a ausência
  const participaReuniao = u.funcaoRitual === "guardiao" || u.funcaoRitual === "mestre";
  // Já atingiu o limite de participações no mês deste ritual (avisa no card, antes de tentar)
  const noLimite = (r: RitualGuarnicao) => !r.reuniao && limiteMes > 0 && !r.minha && (porMes.get(r.evento.data.slice(0, 7)) ?? 0) >= limiteMes;
  const temVagaPraMim = (r: RitualGuarnicao) => !r.reuniao && !u.suspensoAte && !!sexo && r.aberto && !r.minha && r.vagas[sexo] - r.confirmados[sexo] > 0 && !noLimite(r);
  const lista = visao === "guardiao" && soComVaga ? rituais.filter(temVagaPraMim) : rituais;
  const comVaga = rituais.filter(temVagaPraMim).length;
  const visiveis = lista.slice(0, mostrar);
  const temMais = lista.length > mostrar;
  const ehPassado = (r: RitualGuarnicao) => (q ? r.evento.data < hoje() : anteriores);
  const manter: Record<string, string> = soComVaga && visao === "guardiao" ? { filtro: "vaga" } : anteriores ? { periodo: "anteriores" } : {};

  return (
    <NavegacaoRituais>
      <CabecalhoApp u={u} sobre={visao === "coordenador" ? "Coordenação" : visao === "mestre" ? "Mestre" : undefined} saudacao={`Olá, ${u.nome.split(" ")[0]}`} titulo="Rituais" />

      {visao === "guardiao" && u.suspensoAte && (
        <div className="mx-5 mb-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
          Suas candidaturas estão suspensas até {new Date(u.suspensoAte).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}. Você pode acompanhar os rituais, suas participações e estatísticas normalmente.
        </div>
      )}

      {visao === "guardiao" && !sexo && (
        <Link href="/guarnicao/perfil" className="mx-5 mb-3 flex items-center gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
          <UserRoundPen size={20} className="shrink-0" />
          <span>Informe seu <strong>gênero</strong> no perfil para ver as vagas certas para você.</span>
        </Link>
      )}

      {/* Busca à esquerda e, para a coordenação, o atalho dos rituais anteriores na mesma linha (mesma altura) */}
      <div className="flex items-center gap-2 px-5 pt-[calc(0.25rem+5px)] pb-3">
        <BuscaRituais inicial={q} manter={manter} />
        {visao === "coordenador" && (
          <ChipFiltro href={anteriores ? "/guarnicao" : "/guarnicao?periodo=anteriores"} ativo={false} className="shrink-0 whitespace-nowrap">
            {anteriores ? <><CalendarClock size={14} /> Ver próximos rituais</> : <><History size={14} /> Ver rituais anteriores</>}
          </ChipFiltro>
        )}
      </div>

      {/* Guardião: filtros num carrossel que rola de lado, como nos apps nativos */}
      {visao === "guardiao" && (
        <Carrossel rotulo="Filtros">
          <ChipFiltro href="/guarnicao" ativo={!soComVaga && !anteriores} className="shrink-0 snap-start whitespace-nowrap">
            <CalendarClock size={14} /> Próximos rituais
          </ChipFiltro>
          <ChipFiltro href="/guarnicao?periodo=anteriores" ativo={anteriores} className="shrink-0 snap-start whitespace-nowrap">
            <History size={14} /> Rituais anteriores
          </ChipFiltro>
          {!u.suspensoAte && <ChipFiltro href="/guarnicao?filtro=vaga" ativo={soComVaga} className="shrink-0 snap-start whitespace-nowrap">
            <Sparkles size={14} /> Com vaga para mim {comVaga > 0 && !anteriores && <span className="rounded-full bg-emerald-600 px-1.5 text-[10px] text-white tabular-nums">{comVaga}</span>}
          </ChipFiltro>}
        </Carrossel>
      )}

      <AreaLista>
      {lista.length === 0 ? (
        <Vazio
          icone={<CalendarX2 size={26} />}
          titulo={q ? "Nenhum ritual encontrado" : soComVaga ? "Nenhuma vaga para você agora" : anteriores ? "Nenhum ritual anterior" : "Nenhum ritual agendado"}
          texto={q ? `Nada com “${q}” no tema ou no número, entre os próximos rituais e os do último ano.` : soComVaga ? "Quando abrir uma vaga para o seu gênero, ela aparece aqui em destaque." : "Os próximos rituais aparecem aqui assim que forem publicados na agenda."}
        />
      ) : (
        <ul className="space-y-3 px-4">
          {visiveis.map((r) => (
            <li key={r.evento.$id}>
              <CartaoRitual meuId={u.id} participaReuniao={participaReuniao} horasPresenca={horasPresenca} r={r} visao={visao} sexo={sexo} vagaPraMim={temVagaPraMim(r)} passado={ehPassado(r)} limite={noLimite(r) && r.aberto ? limiteMes : null} />
            </li>
          ))}
        </ul>
      )}
      {temMais && <MaisRituais proximo={mostrar + PAGINA} />}
      </AreaLista>
    </NavegacaoRituais>
  );
}

function CartaoRitual({ meuId, participaReuniao, horasPresenca, r, visao, sexo, vagaPraMim, passado = false, limite = null }: { meuId: string; participaReuniao: boolean; horasPresenca: number; r: RitualGuarnicao; visao: "coordenador" | "guardiao" | "mestre"; sexo: Sexo | null; vagaPraMim: boolean; passado?: boolean; limite?: number | null }) {
  const e = r.evento;
  const d = partesData(e.data);
  const faltam = (s: Sexo) => Math.max(0, r.vagas[s] - r.confirmados[s]);
  const completo = !faltam("masculino") && !faltam("feminino");

  if (r.reuniao) return <CartaoReuniao r={r} participa={participaReuniao} passado={passado} horasPresenca={horasPresenca} />;

  return (
    <Link
      href={urlRitualGuarnicao(e)}
      className={`flex overflow-hidden rounded-3xl bg-white shadow-cartao transition active:scale-[0.985] ${
        // Guardião escalado neste ritual: borda coral-rosada (entre o laranja e o rosa do escudo)
        visao === "guardiao" && r.minha === "confirmada" ? "ring-2 ring-[#f8566b]" : "ring-1 ring-stone-200/70"
      }`}
    >
      {/* Coluna da esquerda: data em cima; embaixo a capa com o número do ritual sobre um degradê */}
      <div className="coluna-data flex w-[6.5rem] shrink-0 flex-col">
        <div className="flex flex-col items-center px-2 pt-3 pb-2.5 text-center">
          <span className="data-mes text-[10px] font-bold tracking-[0.22em] uppercase">{d.mesCurto}</span>
          <span className="text-[34px] leading-none font-black tabular-nums">{d.dia}</span>
          <span className="data-sem mt-1 text-[11px] font-extrabold tracking-[0.14em] uppercase">{d.diaSemana.replace("-feira", "")}</span>
        </div>
        <div className="relative isolate min-h-24 flex-1 overflow-hidden">
          {e.capa_file_id && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={urlImagem(e.capa_file_id, 320)} alt="" loading="lazy" decoding="async" className="absolute inset-0 -z-10 h-full w-full object-cover" />
          )}
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
          {e.ritual_numero_geral && (
            <div className="absolute inset-x-0 bottom-2 text-center leading-none text-white [text-shadow:0_1px_8px_rgb(0_0_0/0.6)]">
              <span className="block text-[9px] font-bold tracking-[0.2em] text-white/80 uppercase">Ritual</span>
              <span className="block text-2xl font-black tabular-nums">{e.ritual_numero_geral}</span>
            </div>
          )}
        </div>
      </div>

      <div className="min-w-0 flex-1 p-4">
        <h2 className="line-clamp-2 text-xl leading-snug font-semibold text-stone-900">{e.titulo}</h2>
        <p className="mt-1.5 flex min-w-0 items-center gap-1 text-sm text-stone-500">
          <Clock size={14} className="shrink-0" /> <span className="shrink-0 font-semibold text-stone-600 tabular-nums">{e.hora_inicio}</span>
          {r.local && <><MapPin size={14} className="ml-2 shrink-0" /> <span className="truncate">{r.local}</span></>}
        </p>

        {/* Vagas: um círculo por vaga; preenchida mostra a foto de quem está escalado */}
        <div className="mt-3 flex flex-wrap items-start gap-x-4 gap-y-2">
          {(["masculino", "feminino"] as const).map((s) => {
            const meu = visao === "guardiao" && s === sexo;
            return (
              <div key={s}>
                <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-stone-500">
                  <IconeGenero genero={s} size={14} /> {s === "masculino" ? "Guardiões" : "Guardiãs"}
                </p>
                <div className="flex items-center gap-1">
                  {Array.from({ length: r.vagas[s] }).map((_, i) => {
                    const p = r.escalados[s][i];
                    return p ? (
                      visao === "guardiao" && p.id === meuId ? (
                        <AvatarEscalado key={p.id} tamanho={36}>
                          <Avatar nome={p.nome} foto={p.foto} tamanho={36} className="ring-2 ring-[#f8566b]" />
                        </AvatarEscalado>
                      ) : (
                        <Avatar key={p.id} nome={p.nome} foto={p.foto} tamanho={36} className="ring-2 ring-emerald-500/80" />
                      )
                    ) : (
                      // O guardião só ocupa uma vaga por ritual: só a primeira livre do gênero dele recebe o destaque
                    <VagaLivre key={`v${i}`} destaque={meu && vagaPraMim && i === r.escalados[s].length} />
                    );
                  })}
                  {r.vagas[s] === 0 && <span className="text-[11px] text-stone-400">sem vagas</span>}
                </div>
              </div>
            );
          })}
          {r.espera > 0 && (
            <span className="inline-flex items-center gap-1 self-end pb-2 text-[11px] font-semibold text-stone-500">
              <Hourglass size={11} /> +{r.espera} na espera
            </span>
          )}
        </div>

        {/* Situação para quem está vendo */}
        {visao === "guardiao" ? (
          r.minha === "confirmada" ? (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#f8566b] px-2.5 py-1 text-xs font-bold text-[#1c1040] shadow-sm"><ShieldCheck size={14} /> Você está {concordar(sexo, "escalado", "escalada")}</p>
          ) : r.minha === "espera" ? (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800"><Hourglass size={14} /> Você está na espera</p>
          ) : limite ? (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-600"><CalendarClock size={13} /> Limite do mês atingido ({limite}/{limite})</p>
          ) : vagaPraMim ? (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white"><Sparkles size={13} /> Vaga para você</p>
          ) : !r.aberto && !passado ? (
            <p className="mt-3 text-xs font-medium text-stone-400">Candidaturas encerradas</p>
          ) : null
        ) : (
          <p className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${passado ? "bg-stone-100 text-stone-600" : completo ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
            {passado
              ? r.confirmados.masculino + r.confirmados.feminino === 0
                ? "Sem guardiões registrados"
                : `Serviram ${r.confirmados.masculino + r.confirmados.feminino} ${r.confirmados.masculino + r.confirmados.feminino === 1 ? "guardião" : "guardiões"}`
              : completo ? "Guarnição completa" : `Faltam ${faltam("masculino") + faltam("feminino")} na guarnição`}
          </p>
        )}
      </div>
    </Link>
  );
}

/** Reunião: sem vagas; mostra quem já marcou presença e a situação de quem está vendo. */
function CartaoReuniao({ r, participa, passado, horasPresenca }: { r: RitualGuarnicao; participa: boolean; passado: boolean; horasPresenca: number }) {
  const e = r.evento;
  const d = partesData(e.data);
  const comecou = fimPrazoPresenca(e, horasPresenca).getTime() < Date.now(); // prazo para confirmar já encerrou
  // Avatares sobrepostos: no máximo 14 círculos. Com mais de 14 presenças, o 14º mostra quantos passam disso ("+N").
  const TOTAL = 14;
  const excedem = r.presentes.length > TOTAL;
  const mostrados = excedem ? r.presentes.slice(0, TOTAL - 1) : r.presentes;
  const outros = r.presentes.length - mostrados.length;
  const itens: ({ tipo: "pessoa"; p: (typeof mostrados)[number] } | { tipo: "mais" })[] = [...mostrados.map((p) => ({ tipo: "pessoa" as const, p })), ...(excedem ? [{ tipo: "mais" as const }] : [])];
  return (
    <Link
      href={urlRitualGuarnicao(e)}
      className={`borda-animada borda-animada-grossa flex overflow-hidden rounded-3xl bg-white shadow-cartao transition active:scale-[0.985] `}
    >
      <div className="coluna-data flex w-[6.5rem] shrink-0 flex-col">
        <div className="flex flex-col items-center px-2 pt-3 pb-2.5 text-center">
          <span className="data-mes text-[10px] font-bold tracking-[0.22em] uppercase">{d.mesCurto}</span>
          <span className="text-[34px] leading-none font-black tabular-nums">{d.dia}</span>
          <span className="data-sem mt-1 text-[11px] font-extrabold tracking-[0.14em] uppercase">{d.diaSemana.replace("-feira", "")}</span>
        </div>
        <div className="relative isolate min-h-24 flex-1 overflow-hidden">
          {e.capa_file_id && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={urlImagem(e.capa_file_id, 320)} alt="" loading="lazy" decoding="async" className="absolute inset-0 -z-10 h-full w-full object-cover" />
          )}
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-2 flex flex-col items-center gap-0.5 text-white [text-shadow:0_1px_8px_rgb(0_0_0/0.6)]">
            <Users size={20} />
            <span className="text-[9px] font-bold tracking-[0.2em] text-white/80 uppercase">Reunião</span>
          </div>
        </div>
      </div>

      <div className="min-w-0 flex-1 p-4">
        <h2 className="line-clamp-2 text-xl leading-snug font-semibold text-stone-900">{e.titulo}</h2>
        <p className="mt-1.5 flex min-w-0 items-center gap-1 text-sm text-stone-500">
          <Clock size={14} className="shrink-0" /> <span className="shrink-0 font-semibold text-stone-600 tabular-nums">{e.hora_inicio}</span>
          {r.local && <><MapPin size={14} className="ml-2 shrink-0" /> <span className="truncate">{r.local}</span></>}
        </p>

        {itens.length > 0 && (
          // Até 14 círculos (13 avatares + "+N"); quebram de linha conforme a largura do card
          <>
          <p className="mt-5 mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-stone-500"><Users size={14} /> Participantes da reunião</p>
          <div className="flex flex-wrap gap-y-1" style={{ paddingLeft: 10 }} aria-label={`${r.presentes.length} ${r.presentes.length === 1 ? "confirmado" : "confirmados"}`}>
            {itens.map((it) => (
              <span key={it.tipo === "pessoa" ? it.p.id : "mais"} style={{ marginLeft: -10 }}>
                {it.tipo === "pessoa" ? (
                  <Avatar nome={it.p.nome} foto={it.p.foto} tamanho={40} leve className="ring-2 ring-fundo-card" />
                ) : (
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-emerald-600 text-sm font-bold text-white ring-2 ring-fundo-card tabular-nums">+{outros}</span>
                )}
              </span>
            ))}
          </div>
          </>
        )}
        <p className="mt-2 text-xs text-stone-500">
          <strong className="font-semibold text-stone-700 tabular-nums">{r.presentes.length}</strong> {r.presentes.length === 1 ? "confirmado" : "confirmados"}
          {r.justificados > 0 && <> · <strong className="font-semibold text-stone-700 tabular-nums">{r.justificados}</strong> {r.justificados === 1 ? "justificou" : "justificaram"}</>}
          {r.semResposta > 0 && <span className="mt-0.5 block"><strong className="font-semibold text-stone-700 tabular-nums">{r.semResposta}</strong> {r.semResposta === 1 ? "não respondeu" : "não responderam"}</span>}
        </p>

        {participa ? (
          r.minha === "confirmada" ? (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#f8566b] px-2.5 py-1 text-xs font-bold text-[#1c1040] shadow-sm"><ShieldCheck size={14} /> Presença confirmada</p>
          ) : r.minha === "justificada" ? (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800"><FileText size={14} /> Ausência justificada</p>
          ) : !passado && !comecou ? (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white"><Sparkles size={13} /> Confirme sua presença</p>
          ) : null
        ) : null}
      </div>
    </Link>
  );
}
