"use server";

import { revalidatePath } from "next/cache";
import { ID } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { exigir } from "@/lib/auth";
import { apagarFotoDe, salvarContato, validarTelefone } from "@/lib/usuarios";
import type { Perfil } from "@/lib/config";

export type Resultado = { ok?: string; erro?: string } | undefined;
const PERFIS_VALIDOS: Perfil[] = ["admin", "mestre", "guardiao"];

export async function criarUsuario(_: Resultado, form: FormData): Promise<Resultado> {
  await exigir(["admin"]);
  const nome = String(form.get("nome") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const senha = String(form.get("senha") ?? "");
  const perfil = String(form.get("perfil")) as Perfil;
  if (!nome || !email) return { erro: "Informe nome e e-mail." };
  if (senha.length < 8) return { erro: "A senha precisa de pelo menos 8 caracteres." };
  if (!PERFIS_VALIDOS.includes(perfil)) return { erro: "Perfil inválido." };
  const tel = validarTelefone(String(form.get("telefone") ?? ""));
  if ("erro" in tel) return { erro: tel.erro };
  const { users } = createAdminClient();
  let userId: string;
  try {
    const u = await users.create({ userId: ID.unique(), email, password: senha, name: nome });
    userId = u.$id;
    await users.updateLabels({ userId, labels: [perfil] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    return { erro: msg.includes("already") ? "Já existe um usuário com esse e-mail." : "Não foi possível criar o usuário." };
  }
  const r = await salvarContato(userId, form, true);
  revalidatePath("/usuarios");
  if (r.erro) return { erro: `Usuário ${nome} criado, mas: ${r.erro}` };
  return { ok: `Usuário ${nome} criado.` };
}

export async function alterarPerfil(userId: string, perfil: Perfil) {
  const eu = await exigir(["admin"]);
  if (!PERFIS_VALIDOS.includes(perfil)) return { erro: "Perfil inválido." };
  if (userId === eu.id && perfil !== "admin") return { erro: "Você não pode tirar o seu próprio perfil de Admin." };
  const { users } = createAdminClient();
  await users.updateLabels({ userId, labels: [perfil] });
  revalidatePath("/usuarios");
  return { ok: "Perfil alterado." };
}

export async function redefinirSenha(userId: string, senha: string) {
  await exigir(["admin"]);
  if (senha.length < 8) return { erro: "A senha precisa de pelo menos 8 caracteres." };
  const { users } = createAdminClient();
  await users.updatePassword({ userId, password: senha });
  return { ok: "Senha redefinida." };
}

export async function excluirUsuario(userId: string) {
  const eu = await exigir(["admin"]);
  if (userId === eu.id) return { erro: "Você não pode excluir a própria conta." };
  const { users } = createAdminClient();
  await apagarFotoDe(userId);
  await users.delete({ userId });
  revalidatePath("/usuarios");
  return { ok: "Usuário excluído." };
}

/** Nome, telefone e foto: o Admin edita de qualquer um; cada pessoa edita os próprios (Meu perfil). */
export async function salvarDadosPessoais(_: Resultado, form: FormData): Promise<Resultado> {
  const eu = await exigir();
  const userId = String(form.get("userId") ?? "") || eu.id;
  if (userId !== eu.id && eu.perfil !== "admin") return { erro: "Sem permissão para editar outro usuário." };
  const nome = String(form.get("nome") ?? "").trim().slice(0, 128);
  if (!nome) return { erro: "Informe o nome." };
  const { users } = createAdminClient();
  try {
    await users.updateName({ userId, name: nome });
  } catch (e) {
    console.error(e);
    return { erro: "Não foi possível salvar o nome." };
  }
  // Só o Admin define a função nos rituais (Mestre/Guardião).
  const r = await salvarContato(userId, form, eu.perfil === "admin");
  if (r.erro) return { erro: r.erro };
  revalidatePath("/", "layout");
  return { ok: "Dados salvos." };
}
