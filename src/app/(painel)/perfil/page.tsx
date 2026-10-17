import { exigir } from "@/lib/auth";
import { PERFIS } from "@/lib/config";
import { Titulo } from "@/components/Titulo";
import { PerfilForm } from "./PerfilForm";

export default async function MeuPerfil() {
  const u = await exigir();
  return (
    <>
      <Titulo sobre="Conta" titulo="Meu perfil" subtitulo="Sua foto e seu telefone aparecem para a equipe no painel." />
      <PerfilForm
        nome={u.nome}
        email={u.email}
        telefone={u.telefone}
        foto={u.foto}
        sexo={u.sexo}
        funcao={{ mestre: "Mestre", guardiao: "Guardião", nenhuma: "Não escalado" }[u.funcaoRitual]}
        perfil={PERFIS.find((p) => p.id === u.perfil)?.nome ?? ""}
      />
    </>
  );
}
