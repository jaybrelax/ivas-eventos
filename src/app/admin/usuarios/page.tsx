import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { exigir } from "@/lib/auth";
import { PODE, type Perfil } from "@/lib/config";
import { Titulo } from "@/components/Titulo";
import { ehParticipante, listarPendentes, perfilDosLabels, prefsDe } from "@/lib/usuarios";
import { Pendentes } from "./Pendentes";
import { GestaoUsuarios } from "./GestaoUsuarios";
import { todasCandidaturasAtivas } from "@/lib/guarnicao";
import { participacoesPorUsuario } from "@/lib/participacoes";

export default async function Usuarios() {
  const eu = await exigir(PODE.gerenciarUsuarios);
  const { users } = createAdminClient();
  const [lista, candidaturas, pendentes] = await Promise.all([users.list({ queries: [Query.limit(200), Query.orderAsc("name")] }), todasCandidaturasAtivas(), listarPendentes()]);
  const idsPendentes = new Set(pendentes.map((p) => p.id));
  const participacoes = await participacoesPorUsuario(candidaturas);
  // Cadastros pendentes ficam na seção própria, fora da lista principal; participantes (público) têm a própria área
  const us = lista.users.filter((u) => !idsPendentes.has(u.$id) && !ehParticipante(u.labels)).map((u) => {
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
      participacoes: participacoes.get(u.$id) ?? [],
    };
  });
  return (
    <>
      <Titulo sobre="Administração" titulo="Usuários" subtitulo="Quem acessa o painel e com qual perfil." />
      <Pendentes lista={pendentes} />
      <GestaoUsuarios us={us} euId={eu.id} />
    </>
  );
}
