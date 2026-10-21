import { urlPublicaEvento } from "@/lib/links";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock, Copy, ExternalLink, Image as ImageIcon, MapPin, TriangleAlert } from "lucide-react";
import type { Pessoa } from "@/lib/types";
import { exigir, pode } from "@/lib/auth";
import { PODE } from "@/lib/config";
import { descricaoComTags, getDadosInstituto, getEvento } from "@/lib/data";
import { listarEquipe } from "@/lib/usuarios";
import { getConfigIA } from "@/lib/ia";
import { dataPorExtenso, formatarIdRitual } from "@/lib/format";
import { BadgeDestaque, BadgeRitual, BadgeTipo, Titulo } from "@/components/Titulo";
import { GENERO_ROTULO, IconeGenero } from "@/components/genero";
import { InfoRitual } from "@/components/InfoRitual";
import { EventoForm } from "../EventoForm";
import { Guarnicao } from "../Guarnicao";
import { dadosGuarnicao } from "../guarnicao-dados";
import { temGuarnicao } from "@/lib/guarnicao";
import { Participantes } from "../Participantes";
import { RenumerarProximos } from "../RenumerarProximos";
import { dadosParticipantes } from "../participantes-dados";
import { excluirEvento } from "../actions";

// A geração de imagem por IA roda numa Server Action desta página e pode levar mais de um minuto
export const maxDuration = 180;

export default async function EditarEvento({ params }: PageProps<"/admin/eventos/[id]">) {
  const u = await exigir();
  const { id } = await params;
  const [evento, { tipos, tags, enderecos, instituto }, equipe] = await Promise.all([getEvento(id), getDadosInstituto(), listarEquipe()]);
  if (!evento) notFound();
  const tipo = tipos.find((t) => t.$id === evento.tipo_id);
  const idRitual = formatarIdRitual(evento.ritual_numero_geral, evento.ritual_ano, evento.ritual_numero_ano);
  const guarnicao = temGuarnicao(tipo) ? await dadosGuarnicao(evento, u, pode(u, PODE.editarEventos)) : null;
  const participantes = await dadosParticipantes(evento, tipo, instituto.valor_contribuicao, pode(u, PODE.editarEventos));
  const voltar = (
    <Link href={`/admin/eventos?mes=${evento.data.slice(0, 7)}`} className="inline-flex items-center gap-1.5 hover:text-ouro-700">
      <ArrowLeft size={13} /> Agenda
    </Link>
  );
  const acoes = (
    <>
      <Link href={urlPublicaEvento(evento, tipo)} target="_blank" rel="noopener noreferrer" className="btn-secundario text-mata-700 hover:text-mata-900">
        <ExternalLink size={16} /> Ver público
      </Link>
      <Link href={`/admin/banners?evento=${evento.$id}`} className="btn-secundario"><ImageIcon size={16} /> Banner</Link>
      {pode(u, PODE.editarEventos) && <Link href={`/admin/eventos/novo?de=${evento.$id}`} className="btn-secundario"><Copy size={16} /> Duplicar</Link>}
    </>
  );

  if (!pode(u, PODE.editarEventos)) {
    const end = enderecos.find((e) => e.$id === evento.endereco_id);
    return (
      <>
        <Titulo sobre={voltar} titulo={evento.titulo} acoes={acoes} />
        <article className="cartao max-w-3xl overflow-hidden p-0 sm:p-0">
          {evento.capa_file_id && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/arquivo/${evento.capa_file_id}`} alt="" className="aspect-[21/9] w-full object-cover" />
          )}
          <div className="space-y-5 p-5 sm:p-7">
            <div className="flex flex-wrap gap-2">
              {tipo && <BadgeTipo nome={tipo.nome} cor={tipo.cor} icone={tipo.icone} />}
              {idRitual && <BadgeRitual id={idRitual} />}
              {evento.destaque && <BadgeDestaque />}
            </div>
            {tipo?.descricao && (
              <p className="rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line text-stone-700 ring-1 ring-inset" style={{ background: `${tipo.cor}0d`, ["--tw-ring-color" as string]: `${tipo.cor}26` }}>
                {tipo.descricao}
              </p>
            )}
            <dl className="grid gap-4 sm:grid-cols-3">
              {[
                { Icone: CalendarDays, rotulo: "Data", valor: <span className="capitalize">{dataPorExtenso(evento.data)}</span> },
                { Icone: Clock, rotulo: "Horário", valor: evento.hora_inicio },
                { Icone: MapPin, rotulo: "Local", valor: end ? `${end.apelido} — ${end.endereco}` : evento.endereco_livre },
              ].map(({ Icone, rotulo, valor }) => (
                <div key={rotulo} className="flex gap-3 rounded-xl bg-stone-50 p-3.5 ring-1 ring-stone-100">
                  <Icone size={18} className="mt-0.5 shrink-0 text-mata-600" />
                  <div className="min-w-0">
                    <dt className="text-xs text-stone-500">{rotulo}</dt>
                    <dd className="text-sm font-medium text-stone-900">{valor}</dd>
                  </div>
                </div>
              ))}
            </dl>
            <EquipeDoEvento equipe={equipe} mestres={evento.mestres ?? []} />
            {descricaoComTags(evento.descricao, evento.tags, tags) && <p className="text-[15px] leading-relaxed whitespace-pre-line text-stone-700">{descricaoComTags(evento.descricao, evento.tags, tags)}</p>}
            {tipo?.conta_como_ritual && <InfoRitual instituto={instituto} />}
          </div>
        </article>
        {guarnicao && <div className="mt-6 max-w-3xl"><Guarnicao dados={guarnicao} /></div>}
        {participantes && <div className="mt-6 max-w-3xl"><Participantes dados={participantes} /></div>}
      </>
    );
  }

  return (
    <>
      <Titulo
        sobre={<span className="inline-flex items-center gap-2">{voltar}<span className="text-stone-300">/</span>Editar evento</span>}
        titulo={evento.titulo}
        subtitulo={
          (tipo || idRitual) && (
            <span className="inline-flex flex-wrap items-center gap-2">
              {tipo && <BadgeTipo nome={tipo.nome} cor={tipo.cor} icone={tipo.icone} />}
              {idRitual && <BadgeRitual id={idRitual} />}
            </span>
          )
        }
        acoes={acoes}
      />
      <EventoForm
        evento={evento}
        tipos={tipos}
        tags={tags}
        enderecos={enderecos}
        equipe={equipe}
        podeNumerar={pode(u, PODE.editarNumeracao)}
        informacoes={instituto}
        podeConfigurar={pode(u, PODE.configurar)}
        iaPronta={!!(await getConfigIA()).chave}
        guarnicao={guarnicao && <Guarnicao dados={guarnicao} embutido />}
        participantes={participantes && <Participantes dados={participantes} />}
      />
      {tipo?.conta_como_ritual && evento.ritual_numero_geral && pode(u, PODE.editarNumeracao) && (
        <RenumerarProximos eventoId={evento.$id} numero={evento.ritual_numero_geral} />
      )}
      {u.perfil === "admin" && (
        <form action={excluirEvento} className="xl:mr-[23.5rem]">
          <input type="hidden" name="id" value={evento.$id} />
          <details className="group rounded-2xl border border-red-200/80 bg-red-50/40 px-5 py-4">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-red-800 select-none">
              <TriangleAlert size={16} /> Zona de perigo
              <span className="ml-auto text-xs font-normal text-red-700/70 group-open:hidden">Excluir evento…</span>
            </summary>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="max-w-lg text-sm text-red-900/80">
                A exclusão é definitiva, inclusive da imagem de capa. Se for um ritual, o número dele não é reaproveitado (fica um salto na sequência, a não ser que seja o último).
              </p>
              <button className="btn border border-red-300 bg-red-600 text-white hover:bg-red-700">Excluir definitivamente</button>
            </div>
          </details>
        </form>
      )}
      {/* espaço para a barra fixa de salvar */}
      <div className="h-20" />
    </>
  );
}

/** Mestres do evento (os guardiões aparecem no cartão da guarnição). */
function EquipeDoEvento({ equipe, mestres }: { equipe: Pessoa[]; mestres: string[] }) {
  const grupos = [
    { titulo: "Mestres", ids: mestres },
  ].map((g) => ({ ...g, pessoas: equipe.filter((p) => g.ids.includes(p.$id)) }));
  if (!grupos.some((g) => g.pessoas.length)) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {grupos.map((g) => (
        <div key={g.titulo} className="rounded-xl bg-stone-50 p-3.5 ring-1 ring-stone-100">
          <p className="mb-2 text-xs text-stone-500">{g.titulo}</p>
          {g.pessoas.length ? (
            <div className="space-y-2">
              {(["masculino", "feminino"] as const).map((sx) => {
                const nomes = g.pessoas.filter((p) => p.sexo === sx);
                if (!nomes.length) return null;
                return (
                  <div key={sx}>
                    <p className="flex items-center gap-1 text-[11px] font-semibold tracking-wide text-stone-400 uppercase">
                      <IconeGenero genero={sx} size={13} />
                      {GENERO_ROTULO[sx]}
                    </p>
                    <p className="text-sm font-medium text-stone-900">{nomes.map((p) => p.nome).join(", ")}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-stone-400">Ninguém escalado</p>
          )}
        </div>
      ))}
    </div>
  );
}
