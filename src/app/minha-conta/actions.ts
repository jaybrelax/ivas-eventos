"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/appwrite";
import { exigirSessao } from "@/lib/auth";
import { salvarContato } from "@/lib/usuarios";
import { comParticiparAberto } from "@/lib/links";

export type Resultado = { ok?: string; erro?: string } | undefined;

/** Só aceita um caminho interno (evita mandar o formulário para outro site). */
function destinoSeguro(next: unknown): string | null {
  const n = String(next ?? "");
  return n.startsWith("/") && !n.startsWith("//") ? n : null;
}

/** O próprio participante (ou equipe) atualiza nome, telefone, endereço, gênero e foto. */
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

  revalidatePath("/minha-conta");
  revalidatePath("/minha-conta/dados");

  // Veio direto do cadastro pelo Google, completando os dados: segue para onde a pessoa ia antes.
  // Nos demais casos, salvou com sucesso → volta para Minhas inscrições.
  const destino = destinoSeguro(form.get("next"));
  redirect(destino ? comParticiparAberto(destino) : "/minha-conta?aba=proximos");
}
