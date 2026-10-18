import type { Metadata } from "next";
import { getInstituto } from "@/lib/data";
import { MarcaInstituto } from "@/components/Marca";
import { CadastroForm } from "./CadastroForm";

export const metadata: Metadata = { title: "Cadastro — Instituto IVAS", robots: { index: false } };

/**
 * Cadastro de acesso ao painel. A função vem oculta no link (?funcao=mestre ou ?funcao=guardiao)
 * e fica como sugestão para o Admin, que aprova e define a função e o perfil de acesso.
 */
export default async function CadastroPage({ searchParams }: PageProps<"/cadastro">) {
  const [sp, instituto] = await Promise.all([searchParams, getInstituto()]);
  const f = typeof sp.funcao === "string" ? sp.funcao.toLowerCase() : "";
  const funcao = f === "mestre" || f === "guardiao" ? f : null;

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-mata-950 p-12 text-white lg:flex lg:flex-col">
        <div aria-hidden className="absolute -top-32 -left-24 h-[28rem] w-[28rem] rounded-full bg-ouro-500/20 blur-3xl" />
        <div aria-hidden className="absolute -right-32 -bottom-40 h-[32rem] w-[32rem] rounded-full bg-mata-500/30 blur-3xl" />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "28px 28px" }}
        />
        <div className="relative mt-auto max-w-md">
          <p className="mb-4 text-xs font-semibold tracking-[0.2em] text-ouro-300 uppercase">Acesso ao painel</p>
          <h1 className="font-display text-4xl leading-tight font-semibold text-white">Faça parte da organização dos trabalhos.</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-mata-200">
            Preencha seus dados. Assim que a coordenação aprovar, você acessa a agenda e participa da guarnição.
          </p>
        </div>
        <p className="relative mt-12 text-xs text-mata-400">{instituto.nome}</p>
      </section>

      <section className="flex flex-col items-center justify-center bg-fundo px-5 py-12 lg:bg-white">
        <div className="w-full max-w-md animate-surgir">
          {/* Logo colorida, sem fundo, centralizada acima do formulário */}
          <div className="mb-8 flex justify-center">
            <MarcaInstituto instituto={instituto} altura={64} fundoClaro />
          </div>
          <h2 className="text-center text-2xl font-semibold tracking-tight text-stone-900">Criar cadastro</h2>
          <p className="mt-1.5 mb-8 text-center text-sm text-stone-500">O acesso é liberado depois da aprovação da coordenação.</p>
          <CadastroForm funcao={funcao} />
        </div>
      </section>
    </main>
  );
}
