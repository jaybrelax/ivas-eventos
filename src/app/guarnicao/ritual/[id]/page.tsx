import { notFound, redirect } from "next/navigation";
import { urlRitualGuarnicao } from "@/lib/guarnicao-links";
import { History } from "lucide-react";
import { contextoGuarnicao } from "@/lib/guarnicao-app";
import { getDadosInstituto, getEventoPorIdOuNumero, listar } from "@/lib/data";
import { TABLES } from "@/lib/config";
import { Query } from "node-appwrite";
import type { Candidatura } from "@/lib/types";
import { ehReuniao, participacoesPorMes, regrasGuarnicao, temAppGuarnicao } from "@/lib/guarnicao";
import { dadosReuniao } from "@/lib/reuniao";
import { listarEquipe, mapaUsuarios } from "@/lib/usuarios";
import { Avatar } from "@/components/Avatar";
import { IconeGenero } from "@/components/genero";
import { dadosGuarnicao } from "@/app/admin/eventos/guarnicao-dados";
import type { Sexo } from "@/lib/types";
import { AcaoGuardiao } from "./AcaoGuardiao";
import { AcaoReuniao } from "./AcaoReuniao";
import { ListasReuniao } from "./ListasReuniao";
import { Topo } from "./Topo";
import { VagaLivre } from "../../ui";
import { PainelEscala } from "./PainelEscala";

export const metadata = { title: "Ritual" };

/** Detalhe do ritual (ou da reunião) no app: dados, quem está escalado e a ação de cada perfil. */
export default async function RitualGuarnicao({ params }: PageProps<"/guarnicao/ritual/[id]">) {
  const { id } = await params;
  const { u, visao } = (await contextoGuarnicao(`/guarnicao/ritual/${id}`))!;
  const [evento, { tipos, enderecos }, equipe] = await Promise.all([getEventoPorIdOuNumero(id), getDadosInstituto(), listarEquipe()]);
  const tipo = evento ? tipos.find((t) => t.$id === evento.tipo_id) : undefined;
  if (!evento || !temAppGuarnicao(tipo)) notFound();
  // Endereço do ritual = número geral: link antigo (com o id do evento) segue para ele
  if (evento.ritual_numero_geral && id !== String(evento.ritual_numero_geral)) redirect(urlRitualGuarnicao(evento));

  const end = evento.endereco_id ? enderecos.find((e) => e.$id === evento.endereco_id) : undefined;
  const mestres = (evento.mestres ?? []).map((m) => equipe.find((p) => p.$id === m)).filter((m) => !!m);
  const coord = visao === "coordenador";

  // A reunião tem sua equipe escalada e uma lista de presença própria deste evento.
  if (ehReuniao(tipo)) {
    const mestreDaReuniao = visao === "mestre" && (evento.mestres ?? []).includes(u.id);
    const gerenciar = coord || mestreDaReuniao;
    const r = await dadosReuniao(evento, u.id, coord, gerenciar);
    const guardioesReuniao = (evento.guardioes_escalados_reuniao ?? []).map((id) => equipe.find((p) => p.$id === id)).filter((p) => !!p);
    // Guardiões e mestres (inclusive da coordenação) marcam a própria presença ou justificam a ausência
    const participa = u.funcaoRitual === "guardiao" || u.funcaoRitual === "mestre";
    return (
      <div className={participa && !r.eu.situacao ? "pb-48" : "pb-6"}>
        <Topo evento={evento} end={end} mestres={mestres} agenda={participa && r.eu.situacao === "confirmada"} />
        <section className="mt-5 px-5">
          <h2 className="mb-3 text-lg font-semibold text-stone-900">Guardiões da reunião</h2>
          <div className="rounded-3xl bg-white p-4 shadow-cartao ring-1 ring-stone-200/70">
            {guardioesReuniao.length ? (
              <div className="flex flex-wrap gap-4">
                {guardioesReuniao.map((p) => (
                  <div key={p.$id} className="flex w-16 flex-col items-center gap-1 text-center">
                    <Avatar nome={p.nome} foto={p.foto} tamanho={48} />
                    <span className="w-full truncate text-xs font-medium text-stone-700">{p.nome.split(" ")[0]}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-stone-500">Nenhum guardião escalado.</p>}
          </div>
        </section>
        {participa && (
          <AcaoReuniao eventoId={evento.$id} dataEvento={evento.data} nome={u.nome} situacao={r.eu.situacao} justificativa={r.eu.justificativa} jaComecou={r.presencaEncerrada} prazoPassou={r.prazoPassou} prazoTexto={r.prazoTexto} />
        )}
        <section className="mt-5 px-5">
          <h2 className="mb-3 text-lg font-semibold text-stone-900">Presença na reunião</h2>
          <ListasReuniao dados={r} meuId={u.id} gerenciar={gerenciar} coordenacao={coord} />
        </section>
      </div>
    );
  }

  // Mestre só escala nos rituais em que é um dos mestres; nos outros vê a guarnição sem poder mudar nada
  const mestreDoRitual = visao === "mestre" && (evento.mestres ?? []).includes(u.id);
  const podeEscalar = coord || mestreDoRitual;
  const g = await dadosGuarnicao(evento, { id: u.id, funcaoRitual: u.funcaoRitual, sexo: u.sexo }, podeEscalar);
  // Coordenação: tudo o que mudou na guarnição deste ritual (quem entrou, saiu, foi retirado e por quem)
  const [historico, usuarios] = coord
    ? await Promise.all([listar<Candidatura>(TABLES.candidaturas, [Query.equal("evento_id", evento.$id)]), mapaUsuarios()])
    : [[] as Candidatura[], new Map()];
  const sexo = u.sexo;
  const temVaga = !!sexo && g.vagas[sexo] - g.confirmados[sexo].length > 0;
  const [{ limiteMes }, porMes] = await Promise.all([regrasGuarnicao(), participacoesPorMes(u.id)]);
  const usadasNoMes = porMes.get(evento.data.slice(0, 7)) ?? 0;
  const bloqueio = !g.eu.situacao && u.suspensoAte
    ? `Candidaturas suspensas até ${new Date(u.suspensoAte).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}`
    : !sexo
    ? "Informe seu gênero no Perfil"
    : g.jaComecou
      ? "Este ritual já começou"
      : !g.abertas
        ? "Candidaturas fechadas"
        : !g.eu.situacao && limiteMes > 0 && usadasNoMes >= limiteMes
          ? `Limite do mês atingido (${usadasNoMes}/${limiteMes})`
          : null;

  return (
    <div className={visao === "guardiao" ? "pb-32" : "pb-6"}>
      <Topo evento={evento} end={end} mestres={mestres} agenda={visao === "guardiao" && g.eu.situacao === "confirmada"} />

      {/* Guarnição */}
      <section className="mt-5 px-5">
        <h2 className="mb-3 text-lg font-semibold text-stone-900">Guarnição do ritual{evento.ritual_numero_geral ? ` Nº ${evento.ritual_numero_geral}` : ""}</h2>
        {podeEscalar ? (
          <PainelEscala eventoId={evento.$id} vagas={g.vagas} abertas={g.abertas} confirmados={g.confirmados} espera={g.espera} disponiveis={g.disponiveis} somenteEscala={!coord} />
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
              const acao = { confirmada: "confirmado(a)", espera: "na lista de espera", cancelada: "cancelou", removida: "retirado(a)", justificada: "justificou a ausência" }[c.situacao];
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

      {visao === "guardiao" && (
        <AcaoGuardiao
          eventoId={evento.$id}
          situacao={g.eu.situacao}
          posicaoEspera={g.eu.posicaoEspera}
          bloqueio={bloqueio}
          prazoPassou={g.prazoPassou}
          prazoTexto={g.prazoTexto}
          temVaga={temVaga}
          sexo={sexo}
          suspenso={!!u.suspensoAte}
        />
      )}
    </div>
  );
}
