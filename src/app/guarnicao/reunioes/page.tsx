import { ListaReunioes } from "../ListaRituais";

export const metadata = { title: "Reuniões" };

export default function ReunioesGuarnicao({ searchParams }: PageProps<"/guarnicao/reunioes">) {
  return <ListaReunioes searchParams={searchParams} />;
}
