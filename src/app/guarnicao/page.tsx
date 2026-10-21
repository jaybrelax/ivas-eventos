import Link from "next/link";
import { CalendarClock, CalendarX2, Clock, History, Hourglass, MapPin, ShieldCheck, Sparkles, UserRoundPen } from "lucide-react";
import { contextoGuarnicao, rituaisComVagas, type RitualGuarnicao } from "@/lib/guarnicao-app";
import { participacoesPorMes, regrasGuarnicao } from "@/lib/guarnicao";
import { partesData } from "@/lib/format";
import { urlImagem } from "@/lib/links";
import { IconeGenero } from "@/components/genero";
import { Avatar } from "@/components/Avatar";
import type { Sexo } from "@/lib/types";
import { CabecalhoApp, Vazio, VagaLivre } from "./ui";

export const metadata = { title: "Rituais" };

/** Tela inicial do app: os próximos rituais com as vagas da guarnição. */
export default async function RituaisGuarnicao({ searchParams }: PageProps<"/guarnicao">) {
  const ctx = (await contextoGuarnicao())!;
  const { u, visao } = ctx;
  const sp = await searchParams;
  const soComVaga = sp.filtro === "vaga";
  // Só a coordenação alterna para os rituais que já aconteceram
  const anteriores = visao === "coordenador" && sp.periodo === "anteriores";
  const [rituais, { limiteMes }, porMes] = await Promise.all([
    rituaisComVagas(u.id, 120, anteriores),
    regrasGuarnicao(),
    visao === "guardiao" ? participacoesPorMes(u.id) : Promise.resolve(new Map<string, number>()),
  ]);
  const sexo = u.sexo;
  // Já atingiu o limite de participações no mês deste ritual (avisa no card, antes de tentar)
  const noLimite = (r: RitualGuarnicao) => limiteMes > 0 && !r.minha && (porMes.get(r.evento.data.slice(0, 7)) ?? 0) >= limiteMes;
  const temVagaPraMim = (r: RitualGuarnicao) => !!sexo && r.aberto && !r.minha && r.vagas[sexo] - r.confirmados[sexo] > 0 && !noLimite(r);
  const lista = visao === "guardiao" && soComVaga ? rituais.filter(temVagaPraMim) : rituais;
  const comVaga = rituais.filter(temVagaPraMim).length;

  return (
    <>
      <CabecalhoApp u={u} sobre={visao === "coordenador" ? "Coordenação" : undefined} saudacao={`Olá, ${u.nome.split(" ")[0]}`} titulo="Rituais" />

      {visao === "guardiao" && !sexo && (
        <Link href="/guarnicao/perfil" className="mx-5 mb-3 flex items-center gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
          <UserRoundPen size={20} className="shrink-0" />
          <span>Informe seu <strong>gênero</strong> no perfil para ver as vagas certas para você.</span>
        </Link>
      )}

      {visao === "coordenador" && (
        <div className="flex px-5 pt-[calc(0.25rem+5px)] pb-3">
          <Link href={anteriores ? "/guarnicao" : "/guarnicao?periodo=anteriores"} className="chip-app">
            {anteriores ? <><CalendarClock size={14} /> Ver próximos rituais</> : <><History size={14} /> Ver rituais anteriores</>}
          </Link>
        </div>
      )}

      {visao === "guardiao" && (
        <div className="flex gap-2 px-5 pt-[calc(0.25rem+5px)] pb-3">
          <Link href="/guarnicao" className={`chip-app ${!soComVaga ? "chip-app-on" : ""}`}>Todos</Link>
          <Link href="/guarnicao?filtro=vaga" className={`chip-app ${soComVaga ? "chip-app-on" : ""}`}>
            <Sparkles size={14} /> Com vaga para mim {comVaga > 0 && <span className="rounded-full bg-emerald-600 px-1.5 text-[10px] text-white tabular-nums">{comVaga}</span>}
          </Link>
        </div>
      )}

      {lista.length === 0 ? (
        <Vazio
          icone={<CalendarX2 size={26} />}
          titulo={soComVaga ? "Nenhuma vaga para você agora" : anteriores ? "Nenhum ritual anterior" : "Nenhum ritual agendado"}
          texto={soComVaga ? "Quando abrir uma vaga para o seu gênero, ela aparece aqui em destaque." : "Os próximos rituais aparecem aqui assim que forem publicados na agenda."}
        />
      ) : (
        <ul className="space-y-3 px-4">
          {lista.map((r) => (
            <li key={r.evento.$id}>
              <CartaoRitual r={r} visao={visao} sexo={sexo} vagaPraMim={temVagaPraMim(r)} passado={anteriores} limite={noLimite(r) && r.aberto ? limiteMes : null} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function CartaoRitual({ r, visao, sexo, vagaPraMim, passado = false, limite = null }: { r: RitualGuarnicao; visao: "coordenador" | "guardiao"; sexo: Sexo | null; vagaPraMim: boolean; passado?: boolean; limite?: number | null }) {
  const e = r.evento;
  const d = partesData(e.data);
  const faltam = (s: Sexo) => Math.max(0, r.vagas[s] - r.confirmados[s]);
  const completo = !faltam("masculino") && !faltam("feminino");

  return (
    <Link
      href={`/guarnicao/ritual/${e.$id}`}
      className="flex overflow-hidden rounded-3xl bg-white shadow-cartao ring-1 ring-stone-200/70 transition active:scale-[0.985]"
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
        <h2 className="line-clamp-2 text-base leading-snug font-semibold text-stone-900">{e.titulo}</h2>
        <p className="mt-1 flex min-w-0 items-center gap-1 text-xs text-stone-500">
          <Clock size={12} className="shrink-0" /> <span className="shrink-0 font-semibold text-stone-600 tabular-nums">{e.hora_inicio}</span>
          {r.local && <><MapPin size={12} className="ml-1.5 shrink-0" /> <span className="truncate">{r.local}</span></>}
        </p>

        {/* Vagas: um círculo por vaga; preenchida mostra a foto de quem está escalado */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          {(["masculino", "feminino"] as const).map((s) => {
            const meu = visao === "guardiao" && s === sexo;
            return (
              <div key={s} className="flex items-center gap-1.5">
                <IconeGenero genero={s} size={14} />
                <div className="flex items-center gap-1">
                  {Array.from({ length: r.vagas[s] }).map((_, i) => {
                    const p = r.escalados[s][i];
                    return p ? (
                      <Avatar key={p.id} nome={p.nome} foto={p.foto} tamanho={36} className="ring-2 ring-emerald-500/80" />
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
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-500">
              <Hourglass size={11} /> +{r.espera} na espera
            </span>
          )}
        </div>

        {/* Situação para quem está vendo */}
        {visao === "guardiao" ? (
          r.minha === "confirmada" ? (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800"><ShieldCheck size={14} /> Você está escalado(a)</p>
          ) : r.minha === "espera" ? (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800"><Hourglass size={14} /> Você está na espera</p>
          ) : limite ? (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-600"><CalendarClock size={13} /> Limite do mês atingido ({limite}/{limite})</p>
          ) : vagaPraMim ? (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white"><Sparkles size={13} /> Vaga para você</p>
          ) : !r.aberto ? (
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
