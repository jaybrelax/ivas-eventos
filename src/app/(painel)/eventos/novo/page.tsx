import { exigir } from "@/lib/auth";
import { PODE } from "@/lib/config";
import { getDadosInstituto, getEvento } from "@/lib/data";
import { listarEquipe } from "@/lib/usuarios";
import { Titulo } from "@/components/Titulo";
import { EventoForm } from "../EventoForm";

export default async function NovoEvento({ searchParams }: PageProps<"/eventos/novo">) {
  await exigir(PODE.editarEventos);
  const sp = await searchParams;
  const [{ tipos, enderecos }, equipe, base] = await Promise.all([
    getDadosInstituto(),
    listarEquipe(),
    typeof sp.de === "string" ? getEvento(sp.de) : null,
  ]);
  // Duplicar: copia tudo menos id, data, numeração e capa (cada evento tem a sua imagem).
  const copia = base
    ? {
        titulo: base.titulo, hora_inicio: base.hora_inicio, tipo_id: base.tipo_id, endereco_id: base.endereco_id,
        endereco_livre: base.endereco_livre, descricao: base.descricao, mostrar_banner: base.mostrar_banner, destaque: base.destaque,
        mestres: base.mestres,
        vagas_guardioes: base.vagas_guardioes, vagas_guardias: base.vagas_guardias, candidaturas_abertas: base.candidaturas_abertas,
      }
    : undefined;
  return (
    <>
      <Titulo
        sobre="Agenda"
        titulo={base ? "Duplicar evento" : "Novo evento"}
        subtitulo={base ? `Copiando “${base.titulo}”. Escolha a nova data.` : "Preencha as informações e salve. Rituais recebem o número automaticamente."}
      />
      <EventoForm evento={copia} tipos={tipos} enderecos={enderecos} equipe={equipe} podeNumerar={false} />
      {/* espaço para a barra fixa de salvar */}
      <div className="h-20" />
    </>
  );
}
