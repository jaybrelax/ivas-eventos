"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ID } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { LABEL_PARTICIPANTE, SESSION_COOKIE } from "@/lib/config";
import { exigirSessao, podeSolicitarGuarnicao } from "@/lib/auth";
import { labelsComFuncao, salvarContato, validarTelefone } from "@/lib/usuarios";
import type { Sexo } from "@/lib/types";
import { ehUf } from "@/lib/perfil-extra";
import { destinoGuarnicao } from "@/lib/destino-auth";
import { aprovacaoAutomaticaGuarnicao } from "@/lib/aprovacao-guarnicao";
import { sinalizarMudanca } from "@/lib/tempo-real";
import { conferirDadosObrigatorios } from "./dados-obrigatorios";

export type ResultadoCadastro = { erro?: string } | undefined;

/** Cadastro de guardião: acesso imediato ou análise da coordenação, conforme a configuração. */
export async function cadastrarParticipante(_: ResultadoCadastro, form: FormData): Promise<ResultadoCadastro> {
  // Campo escondido que só robôs preenchem
  if (String(form.get("site") ?? "")) return undefined;

  const nome = String(form.get("nome") ?? "").trim().replace(/\s+/g, " ").slice(0, 128);
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const senha = String(form.get("senha") ?? "");
  const confirmar = String(form.get("confirmar") ?? "");
  const sexo = String(form.get("sexo") ?? "") as Sexo;

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

  let automatico: boolean;
  try {
    automatico = await aprovacaoAutomaticaGuarnicao();
  } catch (e) {
    console.error("Configuração de aprovação da Guarnição:", e);
    return { erro: "Não foi possível consultar a aprovação de cadastros. Tente novamente." };
  }

  const { account, users } = createAdminClient();
  let userId: string | null = null;
  try {
    const u = await users.create({ userId: ID.unique(), email, password: senha, name: nome });
    userId = u.$id;
    await users.updateLabels({ userId, labels: automatico ? [LABEL_PARTICIPANTE, "guardiao"] : [LABEL_PARTICIPANTE] });
    await users.updatePrefs({ userId, prefs: automatico
      ? { funcao_ritual: "guardiao" }
      : { funcao_ritual: "nenhuma", guarnicao_situacao: "pendente", guarnicao_solicitacao: true } });
    const r = await salvarContato(userId, form);
    if (r.erro) {
      await users.delete({ userId }).catch(() => {});
      return { erro: r.erro };
    }
    if (automatico) {
      const sessao = await account.createEmailPasswordSession({ email, password: senha });
      (await cookies()).set(SESSION_COOKIE, sessao.secret, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        expires: new Date(sessao.expire),
      });
    } else {
      await users.updateStatus({ userId, status: false });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("already")) return { erro: "Já existe um cadastro com esse e-mail. Esqueceu a senha? Fale com a coordenação." };
    if (userId) await users.delete({ userId }).catch(() => {});
    console.error("Cadastro de participante:", msg);
    return { erro: "Não foi possível concluir o cadastro agora. Tente de novo em instantes." };
  }
  await sinalizarMudanca();
  redirect(automatico ? destinoGuarnicao(form.get("next")) : "/aguardando-aprovacao");
}

/**
 * Conclui o cadastro de quem entrou pelo Google ou já tinha conta no IVAS sem função de guardião.
 */
export async function completarCadastroGoogle(_: ResultadoCadastro, form: FormData): Promise<ResultadoCadastro> {
  const u = await exigirSessao();
  if (!u.cadastroIncompleto && !podeSolicitarGuarnicao(u)) return { erro: "Este cadastro já foi concluído." };
  const sexo = String(form.get("sexo") ?? "") as Sexo;

  if (sexo !== "masculino" && sexo !== "feminino") return { erro: "Escolha o gênero." };
  const tel = validarTelefone(String(form.get("telefone") ?? ""));
  if ("erro" in tel) return { erro: tel.erro };
  if (!tel.valor) return { erro: "Informe o telefone (WhatsApp)." };
  if (!ehUf(String(form.get("estado") ?? ""))) return { erro: "Escolha o estado." };
  if (!String(form.get("cidade") ?? "").trim()) return { erro: "Escolha a cidade." };
  const faltando = conferirDadosObrigatorios(form);
  if (faltando) return { erro: faltando };

  let automatico: boolean;
  try {
    automatico = await aprovacaoAutomaticaGuarnicao();
  } catch (e) {
    console.error("Configuração de aprovação da Guarnição:", e);
    return { erro: "Não foi possível consultar a aprovação de cadastros. Tente novamente." };
  }

  const r = await salvarContato(u.id, form);
  if (r.erro) return { erro: r.erro };

  const { users } = createAdminClient();
  try {
    // updatePrefs substitui tudo: preserva os dados preenchidos no formulário.
    const atuais = await users.getPrefs({ userId: u.id });
    await users.updatePrefs({ userId: u.id, prefs: { ...atuais,
      funcao_ritual: automatico ? "guardiao" : "nenhuma",
      guarnicao_situacao: automatico ? null : "pendente",
      guarnicao_solicitacao: automatico ? null : true,
      cadastro_guarnicao_incompleto: null,
    } });
    if (automatico) {
      const conta = await users.get({ userId: u.id });
      await users.updateLabels({ userId: u.id, labels: labelsComFuncao(conta.labels, "guardiao") });
    }
    if (!automatico) {
      await users.updateStatus({ userId: u.id, status: false });
      (await cookies()).delete(SESSION_COOKIE);
    }
  } catch (e) {
    console.error("Concluir cadastro Google na Guarnição:", e);
    return { erro: "Não foi possível concluir o cadastro. Fale com a coordenação se o problema continuar." };
  }
  await sinalizarMudanca();
  redirect(automatico ? destinoGuarnicao(form.get("next")) : "/aguardando-aprovacao");
}
