import type { Metadata, Viewport } from "next";
import { ShieldAlert } from "lucide-react";
import { classeTema, contextoGuarnicao, temaGuarnicao } from "@/lib/guarnicao-app";
import { DB_ID, TABLES } from "@/lib/config";
import { sair } from "@/app/login/actions";
import { TemaNoDocumento } from "./TemaNoDocumento";
import { MarcarPrimeiroAcesso } from "./MarcarPrimeiroAcesso";
import { TempoReal } from "./TempoReal";
import { AbasGuarnicao } from "./AbasGuarnicao";
import { Transicao } from "./Transicao";
import { NavegacaoApp } from "./NavegacaoApp";
import { Abertura, AvisoOffline, PuxarAtualizar } from "./nativo";
import { BotaoSair } from "./perfil/BotaoSair";

// App da Guarnição: PWA à parte, com manifesto, nome e cor próprios
export const metadata: Metadata = {
  title: { default: "App Guarnição IVAS", template: "%s · Guarnição IVAS" },
  description: "Escala dos guardiões nos rituais do Instituto IVAS: vagas, candidaturas, estatísticas e histórico.",
  // Imagem de compartilhamento do link (WhatsApp, Instagram, etc.)
  openGraph: { type: "website", siteName: "Guarnição IVAS", title: "App Guarnição IVAS", description: "Escala dos guardiões nos rituais do Instituto IVAS: vagas, candidaturas, estatísticas e histórico.", locale: "pt_BR", images: [{ url: "/icons/capa-guarnicao.jpg", width: 1200, height: 630, alt: "App Guarnição IVAS" }] },
  twitter: { card: "summary_large_image", title: "App Guarnição IVAS", description: "Escala dos guardiões nos rituais do Instituto IVAS: vagas, candidaturas, estatísticas e histórico.", images: ["/icons/capa-guarnicao.jpg"] },
  manifest: "/guarnicao-app.webmanifest",
  applicationName: "IVAS Guarnição",
  appleWebApp: { capable: true, title: "Guarnição IVAS", statusBarStyle: "black-translucent" },
  icons: { apple: "/icons/guarnicao-maskable-192.png" },
};
export const viewport: Viewport = { themeColor: "#1c1040", viewportFit: "cover" };

export default async function GuarnicaoLayout({ children }: LayoutProps<"/guarnicao">) {
  const [ctx, tema] = await Promise.all([contextoGuarnicao(), temaGuarnicao()]);
  const classe = classeTema(tema);

  if (!ctx)
    return (
      <main className="app-guarnicao grid min-h-dvh grid-rows-[1fr_auto] place-items-center bg-[#1c1040] px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-center text-white">
        <div className="max-w-sm">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15">
            <ShieldAlert size={28} />
          </span>
          <h1 className="mt-5 text-2xl font-semibold">Acesso só para a guarnição</h1>
          <p className="mt-2 text-sm leading-relaxed text-white/70">
            Este app é para guardiões e para a coordenação. Se você serve como guardião, peça para a coordenação marcar sua função no cadastro.
          </p>
        </div>
        <footer className="w-full max-w-sm">
          <BotaoSair sair={sair} rotulo="Sair da conta" />
        </footer>
      </main>
    );

  return (
    <div className={`app-guarnicao ${classe} min-h-dvh bg-stone-100 text-stone-900 [-webkit-tap-highlight-color:transparent]`}>
      <TemaNoDocumento classe={classe} />
      <MarcarPrimeiroAcesso />
      {/* overflow-x-clip: a tela nova entra deslizando pela lateral; sem cortar, a página fica mais larga que o celular por um instante e o navegador a encolhe (o menu fixo "pula") */}
      <NavegacaoApp>
      <div className="mx-auto min-h-dvh max-w-xl overflow-x-clip bg-stone-50 pb-[calc(7.25rem+env(safe-area-inset-bottom))] shadow-[0_0_60px_-20px_rgb(0_0_0/0.25)]">
        <AvisoOffline />
        {process.env.APPWRITE_ENDPOINT && process.env.APPWRITE_PROJECT_ID && (
          <TempoReal endpoint={process.env.APPWRITE_ENDPOINT} projeto={process.env.APPWRITE_PROJECT_ID} canal={`tablesdb.${DB_ID}.tables.${TABLES.sinais}.rows`} />
        )}
        <PuxarAtualizar>
          <Transicao>{children}</Transicao>
        </PuxarAtualizar>
      </div>
      <AbasGuarnicao visao={ctx.visao} />
      </NavegacaoApp>
      <Abertura />
    </div>
  );
}
