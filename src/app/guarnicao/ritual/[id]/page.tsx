import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarPlus, ChevronLeft, Clock, Crown, History, MapPin } from "lucide-react";
import { contextoGuarnicao } from "@/lib/guarnicao-app";
import { getDadosInstituto, getEvento, listar } from "@/lib/data";
import { TABLES } from "@/lib/config";
import { Query } from "node-appwrite";
import type { Candidatura } from "@/lib/types";
import { participacoesPorMes, regrasGuarnicao, temGuarnicao } from "@/lib/guarnicao";
import { listarEquipe, mapaUsuarios } from "@/lib/usuarios";
import { dataPorExtenso } from "@/lib/format";
import { urlImagem } from "@/lib/links";
import { Avatar } from "@/components/Avatar";
import { IconeGenero } from "@/components/genero";
import { dadosGuarnicao } from "@/app/admin/eventos/guarnicao-dados";
import type { Sexo } from "@/lib/types";
import { AcaoGuardiao } from "./AcaoGuardiao";
import { VagaLivre } from "../../ui";
import { PainelEscala } from "./PainelEscala";

export const metadata = { title: "Ritual" };

/** Detalhe do ritual no app: dados, quem está escalado e a ação de cada perfil. */
export default async function RitualGuarnicao({ params }: PageProps<"/guarnicao/ritual/[id]">) {
  const { id } = await params;
  const { u, visao } = (await contextoGuarnicao(`/guarnicao/ritual/${id}`))!;
  const [evento, { tipos, enderecos }, equipe] = await Promise.all([getEvento(id), getDadosInstituto(), listarEquipe()]);
  const tipo = evento ? tipos.find((t) => t.$id === evento.tipo_id) : undefined;
  if (!evento || !temGuarnicao(tipo)) notFound();

  const coord = visao === "coordenador";
  const g = await dadosGuarnicao(evento, { id: u.id, funcaoRitual: u.funcaoRitual, sexo: u.sexo }, coord);
  // Coordenação: tudo o que mudou na guarnição deste ritual (quem entrou, saiu, foi retirado e por quem)
  const [historico, usuarios] = coord
    ? await Promise.all([listar<Candidatura>(TABLES.candidaturas, [Query.equal("evento_id", evento.$id)]), mapaUsuarios()])
    : [[] as Candidatura[], new Map()];
  const end = evento.endereco_id ? enderecos.find((e) => e.$id === evento.endereco_id) : undefined;
  const mestres = (evento.mestres ?? []).map((m) => equipe.find((p) => p.$id === m)).filter(Boolean);
  const sexo = u.sexo;
  const temVaga = !!sexo && g.vagas[sexo] - g.confirmados[sexo].length > 0;
  const [{ limiteMes }, porMes] = await Promise.all([regrasGuarnicao(), participacoesPorMes(u.id)]);
  const usadasNoMes = porMes.get(evento.data.slice(0, 7)) ?? 0;
  const bloqueio = !sexo
    ? "Informe seu gênero no Perfil"
    : g.jaComecou
      ? "Este ritual já começou"
      : !g.abertas
        ? "Candidaturas fechadas"
        : !g.eu.situacao && limiteMes > 0 && usadasNoMes >= limiteMes
          ? `Limite do mês atingido (${usadasNoMes}/${limiteMes})`
          : null;

  return (
    <div className={coord ? "pb-6" : "pb-32"}>
      {/* Capa */}
      <div className="relative -mb-px h-64 overflow-hidden bg-stone-50">
        {evento.capa_file_id && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={urlImagem(evento.capa_file_id, 960)} alt="" fetchPriority="high" className="absolute inset-0 h-full w-full object-cover opacity-80" />
        )}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-stone-50 from-0% to-transparent to-50%" />
        <Link href="/guarnicao" aria-label="Voltar" className="absolute top-[calc(0.75rem+env(safe-area-inset-top))] left-4 grid h-10 w-10 place-items-center rounded-full bg-black/35 text-white ring-1 ring-white/30 backdrop-blur-md active:scale-90">
          <ChevronLeft size={22} />
        </Link>
        {/* Sobe o título para ficar acima do card que flutua sobre a capa */}
        <div className="absolute inset-x-0 bottom-12 px-5 pt-5 pb-3 text-stone-950">
          <h1 className="text-xl leading-tight font-bold">{evento.titulo}</h1>
        </div>
      </div>

      {/* Quando e onde */}
      <section className="relative z-10 -mt-12 px-4">
        <div className="grid grid-cols-1 gap-3 rounded-3xl bg-white/60 p-5 shadow-[0_8px_30px_-12px_rgb(0_0_0/0.25)] ring-1 ring-white/70 backdrop-blur-xl backdrop-saturate-150">
          <p className="flex items-center gap-2.5 text-sm text-stone-700">
            <Clock size={17} className="shrink-0 text-emerald-700" />
            <span className="first-letter:uppercase">{dataPorExtenso(evento.data)}</span> · {evento.hora_inicio}
          </p>
          <p className="flex min-w-0 items-center gap-2.5 text-sm text-stone-700">
            <MapPin size={17} className="shrink-0 text-emerald-700" />
            <span className="min-w-0 flex-1 truncate">{end ? `${end.apelido} — ${end.endereco}` : evento.endereco_livre}</span>
          </p>
          {mestres.length > 0 && (
            <div className="border-t border-stone-200/70 pt-3">
              <p className="flex items-center gap-2 text-xs font-semibold tracking-wider text-stone-500 uppercase">
                <Crown size={14} className="text-emerald-700" /> {mestres.length > 1 ? "Mestres" : "Mestre"}
              </p>
              {/* Todos na mesma linha: foto em cima, nome embaixo */}
              <div className="mt-2.5 flex flex-nowrap gap-2 overflow-x-auto pb-0.5">
                {mestres.map((m) => (
                  <div key={m!.$id} className="flex w-16 shrink-0 flex-col items-center gap-1 text-center">
                    <Avatar nome={m!.nome} foto={m!.foto} tamanho={44} className="ring-2 ring-ouro-300" />
                    <span className="w-full truncate text-xs font-medium text-stone-700">{m!.nome.split(" ")[0]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Guardião escalado: levar o ritual para a agenda do celular */}
      {!coord && g.eu.situacao === "confirmada" && (
        <div className="mt-4 px-5">
          <a href={`/guarnicao/ritual/${evento.$id}/agenda`} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-white px-4 text-sm font-semibold text-emerald-700 shadow-cartao ring-1 ring-stone-200/70 active:scale-[0.98]">
            <CalendarPlus size={17} /> Adicionar à minha agenda
          </a>
        </div>
      )}

      {/* Guarnição */}
      <section className="mt-5 px-5">
        <h2 className="mb-3 text-lg font-semibold text-stone-900">Guarnição do ritual{evento.ritual_numero_geral ? ` Nº ${evento.ritual_numero_geral}` : ""}</h2>
        {coord ? (
          <PainelEscala eventoId={evento.$id} vagas={g.vagas} abertas={g.abertas} confirmados={g.confirmados} espera={g.espera} disponiveis={g.disponiveis} />
        ) : (
          // Com até 2 vagas por gênero, os dois cartões ficam lado a lado
          <div className={`grid gap-3 ${g.vagas.masculino <= 2 && g.vagas.feminino <= 2 ? "grid-cols-2" : ""}`}>
            {(["masculino", "feminino"] as Sexo[]).map((s) => (
              <div key={s} className={`rounded-3xl bg-white p-4 shadow-cartao ring-1 ${s === sexo ? "ring-emerald-300" : "ring-stone-200/70"}`}>
                <p className="flex items-center gap-1.5 text-sm font-semibold text-stone-900">
                  <IconeGenero genero={s} size={15} /> {s === "masculino" ? "Guardiões" : "Guardiãs"}
                  <span className="font-medium text-stone-500 tabular-nums">· {g.confirmados[s].length}/{g.vagas[s]}</span>
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {g.confirmados[s].map((p) => (
                    <div key={p.id} className="flex w-14 flex-col items-center gap-1 text-center">
                      <Avatar nome={p.nome} foto={p.foto} tamanho={48} />
                      <span className="w-full truncate text-xs font-medium text-stone-700">{p.nome.split(" ")[0]}</span>
                    </div>
                  ))}
                  {Array.from({ length: Math.max(0, g.vagas[s] - g.confirmados[s].length) }).map((_, i) => (
                    <div key={`v${i}`} className="flex w-14 flex-col items-center gap-1 text-center">
                      <VagaLivre tamanho={48} texto="vaga" destaque={s === sexo && temVaga && !bloqueio && i === 0} />
                      <span className="text-[11px] text-stone-400">livre</span>
                    </div>
                  ))}
                </div>
                {g.espera[s].length > 0 && <p className="mt-2 text-xs text-amber-700">{g.espera[s].length} na lista de espera</p>}
              </div>
            ))}
          </div>
        )}
      </section>

      {coord && historico.length > 0 && (
        <section className="mt-5 px-5">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-stone-900"><History size={18} className="text-emerald-700" /> Histórico de alterações</h2>
          <ol className="space-y-0.5 rounded-3xl bg-white p-3 shadow-cartao ring-1 ring-stone-200/70">
            {[...historico].sort((a, b) => b.$updatedAt.localeCompare(a.$updatedAt)).slice(0, 30).map((c) => {
              const pessoa = usuarios.get(c.usuario_id)?.nome ?? "Guardião";
              const por = c.alterado_por && c.alterado_por !== c.usuario_id ? usuarios.get(c.alterado_por)?.nome?.split(" ")[0] : null;
              const acao = { confirmada: "confirmado(a)", espera: "na lista de espera", cancelada: "cancelou", removida: "retirado(a)" }[c.situacao];
              const quando = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(c.$updatedAt)).replace(",", " às");
              return (
                <li key={c.$id} className="flex items-start gap-3 rounded-2xl px-2 py-2">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${c.situacao === "confirmada" ? "bg-emerald-500" : c.situacao === "espera" ? "bg-amber-500" : "bg-stone-400"}`} />
                  <span className="min-w-0 flex-1 text-sm text-stone-700">
                    <strong className="font-semibold text-stone-900">{pessoa.split(" ")[0]}</strong> {acao}
                    {por && <span className="text-stone-500"> · por {por}</span>}
                  </span>
                  <span className="shrink-0 text-xs text-stone-400 tabular-nums">{quando}</span>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {!coord && (
        <AcaoGuardiao
          eventoId={evento.$id}
          situacao={g.eu.situacao}
          posicaoEspera={g.eu.posicaoEspera}
          bloqueio={bloqueio}
          prazoPassou={g.prazoPassou}
          prazoTexto={g.prazoTexto}
          temVaga={temVaga}
          sexo={sexo}
        />
      )}
    </div>
  );
}
