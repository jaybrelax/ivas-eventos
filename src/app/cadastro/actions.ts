"use server";

import { cookies } from "next/headers";
import { limitarCadastro } from "@/lib/limite-cadastro";
import { redirect } from "next/navigation";
import { ID } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { LABEL_PARTICIPANTE, SESSION_COOKIE, DOMINIO_COOKIE } from "@/lib/config";
import { exigirSessao, podeSolicitarGuarnicao } from "@/lib/auth";
import { labelsComFuncao, salvarContato, validarTelefone } from "@/lib/usuarios";
import { assumirContaRapida, buscarContaRapida, juntarGoogleNaContaRapida } from "@/lib/conta-rapida";
import { contaSemRegistros } from "@/lib/conta-vazia";
import type { Sexo } from "@/lib/types";
import { ehUf } from "@/lib/perfil-extra";
import { destinoAposCadastro } from "@/lib/destino-auth";
import { conferirDadosObrigatorios } from "./dados-obrigatorios";
import { aprovacaoAutomaticaGuarnicao } from "@/lib/aprovacao-guarnicao";

export type ResultadoCadastro = { erro?: string } | undefined;

/**
 * Cadastro público de participante: diferente do cadastro da equipe, a conta já nasce
 * ativa (sem aprovação) e, ao concluir, a pessoa já entra direto na própria área.
 */
export async function cadastrarParticipante(_: ResultadoCadastro, form: FormData): Promise<ResultadoCadastro> {
  // Campo escondido que só robôs preenchem
  if (String(form.get("site") ?? "")) return undefined;

  const trava = await limitarCadastro();
  if (trava) return { erro: trava };

  const nome = String(form.get("nome") ?? "").trim().replace(/\s+/g, " ").slice(0, 128);
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const senha = String(form.get("senha") ?? "");
  const confirmar = String(form.get("confirmar") ?? "");
  const sexo = String(form.get("sexo") ?? "") as Sexo;
  // Link da divulgação para guardiões (/cadastro?guardiao): o cadastro já nasce como guardião
  const guardiao = form.get("guardiao") === "1";

  if (nome.split(" ").length < 2) return { erro: "Informe nome e sobrenome." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { erro: "Informe um e-mail válido." };
  if (sexo !== "masculino" && sexo !== "feminino") return { erro: "Escolha o gênero." };
  if (senha.length < 8) return { erro: "A senha precisa de pelo menos 8 caracteres." };
  if (senha !== confirmar) return { erro: "As senhas não conferem." };
  const tel = validarTelefone(String(form.get("telefone") ?? ""));
  if ("erro" in tel) return { erro: tel.erro };
  if (!tel.valor) return { erro: "Informe o telefone (WhatsApp)." };
  if (!ehUf(String(form.get("estado") ?? ""))) return { erro: "Escolha o estado." };
  if (!String(form.get("cidade") ?? "").trim()) return { erro: "Escolha a cidade." };
  const faltando = conferirDadosObrigatorios(form);
  if (faltando) return { erro: faltando };

  let automatico = true;
  if (guardiao) {
    try { automatico = await aprovacaoAutomaticaGuarnicao(); }
    catch { return { erro: "Não foi possível consultar a aprovação da Guarnição. Tente novamente." }; }
  }

  const { account, users } = createAdminClient();
  // Cadastro rápido da mesma pessoa (pelo e-mail ou telefone): ela passa a usar essa conta, com as participações dela
  const rapida = await buscarContaRapida({ email, telefone: tel.valor }).catch((e) => { console.error("Buscar conta rápida:", e instanceof Error ? e.message : e); return null; });
  let userId: string | null = null;
  let criada = false;
  const labelsNovas = guardiao && automatico ? [LABEL_PARTICIPANTE, "guardiao"] : [LABEL_PARTICIPANTE];
  const prefsNovas = {
    funcao_ritual: guardiao && automatico ? "guardiao" : "nenhuma",
    ...(guardiao && !automatico ? { guarnicao_situacao: "pendente", guarnicao_solicitacao: true } : {}),
  };
  try {
    if (rapida) {
      // Valida e salva os dados antes de mexer no e-mail e na senha: se algo estiver errado, a conta fica como estava
      const r0 = await salvarContato(rapida, form);
      if (r0.erro) return { erro: r0.erro };
      userId = rapida;
      await assumirContaRapida(rapida, { email, senha, nome, labels: labelsNovas, prefs: prefsNovas });
    } else {
      const u = await users.create({ userId: ID.unique(), email, password: senha, name: nome });
      userId = u.$id;
      criada = true;
      await users.updateLabels({ userId, labels: labelsNovas });
      await users.updatePrefs({ userId, prefs: prefsNovas });
      const r = await salvarContato(userId, form);
      if (r.erro) {
        await users.delete({ userId }).catch(() => {});
        return { erro: r.erro };
      }
    }
    // Conta já ativa: entra direto, sem precisar logar de novo.
    const sessao = await account.createEmailPasswordSession({ email, password: senha });
    (await cookies()).set(SESSION_COOKIE, sessao.secret, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      ...DOMINIO_COOKIE,
      expires: new Date(sessao.expire),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("already")) return { erro: "Já existe um cadastro com esse e-mail. Esqueceu a senha? Fale com a coordenação." };
    if (userId && criada) await users.delete({ userId }).catch(() => {});
    console.error("Cadastro de participante:", msg);
    return { erro: "Não foi possível concluir o cadastro agora. Tente de novo em instantes." };
  }
  // Veio de uma página de evento: volta para ela, já com a janela de confirmação aberta.
  // Cadastro direto: completa os dados e depois vê o próximo ritual em Minhas inscrições.
  redirect(destinoAposCadastro(form.get("next"), guardiao, "/minha-conta/dados?bemvindo=1"));
}

/**
 * Conclui o cadastro de quem entrou pelo botão do Google (a conta já existe e já está logada:
 * falta telefone, estado/cidade e gênero). Continua na própria tela de cadastro, sem página à parte.
 */
export async function completarCadastroGoogle(_: ResultadoCadastro, form: FormData): Promise<ResultadoCadastro> {
  const u = await exigirSessao();
  const sexo = String(form.get("sexo") ?? "") as Sexo;
  // Link da divulgação para guardiões (/cadastro?guardiao): o cadastro já nasce como guardião
  const guardiao = form.get("guardiao") === "1";
  if (guardiao && u.funcaoRitual !== "guardiao" && !podeSolicitarGuarnicao(u))
    return { erro: "Esta conta não pode solicitar a função de guardião. Fale com a coordenação." };
  const solicitarGuardiao = guardiao && u.funcaoRitual !== "guardiao";

  if (sexo !== "masculino" && sexo !== "feminino") return { erro: "Escolha o gênero." };
  const tel = validarTelefone(String(form.get("telefone") ?? ""));
  if ("erro" in tel) return { erro: tel.erro };
  if (!tel.valor) return { erro: "Informe o telefone (WhatsApp)." };
  if (!ehUf(String(form.get("estado") ?? ""))) return { erro: "Escolha o estado." };
  if (!String(form.get("cidade") ?? "").trim()) return { erro: "Escolha a cidade." };
  const faltando = conferirDadosObrigatorios(form);
  if (faltando) return { erro: faltando };

  let automatico = true;
  if (solicitarGuardiao) {
    try { automatico = await aprovacaoAutomaticaGuarnicao(); }
    catch { return { erro: "Não foi possível consultar a aprovação da Guarnição. Tente novamente." }; }
  }

  // Telefone de um cadastro rápido e esta conta do Google ainda sem registros: junta tudo na conta rápida
  let contaId = u.id;
  try {
    const rapida = await buscarContaRapida({ email: u.email, telefone: tel.valor });
    if (rapida && rapida !== u.id && (await contaSemRegistros(u.id))) {
      const r0 = await salvarContato(rapida, form);
      if (r0.erro) return { erro: r0.erro };
      const sessao = await juntarGoogleNaContaRapida(rapida, u.id);
      contaId = rapida;
      (await cookies()).set(SESSION_COOKIE, sessao.secret, {
        httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", ...DOMINIO_COOKIE, expires: new Date(sessao.expire),
      });
    }
  } catch (e) {
    console.error("Juntar Google ao cadastro rápido:", e instanceof Error ? e.message : e);
  }

  const r = await salvarContato(contaId, form);
  if (r.erro) return { erro: r.erro };

  if (solicitarGuardiao) {
    const { users } = createAdminClient();
    // updatePrefs substitui tudo: mescla com o que o formulário acabou de salvar (gênero, telefone, endereço…)
    const atuais = await users.getPrefs({ userId: contaId });
    await users.updatePrefs({ userId: contaId, prefs: { ...atuais,
      funcao_ritual: automatico ? "guardiao" : "nenhuma",
      guarnicao_situacao: automatico ? null : "pendente",
      guarnicao_solicitacao: automatico ? null : true,
    } });
    if (automatico) {
      const conta = await users.get({ userId: contaId });
      await users.updateLabels({ userId: contaId, labels: labelsComFuncao(conta.labels, "guardiao") });
    }
  }
  redirect(destinoAposCadastro(form.get("next"), guardiao, "/minha-conta?aba=proximos", u.perfil));
}
