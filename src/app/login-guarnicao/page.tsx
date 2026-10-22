import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUsuario } from "@/lib/auth";
import { LoginForm } from "../login/LoginForm";

const TITULO = "App Guarnição IVAS";
const DESCRICAO = "Escala dos guardiões nos rituais do Instituto IVAS: vagas, candidaturas, estatísticas e histórico.";

// Login próprio do app da Guarnição: tem a sua identidade e a sua prévia de compartilhamento
export const metadata: Metadata = {
  title: TITULO,
  description: DESCRICAO,
  manifest: "/guarnicao-app.webmanifest",
  applicationName: "IVAS Guarnição",
  appleWebApp: { capable: true, title: "Guarnição IVAS", statusBarStyle: "black-translucent" },
  icons: { apple: "/icons/guarnicao-maskable-192.png" },
  openGraph: {
    type: "website",
    siteName: "Guarnição IVAS",
    title: TITULO,
    description: DESCRICAO,
    locale: "pt_BR",
    images: [{ url: "/icons/capa-guarnicao.jpg", width: 1200, height: 630, alt: TITULO }],
  },
  twitter: { card: "summary_large_image", title: TITULO, description: DESCRICAO, images: ["/icons/capa-guarnicao.jpg"] },
};

export default async function LoginGuarnicao({ searchParams }: PageProps<"/login-guarnicao">) {
  const sp = await searchParams;
  // Volta para a tela do app que a pessoa queria abrir (sempre dentro de /guarnicao)
  const next = typeof sp.next === "string" && sp.next.startsWith("/guarnicao") ? sp.next : "/guarnicao";
  const erroGoogle = sp.erro === "google" || sp.erro === "google-email";
  // Já logado (ex.: acabou de concluir o cadastro): segue direto para o app, sem pedir a senha de novo
  if (await getUsuario()) redirect(next);

  return (
    <main className="app-guarnicao relative isolate flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-[#1c1040] px-5 py-10 text-white">
      {/* Brilhos do escudo: violeta e laranja */}
      <div aria-hidden className="pointer-events-none absolute -top-32 -left-24 -z-10 h-80 w-80 rounded-full bg-[#7a52e3]/40 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -right-24 bottom-0 -z-10 h-80 w-80 rounded-full bg-[#f97316]/25 blur-3xl" />

      <div className="w-full max-w-sm animate-surgir">
        <div className="mb-7 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/guarnicao-512.png" alt="" width={104} height={104} className="h-26 w-26 drop-shadow-[0_12px_32px_rgb(122_82_227/0.65)]" />
          <p className="mt-4 text-xs font-bold tracking-[0.3em] text-orange-300 uppercase">Instituto IVAS</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Guarnição</h1>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-white/70">Entre para ver as vagas, se candidatar aos rituais e acompanhar a sua escala.</p>
        </div>

        <div className="rounded-3xl bg-white p-6 text-stone-900 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.7)] ring-1 ring-white/20">
          <h2 className="mb-5 text-center text-xl font-semibold tracking-tight">Entrar</h2>
          <LoginForm semPerfil={false} erroGoogle={erroGoogle} next={next} />
        </div>

        <p className="mt-6 text-center text-xs text-white/50">Acesso para guardiões e coordenação.</p>
      </div>
    </main>
  );
}
