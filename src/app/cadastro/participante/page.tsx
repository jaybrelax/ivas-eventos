import { redirect } from "next/navigation";

/** Endereço antigo do cadastro de participante: agora é /cadastro (mantém o ?next). */
export default async function CadastroParticipanteAntigo({ searchParams }: PageProps<"/cadastro/participante">) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  if (typeof sp.next === "string") params.set("next", sp.next);
  if ("guardiao" in sp) params.set("guardiao", "1");
  redirect(params.size ? `/cadastro?${params}` : "/cadastro");
}
