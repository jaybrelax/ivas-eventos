"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/appwrite";
import { contextoGuarnicao } from "@/lib/guarnicao-app";
import { retirarParticipacoesFuturas, type Resultado } from "@/lib/guarnicao";
import { labelsComFuncao, prefsDe } from "@/lib/usuarios";
import { fimSuspensao, suspensaoAtiva } from "@/lib/suspensao-guarnicao";
import { sinalizarMudanca } from "@/lib/tempo-real";

async function alvoDoCoordenador(userId: string) {
  const ctx = await contextoGuarnicao();
  if (!ctx || (ctx.u.perfil !== "coordenador" && ctx.u.perfil !== "admin"))
    return { erro: "Só a coordenação pode alterar a situação de um guardião." } as const;
  if (!userId || userId.length > 64 || userId === ctx.u.id) return { erro: "Guardião inválido." } as const;
  const { users } = createAdminClient();
  const conta = await users.get({ userId }).catch(() => null);
  if (!conta || !conta.status || prefsDe(conta.prefs).funcao_ritual !== "guardiao") return { erro: "Guardião não encontrado." } as const;
  return { users, conta, coordenadorId: ctx.u.id } as const;
}

async function revalidar(userId: string) {
  await sinalizarMudanca(userId); // avisa os apps abertos (o sinal é por id; aqui o id do guardião)
  revalidatePath("/guarnicao", "layout");
  revalidatePath("/guarnicao/guardioes");
  revalidatePath(`/guarnicao/guardioes/${userId}`);
  revalidatePath("/guarnicao/estatisticas");
}

/** Impede novas candidaturas feitas pelo guardião por 3 ou 6 meses de calendário. */
export async function suspenderGuardiao(userId: string, meses: number): Promise<Resultado> {
  const alvo = await alvoDoCoordenador(userId);
  if ("erro" in alvo) return { erro: alvo.erro };
  if (meses !== 3 && meses !== 6) return { erro: "Escolha 3 ou 6 meses." };
  const ate = fimSuspensao(meses);
  try {
    await alvo.users.updatePrefs({ userId, prefs: { ...alvo.conta.prefs, guarnicao_suspenso_ate: ate } });
  } catch (e) {
    console.error("Suspender guardião:", e);
    return { erro: "Não foi possível aplicar a suspensão." };
  }
  await revalidar(userId);
  return { ok: "Candidaturas suspensas. O guardião continua com acesso ao aplicativo e poderá se candidatar novamente ao fim do prazo." };
}

/** Permite que o guardião volte a se candidatar imediatamente. */
export async function removerSuspensaoGuardiao(userId: string): Promise<Resultado> {
  const alvo = await alvoDoCoordenador(userId);
  if ("erro" in alvo) return { erro: alvo.erro };
  if (!suspensaoAtiva(prefsDe(alvo.conta.prefs).guarnicao_suspenso_ate)) return { erro: "Este guardião não está suspenso." };
  try {
    await alvo.users.updatePrefs({ userId, prefs: { ...alvo.conta.prefs, guarnicao_suspenso_ate: null } });
  } catch (e) {
    console.error("Remover suspensão do guardião:", e);
    return { erro: "Não foi possível remover a suspensão." };
  }
  await revalidar(userId);
  return { ok: "Suspensão removida. O guardião já pode se candidatar novamente." };
}

/** Retira só a função de guardião; a conta e o histórico permanecem. */
export async function retirarCargoGuardiao(userId: string): Promise<Resultado> {
  const alvo = await alvoDoCoordenador(userId);
  if ("erro" in alvo) return { erro: alvo.erro };
  try {
    await alvo.users.updateLabels({ userId, labels: labelsComFuncao(alvo.conta.labels, "nenhuma") });
    await alvo.users.updatePrefs({ userId, prefs: { ...alvo.conta.prefs,
      funcao_ritual: "nenhuma", guarnicao_suspenso_ate: null, guarnicao_cargo_removido: true,
      guarnicao_situacao: null, guarnicao_solicitacao: null, cadastro_guarnicao_incompleto: null,
    } });
  } catch (e) {
    console.error("Retirar cargo de guardião:", e);
    return { erro: "Não foi possível retirar a função de guardião." };
  }
  await revalidar(userId);
  try {
    await retirarParticipacoesFuturas(userId, alvo.coordenadorId);
  } catch (e) {
    console.error("Retirar escalas do antigo guardião:", e);
    return { erro: "O cargo foi retirado, mas não foi possível retirar todas as participações futuras. Fale com o suporte." };
  }
  return { ok: "Função de guardião retirada. A conta e o histórico foram mantidos." };
}
