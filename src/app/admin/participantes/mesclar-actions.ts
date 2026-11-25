"use server";

import { revalidatePath } from "next/cache";
import { exigir } from "@/lib/auth";
import { mesclarContas, resumoDaConta, type ResumoConta } from "@/lib/mesclar-contas";

/** Números de uma conta para a tela de confirmação da mescla (só admin). */
export async function resumoContaAction(id: string): Promise<ResumoConta | null> {
  await exigir(["admin"]);
  return resumoDaConta(String(id ?? ""));
}

/** Junta duas contas da mesma pessoa: a `origem` some e tudo o que era dela passa para o `destino` (só admin). */
export async function mesclarContasAction(origemId: string, destinoId: string): Promise<{ ok?: string; erro?: string }> {
  const u = await exigir(["admin"]);
  try {
    const r = await mesclarContas(String(origemId ?? ""), String(destinoId ?? ""), u.id);
    if (r.ok) {
      revalidatePath("/admin", "layout");
      revalidatePath("/", "layout");
    }
    return r;
  } catch (e) {
    console.error("Mesclar contas:", e instanceof Error ? e.message : e);
    return { erro: "Não foi possível terminar a mescla agora. Pode tentar de novo: o que já passou de uma conta para a outra não se repete." };
  }
}
