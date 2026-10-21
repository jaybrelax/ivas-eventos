import { contextoGuarnicao, temaGuarnicao } from "@/lib/guarnicao-app";
import { getDadosInstituto } from "@/lib/data";
import { PERFIS } from "@/lib/config";
import { Avatar } from "@/components/Avatar";
import { MeusDadosForm } from "@/app/minha-conta/MeusDadosForm";
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
  const [{ instituto }, tema] = await Promise.all([getDadosInstituto(), temaGuarnicao()]);
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
            {[u.funcaoRitual === "guardiao" ? (u.sexo === "feminino" ? "Guardiã" : "Guardião") : null, perfil].filter(Boolean).join(" · ")}
          </p>
        </div>
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
                  className={`h-11 w-full rounded-2xl text-sm font-semibold transition active:scale-[0.98] ${v === visao ? "bg-[#1c1040] text-white" : "bg-stone-100 text-stone-700"}`}
                >
                  {v === "coordenador" ? "Coordenador" : "Guardião"}
                </button>
              </form>
            ))}
          </div>
        </section>
      )}

      <SeletorTema atual={tema} />

      <Notificacoes />

      <InstalarGuarnicao />

      <section className="mx-4 mt-4 rounded-3xl bg-white p-5 shadow-cartao ring-1 ring-stone-200/70">
        <h2 className="mb-4 text-base font-semibold text-stone-900">Meus dados</h2>
        <MeusDadosForm
          nome={u.nome} email={u.email} telefone={u.telefone} endereco={u.endereco} sexo={u.sexo} foto={u.foto}
          cpf={u.cpf} dataNascimento={u.dataNascimento} next="/guarnicao/perfil" semFoto
          estado={u.estado ?? instituto.estado} cidade={u.estado ? u.cidade : instituto.cidade}
          profissao={u.profissao} experiencia={u.experiencia} motivacao={u.motivacao} expectativas={u.expectativas}
        />
      </section>

      <BotaoSair sair={sair} />
    </>
  );
}
