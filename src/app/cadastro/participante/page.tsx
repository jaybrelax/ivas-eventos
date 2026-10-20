import { redirect } from "next/navigation";

/** Endereço antigo do cadastro de participante: agora é /cadastro (mantém o ?next). */
export default async function CadastroParticipanteAntigo({ searchParams }: PageProps<"/cadastro/participante">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : null;
  redirect(next ? `/cadastro?next=${encodeURIComponent(next)}` : "/cadastro");
}
