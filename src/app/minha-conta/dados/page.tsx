import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { exigirSessao } from "@/lib/auth";
import { getDadosInstituto } from "@/lib/data";
import { CabecalhoPublico } from "@/components/publico/CabecalhoPublico";
import { RodapePublico } from "@/components/publico/RodapePublico";
import { ProximoRitualCard } from "@/components/publico/ProximoRitualCard";
import { MeusDadosForm } from "../MeusDadosForm";

export const metadata: Metadata = { title: "Meus dados" };

export default async function MeusDadosPage({ searchParams }: PageProps<"/minha-conta/dados">) {
  const u = await exigirSessao("/minha-conta/dados");
  const sp = await searchParams;
  const completar = sp?.completar === "1";
  // Acabou de se cadastrar (sem vir de um evento): mostra o próximo ritual enquanto completa os dados
  const bemvindo = sp?.bemvindo === "1" || (completar && !(typeof sp?.next === "string"));
  const next = typeof sp?.next === "string" ? sp.next : null;
  // Veio do cadastro com o link de divulgação para guardiões (?guardiao=1): ao completar os dados, vira guardião
  const guardiao = completar && sp?.guardiao === "1";
  const { instituto, enderecos, telefones, redes } = await getDadosInstituto();

  return (
    <div className="min-h-screen bg-fundo text-stone-900">
      <CabecalhoPublico instituto={instituto} />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <Link href="/minha-conta" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-stone-500 hover:text-stone-800">
          <ChevronLeft size={15} /> Minha conta
        </Link>
        <header className="mb-6">
          <p className="text-xs font-semibold tracking-[0.14em] text-ouro-600 uppercase">Minha conta</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">Meus dados</h1>
        </header>

        {bemvindo && <ProximoRitualCard usuarioId={u.id} />}

        <div className="cartao">
          <MeusDadosForm
            nome={u.nome} email={u.email} telefone={u.telefone} endereco={u.endereco} sexo={u.sexo} foto={u.foto}
            cpf={u.cpf} dataNascimento={u.dataNascimento} completar={completar} guardiao={guardiao} next={next}
            estado={u.estado ?? (completar ? instituto.estado : null)}
            cidade={u.estado ? u.cidade : completar ? instituto.cidade : null}
            profissao={u.profissao}
            experiencia={u.experiencia} motivacao={u.motivacao} expectativas={u.expectativas}
          />
        </div>
      </main>
      <RodapePublico instituto={instituto} enderecos={enderecos} telefones={telefones} redes={redes} />
    </div>
  );
}
