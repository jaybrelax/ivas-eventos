import { redirect } from "next/navigation";

// O endereço principal (virtudes.net.br) abre a agenda pública; o painel fica em /admin.
// Um projeto dedicado ao app da Guarnição define PAGINA_INICIAL=/guarnicao para a raiz abrir o app
// (assim, compartilhar só o endereço do site já mostra a capa do app).
export default function Raiz() {
  const inicial = process.env.PAGINA_INICIAL;
  redirect(inicial && inicial.startsWith("/") && !inicial.startsWith("//") ? inicial : "/eventos");
}
