import { exigir } from "@/lib/auth";
import { PERFIS } from "@/lib/config";
import { Titulo } from "@/components/Titulo";
import { PerfilForm } from "./PerfilForm";
import { Participacoes } from "@/components/Participacoes";
import { participacoesDe } from "@/lib/guarnicao";
import { participacoesComEventos } from "@/lib/participacoes";

export default async function MeuPerfil() {
  const u = await exigir();
  const participacoes = await participacoesComEventos(await participacoesDe(u.id));
  return (
    <>
      <Titulo sobre="Conta" titulo="Meu perfil" subtitulo="Seus dados de cadastro. Use o botão Editar para corrigir." />
      <PerfilForm
        nome={u.nome}
        email={u.email}
        telefone={u.telefone}
        foto={u.foto}
        sexo={u.sexo}
        endereco={u.endereco}
        estado={u.estado}
        cidade={u.cidade}
        cpf={u.cpf}
        dataNascimento={u.dataNascimento}
        profissao={u.profissao}
        experiencia={u.experiencia}
        motivacao={u.motivacao}
        expectativas={u.expectativas}
        funcao={{ mestre: "Mestre", guardiao: "Guardião", nenhuma: "Não escalado" }[u.funcaoRitual]}
        perfil={PERFIS.find((p) => p.id === u.perfil)?.nome ?? ""}
      />
      {(u.funcaoRitual === "guardiao" || participacoes.length > 0) && (
        <section className="cartao mt-6 max-w-2xl">
          <Participacoes itens={participacoes} vazio="Você ainda não participou de nenhum evento. Candidate-se pela página de um ritual." />
        </section>
      )}
    </>
  );
}
