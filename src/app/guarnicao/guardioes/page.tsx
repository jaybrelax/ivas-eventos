import Link from "next/link";
import { UsersRound } from "lucide-react";
import { contextoGuarnicao } from "@/lib/guarnicao-app";
import { diasDesde, rankingGuarnicao } from "@/lib/guarnicao-estatisticas";
import { CabecalhoApp, Vazio } from "../ui";
import { ListaGuardioes } from "./ListaGuardioes";

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
        <ListaGuardioes pessoas={lista.map((p) => ({ id: p.id, nome: p.nome, foto: p.foto, sexo: p.sexo, total: p.total, ultimoTexto: p.ultimo ? `Último há ${diasDesde(p.ultimo)} dias` : "Ainda não serviu", suspenso: u.perfil === "coordenador" && !!p.suspensoAte }))} />
      )}
    </>
  );
}
