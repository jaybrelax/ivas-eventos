import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { contextoGuarnicao } from "@/lib/guarnicao-app";
import { getDadosInstituto } from "@/lib/data";
import { MeusDadosForm } from "../MeusDadosForm";

export const metadata = { title: "Meus dados" };

export default async function MeusDados() {
  const { u } = (await contextoGuarnicao("/guarnicao/perfil/dados"))!;
  const { instituto } = await getDadosInstituto();

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center gap-3 bg-stone-50/85 px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3 backdrop-blur-xl">
        <Link href="/guarnicao/perfil" aria-label="Voltar ao perfil" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white shadow-cartao ring-1 ring-stone-200 active:scale-90">
          <ChevronLeft size={22} />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">Meus dados</h1>
      </header>

      <section className="mx-4 rounded-3xl bg-white p-5 shadow-cartao ring-1 ring-stone-200/70">
        <MeusDadosForm
          nome={u.nome} email={u.email} telefone={u.telefone} endereco={u.endereco} sexo={u.sexo} foto={u.foto}
          cpf={u.cpf} dataNascimento={u.dataNascimento} next="/guarnicao/perfil" semFoto compacto
          estado={u.estado ?? instituto.estado} cidade={u.estado ? u.cidade : instituto.cidade}
          profissao={u.profissao} experiencia={u.experiencia} motivacao={u.motivacao} expectativas={u.expectativas}
        />
      </section>
    </>
  );
}
