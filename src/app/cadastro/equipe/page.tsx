import type { Metadata } from "next";
import { getInstituto } from "@/lib/data";
import { MarcaInstituto } from "@/components/Marca";
import { FundoMarca } from "@/components/FundoMarca";
import { CadastroForm } from "./CadastroForm";

export const metadata: Metadata = { title: "Cadastro — Instituto IVAS", robots: { index: false } };

/**
 * Cadastro de acesso ao painel. A função vem oculta no link (?funcao=mestre ou ?funcao=guardiao)
 * e fica como sugestão para o Admin, que aprova e define a função e o perfil de acesso.
 */
export default async function CadastroPage({ searchParams }: PageProps<"/cadastro/equipe">) {
  const [sp, instituto] = await Promise.all([searchParams, getInstituto()]);
  const f = typeof sp.funcao === "string" ? sp.funcao.toLowerCase() : "";
  const funcao = f === "mestre" || f === "guardiao" ? f : null;

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-mata-950 p-12 text-white lg:flex lg:flex-col">
        <FundoMarca />
        <div className="relative mt-auto max-w-md">
          <p className="mb-4 text-xs font-semibold tracking-[0.2em] text-ouro-300 uppercase">Acesso ao painel</p>
          <h1 className="font-display text-4xl leading-tight font-semibold text-white">Faça parte da organização dos trabalhos.</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-mata-200">
            Preencha seus dados. Assim que a coordenação aprovar, você acessa a agenda e participa da guarnição.
          </p>
        </div>
        <p className="relative mt-12 text-xs text-mata-400">{instituto.nome}</p>
      </section>

      <section className="relative flex flex-col items-center justify-start bg-[#c3cdf6] px-5 pt-[max(61vw,34svh)] pb-8 lg:justify-center lg:bg-white lg:py-12">
        {/* Celular: mesma arte do login, fixa ao fundo enquanto o formulário rola (a logo já faz parte da imagem) */}
        <div aria-hidden className="fixed inset-0 bg-cover bg-top bg-no-repeat lg:hidden" style={{ backgroundImage: "url(/fundo_login_mobile.webp)" }} />
        <div className="relative w-full max-w-md animate-surgir rounded-3xl bg-white/55 p-5 shadow-elevado ring-1 ring-white/70 backdrop-blur-md lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none lg:ring-0 lg:backdrop-blur-none">
          {/* Logo colorida, sem fundo, centralizada acima do formulário */}
          <div className="mb-8 hidden justify-center lg:flex">
            <MarcaInstituto instituto={instituto} altura={64} fundoClaro />
          </div>
          <h2 className="text-center text-2xl font-semibold tracking-tight text-stone-900 lg:text-3xl">Criar cadastro</h2>
          <p className="mt-1 mb-5 text-center text-sm lg:mt-1.5 lg:mb-8 text-stone-500">O acesso é liberado depois da aprovação da coordenação.</p>
          <CadastroForm funcao={funcao} estadoPadrao={instituto.estado} cidadePadrao={instituto.cidade} />
        </div>
      </section>
    </main>
  );
}
