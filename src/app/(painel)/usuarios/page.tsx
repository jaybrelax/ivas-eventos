import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { exigir } from "@/lib/auth";
import { PODE, type Perfil } from "@/lib/config";
import { Titulo } from "@/components/Titulo";
import { perfilDosLabels, prefsDe } from "@/lib/usuarios";
import { GestaoUsuarios } from "./GestaoUsuarios";

export default async function Usuarios() {
  const eu = await exigir(PODE.gerenciarUsuarios);
  const { users } = createAdminClient();
  const lista = await users.list({ queries: [Query.limit(200), Query.orderAsc("name")] });
  const us = lista.users.map((u) => {
    const p = prefsDe(u.prefs);
    return {
      id: u.$id,
      nome: u.name || u.email,
      email: u.email,
      perfil: perfilDosLabels(u.labels) as Perfil | null,
      telefone: p.telefone,
      foto: p.foto_file_id,
      funcaoRitual: p.funcao_ritual,
      sexo: p.sexo,
    };
  });
  return (
    <>
      <Titulo sobre="Administração" titulo="Usuários" subtitulo="Quem acessa o painel e com qual perfil." />
      <GestaoUsuarios us={us} euId={eu.id} />
    </>
  );
}
