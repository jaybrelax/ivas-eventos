import { Ticket } from "lucide-react";
import { contextoGuarnicao } from "@/lib/guarnicao-app";
import { CabecalhoApp, Vazio } from "../ui";

export const metadata = { title: "Pacotes" };

/** Pacotes: tela reservada (o conteúdo será definido depois). */
export default async function PacotesGuarnicao() {
  const { u } = (await contextoGuarnicao("/guarnicao/pacotes"))!;
  return (
    <>
      <CabecalhoApp u={u} titulo="Pacotes" />
      <Vazio icone={<Ticket size={26} />} titulo="Em breve" texto="Esta área ainda está sendo preparada." />
    </>
  );
}
