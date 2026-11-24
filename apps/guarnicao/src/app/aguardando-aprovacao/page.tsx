import type { Metadata } from "next";
import Link from "next/link";
import { Clock3 } from "lucide-react";

export const metadata: Metadata = { title: "Cadastro em análise · Guarnição IVAS", robots: { index: false } };

export default function AguardandoAprovacao() {
  return (
    <main className="app-guarnicao grid min-h-dvh place-items-center bg-[#1c1040] px-5 text-white">
      <div className="w-full max-w-sm rounded-3xl bg-white p-7 text-center text-stone-900 shadow-xl">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-amber-100 text-amber-700"><Clock3 size={30} /></span>
        <h1 className="mt-5 text-2xl font-bold">Cadastro em análise</h1>
        <p className="mt-3 text-sm leading-relaxed text-stone-600">Seus dados foram recebidos. A coordenação precisa aprovar seu acesso à Guarnição. Depois da aprovação, entre com seu e-mail e senha ou com o Google.</p>
        <Link href="/login-guarnicao" className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-xl bg-emerald-600 font-semibold text-white">Ir para o login</Link>
      </div>
    </main>
  );
}
