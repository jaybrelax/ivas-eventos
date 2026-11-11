import { ListaRituais } from "./ListaRituais";

export const metadata = { title: "Rituais" };

export default function RituaisGuarnicao({ searchParams }: PageProps<"/guarnicao">) {
  return <ListaRituais searchParams={searchParams} />;
}
