import { getInstituto } from "@/lib/data";
import { MarcaInstituto } from "@/components/Marca";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const [sp, instituto] = await Promise.all([searchParams, getInstituto()]);
  const semPerfil = sp.erro === "sem-perfil";
  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[1.1fr_1fr]">
      {/* Lado da marca */}
      <section className="relative hidden overflow-hidden bg-mata-950 p-12 text-white lg:flex lg:flex-col">
        <div aria-hidden className="absolute -top-32 -left-24 h-[28rem] w-[28rem] rounded-full bg-ouro-500/20 blur-3xl" />
        <div aria-hidden className="absolute -right-32 -bottom-40 h-[32rem] w-[32rem] rounded-full bg-mata-500/30 blur-3xl" />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "28px 28px" }}
        />
        <div className="relative">
          <MarcaInstituto instituto={instituto} altura={64} />
        </div>
        <div className="relative mt-auto max-w-md">
          <p className="mb-4 text-xs font-semibold tracking-[0.2em] text-ouro-300 uppercase">Painel de gestão</p>
          <h1 className="font-display text-4xl leading-tight font-semibold text-white">Eventos e rituais, organizados em um só lugar.</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-mata-200">
            Agenda, numeração automática dos rituais e banners prontos para divulgar.
          </p>
        </div>
        <p className="relative mt-12 text-xs text-mata-400">{instituto.nome}</p>
      </section>

      {/* Formulário */}
      <section className="flex flex-col items-center justify-center bg-fundo px-5 py-12 lg:bg-white">
        <div className="w-full max-w-sm animate-surgir">
          <div className="mb-8 lg:hidden">
            <div className="inline-flex rounded-2xl bg-mata-950 p-4">
              <MarcaInstituto instituto={instituto} altura={44} />
            </div>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-stone-900">Entrar</h2>
          <p className="mt-1.5 mb-8 text-sm text-stone-500">Use o e-mail e a senha cadastrados pelo Admin.</p>
          <LoginForm semPerfil={semPerfil} />
          <p className="mt-6 text-center text-sm text-stone-500">
            Ainda não tem acesso? <a href="/cadastro" className="font-medium text-mata-700 hover:underline">Criar cadastro</a>
          </p>
        </div>
      </section>
    </main>
  );
}
