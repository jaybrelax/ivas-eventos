import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getEventoPorNumero } from "@/lib/data";
import { PaginaEvento, metadadosEvento } from "@/app/eventos/PaginaEvento";

type Props = { params: Promise<{ numero: string }> };

/** Página pública do ritual: o endereço usa o número geral, ex.: /ritual/525. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return metadadosEvento(await getEventoPorNumero(Number((await params).numero)));
}

export default async function PaginaRitualPublico({ params }: Props) {
  const evento = await getEventoPorNumero(Number((await params).numero));
  if (!evento) notFound();
  return <PaginaEvento evento={evento} />;
}
