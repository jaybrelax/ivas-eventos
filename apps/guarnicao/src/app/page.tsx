import { redirect } from "next/navigation";

// O endereço principal deste projeto abre o aplicativo Guarnição.
export default function Raiz() {
  redirect("/guarnicao");
}
