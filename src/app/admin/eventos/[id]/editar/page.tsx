import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, TriangleAlert } from "lucide-react";
import { exigir, pode } from "@/lib/auth";
import { PODE } from "@/lib/config";
import { getDadosInstituto, getEvento } from "@/lib/data";
import { urlPublicaEvento } from "@/lib/links";
import { podeGerenciarEvento } from "@/lib/gestao-evento";
import { listarEquipe } from "@/lib/usuarios";
import { getConfigIA } from "@/lib/ia";
import { dataPorExtenso, formatarIdRitual } from "@/lib/format";
import { BadgeRitual, BadgeTipo, Titulo } from "@/components/Titulo";
import { SITE_URL } from "@/lib/site";
import { MenuEventoMobile } from "../MenuEventoMobile";
import { EventoForm } from "../../EventoForm";
import { RenumerarProximos } from "../../RenumerarProximos";
import { excluirEvento } from "../../actions";

// A geração de imagem por IA roda numa Server Action desta página e pode levar mais de um minuto
export const maxDuration = 180;

/**
 * Edição do evento (só coordenação e admin). Guarnição, participantes e presença ficam na
 * página de visualização (aba Gestão); aqui ficam só os campos do evento.
 */
export default async function EditarEvento({ params }: PageProps<"/admin/eventos/[id]/editar">) {
  const u = await exigir();
  const { id } = await params;
  const [evento, { tipos, tags, enderecos, instituto }, equipe, ia] = await Promise.all([getEvento(id), getDadosInstituto(), listarEquipe(), getConfigIA()]);
  if (!evento) notFound();
  if (!podeGerenciarEvento(u, evento)) redirect(`/admin/eventos/${id}?erro=sem-permissao`);
  const tipo = tipos.find((t) => t.$id === evento.tipo_id);
  const caminhoPublico = urlPublicaEvento(evento, tipo);
  const idRitual = formatarIdRitual(evento.ritual_numero_geral, evento.ritual_ano, evento.ritual_numero_ano);

  return (
    <>
      {/* Mobile: só o voltar e o menu de ações */}
      <div className="mb-3 flex items-center justify-between gap-3 md:hidden">
        <Link href={`/admin/eventos/${evento.$id}`} className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-[0.14em] text-ouro-600 uppercase">
          <ArrowLeft size={13} /> Visualizar
        </Link>
        <MenuEventoMobile url={`${SITE_URL}${caminhoPublico}`} caminho={caminhoPublico} titulo={evento.titulo} resumo={{ capaFileId: evento.capa_file_id ?? null, data: `${dataPorExtenso(evento.data)} · ${evento.hora_inicio}`, numeros: idRitual, gestaoUrl: `${SITE_URL}/admin/eventos/${evento.$id}` }} visualizarHref={`/admin/eventos/${evento.$id}`} />
      </div>
      <div className="hidden md:block">
      <Titulo
        sobre={
          <span className="inline-flex items-center gap-2">
            <Link href={`/admin/eventos/${evento.$id}`} className="inline-flex items-center gap-1.5 hover:text-ouro-700">
              <ArrowLeft size={13} /> Visualizar evento
            </Link>
            <span className="text-stone-300">/</span>Editar evento
          </span>
        }
        titulo={evento.titulo}
        subtitulo={
          (tipo || idRitual) && (
            <span className="inline-flex flex-wrap items-center gap-2">
              {tipo && <BadgeTipo nome={tipo.nome} cor={tipo.cor} icone={tipo.icone} />}
              {idRitual && <BadgeRitual id={idRitual} />}
            </span>
          )
        }
      />
      </div>
      <EventoForm
        evento={evento}
        tipos={tipos}
        tags={tags}
        enderecos={enderecos}
        equipe={equipe}
        podeNumerar={pode(u, PODE.editarNumeracao)}
        informacoes={instituto}
        podeConfigurar={pode(u, PODE.configurar)}
        iaPronta={!!ia.chave}
        renumerar={evento.ritual_numero_geral && pode(u, PODE.editarNumeracao) ? <RenumerarProximos eventoId={evento.$id} numero={evento.ritual_numero_geral} /> : undefined}
      />
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
