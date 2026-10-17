import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { exigir } from "@/lib/auth";
import { PERFIS, PODE, type Perfil } from "@/lib/config";
import { Crown, Flame, Shield } from "lucide-react";
import { Titulo } from "@/components/Titulo";
import { perfilDosLabels, prefsDe } from "@/lib/usuarios";
import { LinhaUsuario, NovoUsuario } from "./Usuarios";

export default async function Usuarios() {
  const eu = await exigir(PODE.gerenciarUsuarios);
  const { users } = createAdminClient();
  const lista = await users.list({ queries: [Query.limit(200), Query.orderAsc("name")] });
  const us = lista.users.map((u) => ({
    id: u.$id,
    nome: u.name || u.email,
    email: u.email,
    perfil: (PERFIS.find((p) => u.labels?.includes(p.id))?.id ?? null) as Perfil | null,
    ...(() => {
      const p = prefsDe(u.prefs, perfilDosLabels(u.labels));
      return { telefone: p.telefone, foto: p.foto_file_id, funcaoRitual: p.funcao_ritual, sexo: p.sexo };
    })(),
  }));
  const icones = { admin: Crown, mestre: Flame, guardiao: Shield } as const;
  return (
    <>
      <Titulo sobre="Administração" titulo="Usuários" subtitulo="Quem acessa o painel e com qual perfil." />
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {PERFIS.map((p) => {
          const Icone = icones[p.id];
          const n = us.filter((u) => u.perfil === p.id).length;
          return (
            <div key={p.id} className="cartao flex gap-3.5 p-4 sm:p-5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-stone-100 text-stone-600"><Icone size={18} /></span>
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-semibold text-stone-900">{p.nome}<span className="chip bg-stone-100 text-stone-500 tabular-nums">{n}</span></p>
                <p className="mt-0.5 text-sm text-stone-500">{p.descricao}</p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="space-y-6">
        <NovoUsuario />
        <section className="cartao overflow-hidden p-0 sm:p-0">
          <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4 sm:px-6">
            <h2 className="cartao-titulo">Pessoas com acesso</h2>
            <span className="chip bg-stone-100 text-stone-600 tabular-nums">{us.length}</span>
          </div>
          <ul className="divide-y divide-stone-100">{us.map((u) => <LinhaUsuario key={u.id + u.perfil} u={u} souEu={u.id === eu.id} />)}</ul>
        </section>
      </div>
    </>
  );
}
