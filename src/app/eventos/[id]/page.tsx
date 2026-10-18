import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getDadosInstituto, getEvento } from "@/lib/data";
import { urlPublicaEvento } from "@/lib/links";
import { PaginaEvento, metadadosEvento } from "../PaginaEvento";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return metadadosEvento(await getEvento((await params).id));
}

export default async function PaginaEventoPublico({ params }: Props) {
  const evento = await getEvento((await params).id);
  if (!evento) notFound();
  // Ritual tem endereço próprio (/ritual/525): links antigos com o id continuam funcionando
  const { tipos } = await getDadosInstituto();
  const url = urlPublicaEvento(evento, tipos.find((t) => t.$id === evento.tipo_id));
  if (url.startsWith("/ritual/")) permanentRedirect(url);
  return <PaginaEvento evento={evento} />;
}
