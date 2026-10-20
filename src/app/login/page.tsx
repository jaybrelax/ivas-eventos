import { getInstituto } from "@/lib/data";
import { MarcaInstituto } from "@/components/Marca";
import { FundoMarca } from "@/components/FundoMarca";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const [sp, instituto] = await Promise.all([searchParams, getInstituto()]);
  const semPerfil = sp.erro === "sem-perfil";
  const erroGoogle = sp.erro === "google";
  const next = typeof sp.next === "string" ? sp.next : undefined;
  const cadastroHref = (href: string) => (next ? `${href}?next=${encodeURIComponent(next)}` : href);
  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[1.1fr_1fr]">
      {/* Lado da marca */}
      <section className="relative hidden overflow-hidden bg-mata-950 p-12 text-white lg:flex lg:flex-col">
        <FundoMarca imagem="/fundo_login_desktop.webp" posicao="bg-center" />
        <div className="relative">
          <MarcaInstituto instituto={instituto} altura={64} />
        </div>
        <div className="relative mt-auto max-w-xl">
          <p className="mb-4 text-xs font-semibold tracking-[0.2em] text-ouro-300 uppercase">Acesse nossa plataforma</p>
          <h1 className="text-[clamp(1.6rem,2.4vw,2.4rem)] leading-[1.15] font-semibold tracking-tight text-white" style={{ fontFamily: "Sora, var(--font-sans), system-ui, sans-serif" }}>Eventos e rituais,<br />organizados em um só lugar.</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-mata-200">
            Confirme sua presença, acompanhe seus rituais e contribuições e fique por dentro da agenda completa do Instituto.
          </p>
        </div>
        <p className="relative mt-12 text-xs text-mata-400">{instituto.nome}</p>
      </section>

      {/* Formulário */}
      <section className="relative flex flex-col items-center justify-start overflow-hidden bg-[#c3cdf6] px-5 pt-[max(61vw,34svh)] pb-6 lg:justify-center lg:bg-white lg:py-12">
        {/* Celular: arte do IVAS no topo (a logo já faz parte da imagem); o formulário fica na parte clara */}
        <div aria-hidden className="absolute inset-x-0 -top-[14vw] bottom-0 bg-cover bg-top bg-no-repeat lg:hidden" style={{ backgroundImage: "url(/fundo_login_mobile.webp)" }} />
        <div className="relative w-full max-w-sm animate-surgir rounded-3xl bg-white/55 p-5 shadow-elevado ring-1 ring-white/70 backdrop-blur-md lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none lg:ring-0 lg:backdrop-blur-none">
          <h2 className="text-center text-xl font-semibold tracking-tight text-stone-900 lg:text-left lg:text-2xl">Entrar</h2>
          <p className="mt-1 mb-5 text-center text-sm lg:mb-8 lg:mt-1.5 text-stone-500 lg:text-left">Use o e-mail e a senha do seu cadastro.</p>
          <LoginForm semPerfil={semPerfil} erroGoogle={erroGoogle} next={next} />
          <p className="mt-4 text-center text-sm text-stone-500 lg:mt-6">
            Quer participar dos rituais? <a href={cadastroHref("/cadastro")} className="font-medium text-mata-700 hover:underline">Criar cadastro</a>
          </p>
        </div>
      </section>
    </main>
  );
}
