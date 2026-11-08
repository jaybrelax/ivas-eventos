"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/appwrite";
import { exigirSessao } from "@/lib/auth";
import { salvarContato } from "@/lib/usuarios";
import { destinoGuarnicao } from "@/lib/destino-auth";
import { sinalizarMudanca } from "@/lib/tempo-real";

export type Resultado = { ok?: string; erro?: string } | undefined;

/** O próprio usuário atualiza nome, telefone, endereço, gênero e foto no Guarnição. */
export async function salvarMeusDados(_: Resultado, form: FormData): Promise<Resultado> {
  const u = await exigirSessao();
  const nome = String(form.get("nome") ?? "").trim().replace(/\s+/g, " ").slice(0, 128);
  if (!nome) return { erro: "Informe o nome." };

  const { users } = createAdminClient();
  try {
    await users.updateName({ userId: u.id, name: nome });
  } catch (e) {
    console.error(e);
    return { erro: "Não foi possível salvar o nome." };
  }

  const r = await salvarContato(u.id, form);
  if (r.erro) return { erro: r.erro };

  await sinalizarMudanca();
  revalidatePath("/guarnicao/perfil");
  redirect(destinoGuarnicao(form.get("next")));
}
