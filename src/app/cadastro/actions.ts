"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ID } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { LABEL_PARTICIPANTE, SESSION_COOKIE } from "@/lib/config";
import { exigirSessao } from "@/lib/auth";
import { salvarContato, validarTelefone } from "@/lib/usuarios";
import type { Sexo } from "@/lib/types";
import { ehUf } from "@/lib/perfil-extra";
import { destinoGuarnicao } from "@/lib/destino-auth";
import { conferirDadosObrigatorios } from "./dados-obrigatorios";

export type ResultadoCadastro = { erro?: string } | undefined;

/** Cadastro de guardião com acesso imediato à Guarnição. */
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

  const { account, users } = createAdminClient();
  let userId: string | null = null;
  try {
    const u = await users.create({ userId: ID.unique(), email, password: senha, name: nome });
    userId = u.$id;
    await users.updateLabels({ userId, labels: [LABEL_PARTICIPANTE] });
    await users.updatePrefs({ userId, prefs: { funcao_ritual: "guardiao" } });
    const r = await salvarContato(userId, form);
    if (r.erro) {
      await users.delete({ userId }).catch(() => {});
      return { erro: r.erro };
    }
    // Conta já ativa: entra direto, sem precisar logar de novo.
    const sessao = await account.createEmailPasswordSession({ email, password: senha });
    (await cookies()).set(SESSION_COOKIE, sessao.secret, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(sessao.expire),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("already")) return { erro: "Já existe um cadastro com esse e-mail. Esqueceu a senha? Fale com a coordenação." };
    if (userId) await users.delete({ userId }).catch(() => {});
    console.error("Cadastro de participante:", msg);
    return { erro: "Não foi possível concluir o cadastro agora. Tente de novo em instantes." };
  }
  redirect(destinoGuarnicao(form.get("next")));
}

/**
 * Conclui o cadastro de quem entrou pelo botão do Google (a conta já existe e já está logada:
 * falta telefone, estado/cidade e gênero). Continua na própria tela de cadastro, sem página à parte.
 */
export async function completarCadastroGoogle(_: ResultadoCadastro, form: FormData): Promise<ResultadoCadastro> {
  const u = await exigirSessao();
  const sexo = String(form.get("sexo") ?? "") as Sexo;

  if (sexo !== "masculino" && sexo !== "feminino") return { erro: "Escolha o gênero." };
  const tel = validarTelefone(String(form.get("telefone") ?? ""));
  if ("erro" in tel) return { erro: tel.erro };
  if (!tel.valor) return { erro: "Informe o telefone (WhatsApp)." };
  if (!ehUf(String(form.get("estado") ?? ""))) return { erro: "Escolha o estado." };
  if (!String(form.get("cidade") ?? "").trim()) return { erro: "Escolha a cidade." };
  const faltando = conferirDadosObrigatorios(form);
  if (faltando) return { erro: faltando };

  const r = await salvarContato(u.id, form);
  if (r.erro) return { erro: r.erro };

  const { users } = createAdminClient();
  // updatePrefs substitui tudo: preserva os dados preenchidos no formulário.
  const atuais = await users.getPrefs({ userId: u.id });
  await users.updatePrefs({ userId: u.id, prefs: { ...atuais, funcao_ritual: "guardiao" } });
  redirect(destinoGuarnicao(form.get("next")));
}
