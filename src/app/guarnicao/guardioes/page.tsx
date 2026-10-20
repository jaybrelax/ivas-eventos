import Link from "next/link";
import { ChevronRight, UsersRound } from "lucide-react";
import { contextoGuarnicao } from "@/lib/guarnicao-app";
import { diasDesde, rankingGuarnicao } from "@/lib/guarnicao-estatisticas";
import { Avatar } from "@/components/Avatar";
import { IconeGenero } from "@/components/genero";
import { CabecalhoApp, Vazio } from "../ui";

export const metadata = { title: "Guardiões" };

/** Todos os guardiões e guardiãs (guardiões e coordenação), com quantos rituais serviram e a última vez. */
export default async function GuardioesGuarnicao({ searchParams }: PageProps<"/guarnicao/guardioes">) {
  const { u, visao } = (await contextoGuarnicao("/guarnicao/guardioes"))!;
  const g = (await searchParams).genero;
  const filtro = g === "masculino" || g === "feminino" ? g : null;
  const todos = [...(await rankingGuarnicao())].sort((a, b) => a.nome.localeCompare(b.nome));
  const lista = filtro ? todos.filter((p) => p.sexo === filtro) : todos;
  const conta = (s: "masculino" | "feminino") => todos.filter((p) => p.sexo === s).length;

  return (
    <>
      <CabecalhoApp u={u} sobre={visao === "coordenador" ? "Coordenação" : undefined} titulo="Guardiões" />
      <div className="flex gap-2 overflow-x-auto px-5 pb-3">
        <Link href="/guarnicao/guardioes" className={`chip-app shrink-0 ${!filtro ? "chip-app-on" : ""}`}>Todos · {todos.length}</Link>
        <Link href="/guarnicao/guardioes?genero=masculino" className={`chip-app shrink-0 ${filtro === "masculino" ? "chip-app-on" : ""}`}>Guardiões · {conta("masculino")}</Link>
        <Link href="/guarnicao/guardioes?genero=feminino" className={`chip-app shrink-0 ${filtro === "feminino" ? "chip-app-on" : ""}`}>Guardiãs · {conta("feminino")}</Link>
      </div>

      {lista.length === 0 ? (
        <Vazio icone={<UsersRound size={26} />} titulo="Ninguém aqui ainda" texto="Pessoas com a função Guardião no cadastro aparecem nesta lista." />
      ) : (
        <ul className="mx-4 divide-y divide-stone-100 overflow-hidden rounded-3xl bg-white shadow-cartao ring-1 ring-stone-200/70">
          {lista.map((p) => (
            <li key={p.id}>
              <Link href={`/guarnicao/guardioes/${p.id}`} className="flex items-center gap-3 px-4 py-3 active:bg-stone-50">
                <Avatar nome={p.nome} foto={p.foto} tamanho={44} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 truncate text-sm font-semibold text-stone-900">{p.nome} {p.sexo && <IconeGenero genero={p.sexo} size={12} />}</span>
                  <span className="block text-xs text-stone-500">{p.ultimo ? `Último há ${diasDesde(p.ultimo)} dias` : "Ainda não serviu"}</span>
                </span>
                <span className="text-right">
                  <span className="block text-lg leading-none font-bold text-stone-900 tabular-nums">{p.total}</span>
                  <span className="text-[10px] text-stone-400">rituais</span>
                </span>
                <ChevronRight size={16} className="text-stone-300" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
