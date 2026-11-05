import Link from "next/link";
import { UserRound } from "lucide-react";
import { contextoGuarnicao, temaGuarnicao } from "@/lib/guarnicao-app";
import { PERFIS } from "@/lib/config";
import { Avatar } from "@/components/Avatar";
import { sair } from "@/app/login/actions";
import { trocarVisao } from "../actions";
import { CabecalhoApp } from "../ui";
import { InstalarGuarnicao } from "./InstalarGuarnicao";
import { SeletorTema } from "./SeletorTema";
import { BotaoSair } from "./BotaoSair";
import { Notificacoes } from "./Notificacoes";
import { MenuFoto } from "./MenuFoto";

export const metadata = { title: "Perfil" };

export default async function PerfilGuarnicao() {
  const { u, visoes, visao } = (await contextoGuarnicao("/guarnicao/perfil"))!;
  const tema = await temaGuarnicao();
  const perfil = PERFIS.find((p) => p.id === u.perfil)?.nome;

  return (
    <>
      <CabecalhoApp u={u} titulo="Perfil" />

      <section className="relative mx-4 flex items-center gap-4 rounded-3xl bg-white p-5 pr-12 shadow-cartao ring-1 ring-stone-200/70">
        <MenuFoto temFoto={!!u.foto} avatar={<Avatar nome={u.nome} foto={u.foto} perfil={u.perfil} tamanho={64} />} />
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-stone-900">{u.nome}</p>
          <p className="truncate text-sm text-stone-500">{u.email}</p>
          <p className="mt-1 text-xs font-semibold text-emerald-700">
            {[u.funcaoRitual === "guardiao" ? (u.sexo === "feminino" ? "Guardiã" : "Guardião") : u.funcaoRitual === "mestre" ? "Mestre" : null, perfil].filter(Boolean).join(" · ")}
          </p>
        </div>
      </section>

      <section className="mx-4 mt-4 rounded-3xl bg-white p-5 shadow-cartao ring-1 ring-stone-200/70">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-mata-50 text-mata-700">
            <UserRound size={21} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-stone-900">Meus dados</h2>
            <p className="mt-0.5 text-sm leading-snug text-stone-500">Atualize suas informações pessoais, contato, endereço e dados do seu perfil.</p>
          </div>
        </div>
        <Link href="/guarnicao/perfil/dados" className="mt-4 flex h-11 w-full items-center justify-center rounded-2xl bg-mata-50 text-sm font-bold text-mata-700 transition active:scale-[0.98]">
          Editar meus dados
        </Link>
      </section>

      {/* Quem é coordenador e guardião escolhe a visão */}
      {visoes.length > 1 && (
        <section className="mx-4 mt-4 rounded-3xl bg-white p-2 shadow-cartao ring-1 ring-stone-200/70">
          <p className="px-3 pt-2 pb-1 text-xs font-semibold tracking-wider text-stone-500 uppercase">Usar o app como</p>
          <div className="grid grid-cols-2 gap-1.5 p-1">
            {visoes.map((v) => (
              <form key={v} action={trocarVisao.bind(null, v)}>
                <button
                  type="submit"
                  className={`h-11 w-full rounded-2xl text-sm font-semibold transition active:scale-[0.98] ${v === visao ? "bg-emerald-600 text-white" : "bg-stone-100 text-stone-700"}`}
                >
                  {v === "coordenador" ? "Coordenador" : v === "mestre" ? "Mestre" : "Guardião"}
                </button>
              </form>
            ))}
          </div>
        </section>
      )}

      <SeletorTema atual={tema} />

      <Notificacoes />

      <InstalarGuarnicao />

      <BotaoSair sair={sair} />
    </>
  );
}
