import { redirect } from "next/navigation";
import { ShieldOff } from "lucide-react";
import { getUsuario } from "@/lib/auth";
import { sair } from "@/app/login/actions";

export const metadata = { title: "Guarnição suspensa" };

export default async function GuarnicaoSuspensa() {
  const u = await getUsuario();
  if (!u) redirect("/login-guarnicao");
  if (!u.suspensoAte || u.funcaoRitual !== "guardiao" || u.perfil === "coordenador" || u.perfil === "admin") redirect("/guarnicao");
  const data = new Date(u.suspensoAte).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "long", year: "numeric" });
  return (
    <main className="app-guarnicao grid min-h-dvh place-items-center bg-[#1c1040] px-6 text-center text-white">
      <div className="max-w-sm">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15"><ShieldOff size={28} /></span>
        <h1 className="mt-5 text-2xl font-semibold">Guarnição suspensa</h1>
        <p className="mt-2 text-sm leading-relaxed text-white/75">Seu acesso como guardião está suspenso até {data}. Depois desse prazo, ele volta automaticamente. Fale com a coordenação se precisar de ajuda.</p>
        <form action={sair}><button type="submit" className="mt-6 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#1c1040]">Sair da conta</button></form>
      </div>
    </main>
  );
}
