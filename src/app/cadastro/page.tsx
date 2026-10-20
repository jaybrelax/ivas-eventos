import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getInstituto } from "@/lib/data";
import { MarcaInstituto } from "@/components/Marca";
import { FundoMarca } from "@/components/FundoMarca";
import { urlImagem } from "@/lib/links";
import { ParticipanteForm } from "./ParticipanteForm";

const DESCRICAO = "Faça seu cadastro no Instituto IVAS para confirmar presença nos rituais e acompanhar seu histórico de participações.";

export const metadata: Metadata = {
  title: "Crie sua conta no Instituto IVAS",
  description: DESCRICAO,
  robots: { index: false },
  openGraph: { title: "Crie sua conta no Instituto IVAS", description: DESCRICAO, url: "/cadastro", type: "website" },
  twitter: { card: "summary_large_image", title: "Crie sua conta no Instituto IVAS", description: DESCRICAO },
};

/** Cadastro público para quem só vai participar dos rituais: confirmar presença, ver histórico e pagamentos. */
export default async function CadastroParticipantePage({ searchParams }: PageProps<"/cadastro">) {
  const [sp, instituto] = await Promise.all([searchParams, getInstituto()]);
  // Links antigos do cadastro da equipe (/cadastro?funcao=guardiao) seguem funcionando.
  if (typeof sp.funcao === "string") redirect(`/cadastro/equipe?funcao=${encodeURIComponent(sp.funcao)}`);
  const next = typeof sp.next === "string" ? sp.next : undefined;

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-mata-950 p-12 text-white lg:flex lg:flex-col">
        <FundoMarca />
        <div className="relative mt-auto max-w-md">
          <p className="mb-4 text-xs font-semibold tracking-[0.2em] text-ouro-300 uppercase">Participe dos rituais</p>
          <h1 className="font-display text-4xl leading-tight font-semibold text-white">Confirme presença, acompanhe seu histórico e seus pagamentos.</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-mata-200">
            Com o cadastro você confirma a vaga em cada ritual, tem historico de participação e vê os rituais de que já participou.
          </p>
        </div>
        <p className="relative mt-12 text-xs text-mata-400">{instituto.nome}</p>
      </section>

      <section className="relative flex flex-col items-center justify-start bg-[#c3cdf6] px-5 pt-[max(61vw,34svh)] pb-8 max-lg:has-[[data-etapa=escolha]]:pt-[max(92vw,50svh)] lg:justify-center lg:bg-white lg:py-12">
        {/* Celular: mesma arte do login, fixa ao fundo enquanto o formulário rola (a logo já faz parte da imagem) */}
        <div aria-hidden className="fixed inset-0 bg-cover bg-top bg-no-repeat lg:hidden" style={{ backgroundImage: "url(/fundo_login_mobile.webp)" }} />
        <div className="relative w-full max-w-md animate-surgir rounded-3xl bg-white/55 p-5 shadow-elevado ring-1 ring-white/70 backdrop-blur-md lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none lg:ring-0 lg:backdrop-blur-none">
          <div className="mb-8 hidden justify-center lg:flex">
            <MarcaInstituto instituto={instituto} altura={64} fundoClaro />
          </div>
          <h2 className="text-center text-2xl font-semibold tracking-tight text-stone-900 lg:text-3xl">Criar cadastro</h2>
          <p className="mt-1 mb-5 text-center text-sm lg:mt-1.5 lg:mb-8 text-stone-500">Rápido: seu acesso já fica pronto para usar.</p>
          <ParticipanteForm next={next} estadoPadrao={instituto.estado} cidadePadrao={instituto.cidade} />
        </div>
        <p className="relative mt-5 text-center text-sm font-medium text-stone-600">
          Já tem acesso? <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="font-semibold text-mata-700 underline-offset-2 hover:underline">Entrar</Link>
        </p>
        {/* Celular: a logo do Instituto, pequena, fechando a página */}
        {instituto.logo_file_id && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={urlImagem(instituto.logo_file_id, 320)} alt={instituto.nome} width={100} className="relative mt-6 h-auto w-[100px] lg:hidden" />
        )}
      </section>
    </main>
  );
}
