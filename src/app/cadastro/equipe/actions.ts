"use server";

import { ID } from "node-appwrite";
import { limitarCadastro } from "@/lib/limite-cadastro";
import { createAdminClient } from "@/lib/appwrite";
import { salvarContato, validarTelefone } from "@/lib/usuarios";
import { assumirContaRapida, buscarContaRapida } from "@/lib/conta-rapida";
import type { Funcao, Sexo } from "@/lib/types";
import { ehUf } from "@/lib/perfil-extra";

export type ResultadoCadastro = { ok?: boolean; erro?: string } | undefined;

/**
 * Cadastro público. A conta nasce bloqueada e sem perfil de acesso: só entra no painel
 * depois que um Admin aprova e define a função e o perfil (Usuários › Cadastros pendentes).
 */
export async function cadastrar(_: ResultadoCadastro, form: FormData): Promise<ResultadoCadastro> {
  // Campo escondido que só robôs preenchem
  if (String(form.get("site") ?? "")) return { ok: true };

  const trava = await limitarCadastro();
  if (trava) return { erro: trava };

  const nome = String(form.get("nome") ?? "").trim().replace(/\s+/g, " ").slice(0, 128);
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const senha = String(form.get("senha") ?? "");
  const confirmar = String(form.get("confirmar") ?? "");
  const sexo = String(form.get("sexo") ?? "") as Sexo;
  const f = String(form.get("funcao") ?? "");
  const funcao: Funcao | null = f === "mestre" || f === "guardiao" ? f : null;

  if (nome.split(" ").length < 2) return { erro: "Informe nome e sobrenome." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { erro: "Informe um e-mail válido." };
  if (sexo !== "masculino" && sexo !== "feminino") return { erro: "Escolha o gênero." };
  if (senha.length < 8) return { erro: "A senha precisa de pelo menos 8 caracteres." };
  if (senha !== confirmar) return { erro: "As senhas não conferem." };
  const tel = validarTelefone(String(form.get("telefone") ?? ""));
  if ("erro" in tel) return { erro: tel.erro };
  if (!tel.valor) return { erro: "Informe o telefone (WhatsApp)." };
  const endereco = String(form.get("endereco") ?? "").trim().replace(/\s+/g, " ").slice(0, 255);
  if (endereco.length < 8) return { erro: "Informe o endereço completo (rua, número, bairro e cidade)." };
  if (!ehUf(String(form.get("estado") ?? ""))) return { erro: "Escolha o estado." };
  if (!String(form.get("cidade") ?? "").trim()) return { erro: "Escolha a cidade." };

  const { users } = createAdminClient();
  // Cadastro rápido da mesma pessoa (pelo e-mail ou telefone): a conta dela passa a ser esta, com as participações
  const rapida = await buscarContaRapida({ email, telefone: tel.valor }).catch((e) => { console.error("Buscar conta rápida:", e instanceof Error ? e.message : e); return null; });
  let userId: string | null = null;
  let criada = false;
  const prefsNovas = { telefone: tel.valor, sexo, endereco, situacao: "pendente", funcao_solicitada: funcao, funcao_ritual: "nenhuma" };
  try {
    if (rapida) {
      const r0 = await salvarContato(rapida, form);
      if (r0.erro) return { erro: r0.erro };
      userId = rapida;
      await assumirContaRapida(rapida, { email, senha, nome, labels: [], prefs: prefsNovas });
      await users.updateStatus({ userId, status: false });
    } else {
      const u = await users.create({ userId: ID.unique(), email, password: senha, name: nome });
      userId = u.$id;
      criada = true;
      await users.updateStatus({ userId, status: false });
      await users.updatePrefs({ userId, prefs: prefsNovas });
      // Foto de perfil (opcional): mesmo envio usado no painel, já reduzida no navegador
      const r = await salvarContato(userId, form);
      if (r.erro) {
        await users.delete({ userId }).catch(() => {});
        return { erro: r.erro };
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("already")) return { erro: "Já existe um cadastro com esse e-mail. Se ainda não foi aprovado, aguarde o contato da coordenação." };
    // Não deixa uma conta pela metade (desbloqueada ou sem a marca de pendente)
    if (userId && criada) await users.delete({ userId }).catch(() => {});
    console.error("Cadastro:", msg);
    return { erro: "Não foi possível concluir o cadastro agora. Tente de novo em instantes." };
  }
  return { ok: true };
}
