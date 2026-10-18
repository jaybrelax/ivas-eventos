import { redirect } from "next/navigation";

// O endereço principal (virtudes.net.br) abre a agenda pública; o painel fica em /admin.
export default function Raiz() {
  redirect("/eventos");
}
