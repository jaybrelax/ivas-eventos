"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/appwrite";
import { exigirSessao, podeSolicitarGuarnicao } from "@/lib/auth";
import { labelsComFuncao, salvarContato } from "@/lib/usuarios";
import { destinoAposCadastro } from "@/lib/destino-auth";
import { aprovacaoAutomaticaGuarnicao } from "@/lib/aprovacao-guarnicao";

export type Resultado = { ok?: string; erro?: string } | undefined;

/** O próprio participante (ou equipe) atualiza nome, telefone, endereço, gênero e foto. */
export async function salvarMeusDados(_: Resultado, form: FormData): Promise<Resultado> {
  const u = await exigirSessao();
  const guardiao = form.get("guardiao") === "1";
  if (guardiao && u.funcaoRitual !== "guardiao" && !podeSolicitarGuarnicao(u))
    return { erro: "Esta conta não pode solicitar a função de guardião. Fale com a coordenação." };
  const solicitarGuardiao = guardiao && u.funcaoRitual !== "guardiao";
  let automatico = true;
  if (solicitarGuardiao) {
    try { automatico = await aprovacaoAutomaticaGuarnicao(); }
    catch { return { erro: "Não foi possível consultar a aprovação da Guarnição. Tente novamente." }; }
  }
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

  // Concluindo o cadastro pelo Google com o link de divulgação para guardiões: vira guardião agora
  if (solicitarGuardiao) {
    // updatePrefs substitui tudo: mescla com o que o formulário acabou de salvar
    const atuais = await users.getPrefs({ userId: u.id });
    await users.updatePrefs({ userId: u.id, prefs: { ...atuais,
      funcao_ritual: automatico ? "guardiao" : "nenhuma",
      guarnicao_situacao: automatico ? null : "pendente",
      guarnicao_solicitacao: automatico ? null : true,
    } });
    if (automatico) {
      const conta = await users.get({ userId: u.id });
      await users.updateLabels({ userId: u.id, labels: labelsComFuncao(conta.labels, "guardiao") });
    }
  }

  revalidatePath("/minha-conta");
  revalidatePath("/minha-conta/dados");

  // Veio direto do cadastro pelo Google, completando os dados: segue para onde a pessoa ia antes.
  // Nos demais casos, salvou com sucesso → volta para Minhas inscrições.
  redirect(destinoAposCadastro(form.get("next"), guardiao, "/minha-conta?aba=proximos"));
}
