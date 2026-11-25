import "server-only";
import { Query } from "node-appwrite";
import { createAdminClient } from "./appwrite";
import { prefsDe } from "./usuarios";
import { ehContaRapida, escolherContaRapida } from "./conta-rapida-regras";

/**
 * Cadastro rápido (sem senha) que é a mesma pessoa de quem está se cadastrando agora, pelo e-mail ou pelo telefone.
 * Devolve o id da conta ou null (nenhuma, ou mais de uma: nesse caso a coordenação resolve em Mesclar contas).
 * Este arquivo existe igual nos dois apps (Eventos e Guarnição).
 */
export async function buscarContaRapida(novo: { email?: string | null; telefone?: string | null }): Promise<string | null> {
  const { users } = createAdminClient();
  // Contas novas primeiro: o cadastro rápido costuma ser recente
  const res = await users.list({ queries: [Query.limit(500), Query.orderDesc("$createdAt")] });
  const candidatas = res.users
    .filter((u) => ehContaRapida({ labels: u.labels, prefs: u.prefs as Record<string, unknown>, passwordUpdate: u.passwordUpdate }))
    .map((u) => ({ id: u.$id, email: u.email || null, telefone: prefsDe(u.prefs).telefone, rapida: true }));
  return escolherContaRapida(candidatas, novo)?.id ?? null;
}

/**
 * A pessoa passa a usar a conta rápida: ganha e-mail, senha e o nome que digitou, perde a marca de "avulso" e mantém
 * tudo que já estava ligado a ela (inscrições, créditos, histórico). A conta nova NÃO é criada.
 * O e-mail é o primeiro passo: se já existir outra conta com ele, o Appwrite recusa e nada muda.
 */
export async function assumirContaRapida(
  id: string,
  d: { email: string; senha?: string; nome: string; labels: string[]; prefs: Record<string, unknown> },
): Promise<void> {
  const { users } = createAdminClient();
  const atual = await users.get({ userId: id });
  if ((atual.email ?? "").toLowerCase() !== d.email.toLowerCase()) await users.updateEmail({ userId: id, email: d.email });
  if (d.senha) await users.updatePassword({ userId: id, password: d.senha });
  await users.updateName({ userId: id, name: d.nome });
  await users.updateLabels({ userId: id, labels: [...new Set([...(atual.labels ?? []).filter((l) => l !== "avulso"), ...d.labels])] });
  const resto = { ...((atual.prefs ?? {}) as Record<string, unknown>) };
  delete resto.avulso;
  delete resto.incluido_por;
  await users.updatePrefs({ userId: id, prefs: { ...resto, ...d.prefs, conta_rapida_assumida_em: new Date().toISOString() } });
}

/** Quem entrou pelo Google com o e-mail de um cadastro rápido: a conta deixa de ser "avulso" (já é a pessoa). */
export async function liberarContaRapida(id: string): Promise<void> {
  const { users } = createAdminClient();
  const atual = await users.get({ userId: id });
  const resto = { ...((atual.prefs ?? {}) as Record<string, unknown>) };
  delete resto.avulso;
  delete resto.incluido_por;
  await users.updateLabels({ userId: id, labels: (atual.labels ?? []).filter((l) => l !== "avulso") });
  await users.updatePrefs({ userId: id, prefs: { ...resto, conta_rapida_assumida_em: new Date().toISOString() } });
}

/**
 * Conta nova do Google que completou o cadastro com o telefone de um cadastro rápido: o e-mail, o nome, a foto e as
 * preferências passam para a conta rápida, a conta nova (vazia) é apagada e a pessoa entra na conta rápida.
 * O próximo login pelo Google acha a conta pelo e-mail. Devolve a sessão da conta rápida.
 */
export async function juntarGoogleNaContaRapida(rapidaId: string, googleId: string): Promise<{ secret: string; expire: string }> {
  const { users } = createAdminClient();
  const g = await users.get({ userId: googleId });
  const email = g.email;
  await users.delete({ userId: googleId });
  await assumirContaRapida(rapidaId, { email, nome: g.name || email, labels: g.labels ?? [], prefs: { ...((g.prefs ?? {}) as Record<string, unknown>) } });
  const sessao = await users.createSession({ userId: rapidaId });
  return { secret: sessao.secret, expire: sessao.expire };
}
