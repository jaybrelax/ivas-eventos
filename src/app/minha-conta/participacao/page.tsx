import { redirect } from "next/navigation";
import { exigirSessao } from "@/lib/auth";
import { inscricoesComEventos } from "@/lib/inscricoes";

export default async function UltimaParticipacaoPage() {
  const usuario = await exigirSessao("/minha-conta/participacao");
  const inscricoes = await inscricoesComEventos(usuario.id);
  const ultima = inscricoes
    .filter((item) => item.situacao === "confirmada" && item.passado && item.temContribuicao)
    .sort((a, b) => `${b.data}T${b.hora}`.localeCompare(`${a.data}T${a.hora}`))[0];

  if (ultima) redirect(`/minha-conta/participacao/${ultima.inscricaoId}`);
  redirect("/minha-conta?aba=proximos#historico");
}
