import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getInstituto } from "@/lib/data";
import { getUsuario, podeSolicitarGuarnicao } from "@/lib/auth";
import { MarcaInstituto } from "@/components/Marca";
import { urlImagem } from "@/lib/links";
import { ParticipanteForm } from "./ParticipanteForm";
import { SemBannerInstalar } from "@/components/SemBannerInstalar";
import { destinoGuarnicao } from "@/lib/destino-auth";

const DESCRICAO = "Cadastre-se na Guarnição IVAS para consultar vagas e servir nos rituais.";

export const metadata: Metadata = {
  title: "Crie sua conta na Guarnição IVAS",
  description: DESCRICAO,
  robots: { index: false },
  openGraph: { title: "Crie sua conta na Guarnição IVAS", description: DESCRICAO, url: "/cadastro-guarnicao", type: "website" },
  twitter: { card: "summary_large_image", title: "Crie sua conta na Guarnição IVAS", description: DESCRICAO },
};

/** Cadastro exclusivo do aplicativo Guarnição. */
export default async function CadastroParticipantePage({ searchParams }: PageProps<"/cadastro-guarnicao">) {
  const [sp, instituto] = await Promise.all([searchParams, getInstituto()]);
  const next = destinoGuarnicao(sp.next);
  const aprovacaoAutomatica = instituto.guarnicao_aprovacao_automatica !== false;
  // Conta nova pelo Google ou conta já existente sem função: completa os dados antes de entrar.
  const usuario = await getUsuario();
  if (usuario?.aprovacaoPendente) redirect("/aguardando-aprovacao");
  const podeSolicitar = !!usuario && podeSolicitarGuarnicao(usuario);
  const completar = sp.completar === "1" || !!usuario?.cadastroIncompleto || podeSolicitar;
  if (completar && !usuario) redirect(`/cadastro-guarnicao?next=${encodeURIComponent(next)}`);
  if (completar && usuario && !usuario.cadastroIncompleto && !podeSolicitar) redirect(next);
  if (!completar && usuario) redirect(next);

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[1.1fr_1fr]">
      <SemBannerInstalar />
      <section className="relative hidden overflow-hidden bg-mata-950 p-12 text-white lg:flex lg:flex-col">
        <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-[#1c1040] via-[#35205c] to-[#7a52e3]" />
        <img src="/icons/guarnicao-512.png" alt="" width={112} height={112} className="relative mb-8 h-28 w-28" />
        <div className="relative mt-auto max-w-md">
          <p className="mb-4 text-xs font-semibold tracking-[0.2em] text-ouro-300 uppercase">Guarnição IVAS</p>
          <h1 className="font-display text-4xl leading-tight font-semibold text-white">Faça parte da guarnição dos rituais.</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-mata-200">
            Cadastre-se para consultar vagas, se candidatar e acompanhar suas escalas no Guarnição.
          </p>
        </div>
        <p className="relative mt-12 text-xs text-mata-400">{instituto.nome}</p>
      </section>

      <section className="relative flex flex-col items-center justify-start bg-[#e7e0fa] px-5 pt-8 pb-8 lg:justify-center lg:bg-white lg:py-12">
        <img src="/icons/guarnicao-512.png" alt="Guarnição IVAS" width={96} height={96} className="relative mb-5 h-24 w-24 lg:hidden" />
        <div className="relative w-full max-w-md animate-surgir rounded-3xl bg-white/55 p-5 shadow-elevado ring-1 ring-white/70 backdrop-blur-md lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none lg:ring-0 lg:backdrop-blur-none">
          <div className="mb-8 hidden justify-center lg:flex">
            <MarcaInstituto instituto={instituto} altura={64} fundoClaro />
          </div>
          <h2 className="text-center text-2xl font-semibold tracking-tight text-stone-900 lg:text-3xl">{completar ? "Só mais um pouco" : "Criar cadastro"}</h2>
          <p className="mt-1 mb-5 text-center text-sm lg:mt-1.5 lg:mb-8 text-stone-500">
            {completar ? "Falta pouco: complete seus dados para terminar o cadastro." : aprovacaoAutomatica ? "Rápido: seu acesso já fica pronto para usar." : "Envie seus dados para análise da coordenação."}
          </p>
          <ParticipanteForm
            next={next}
            aprovacaoAutomatica={aprovacaoAutomatica}
            completar={completar}
            nomeInicial={usuario?.nome}
            fotoInicial={usuario?.foto}
            estadoPadrao={instituto.estado}
            cidadePadrao={instituto.cidade}
          />
        </div>
        <p className="relative mt-5 text-center text-sm font-medium text-stone-600">
          Já tem acesso? <Link href={`/login-guarnicao?next=${encodeURIComponent(next)}`} className="font-semibold text-mata-700 underline-offset-2 hover:underline">Entrar</Link>
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
