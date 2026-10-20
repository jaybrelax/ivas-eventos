import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getEventoPorNumero } from "@/lib/data";
import { PaginaEvento, metadadosEvento } from "@/app/eventos/PaginaEvento";

type Props = { params: Promise<{ numero: string }>; searchParams: Promise<{ participar?: string; pagar?: string }> };

/** Página pública do ritual: o endereço usa o número geral, ex.: /ritual/525. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return metadadosEvento(await getEventoPorNumero(Number((await params).numero)));
}

export default async function PaginaRitualPublico({ params, searchParams }: Props) {
  const evento = await getEventoPorNumero(Number((await params).numero));
  if (!evento) notFound();
  const sp = await searchParams;
  return <PaginaEvento evento={evento} abrirParticipacao={sp.participar === "1"} abrirPagamento={sp.pagar === "1"} />;
}
