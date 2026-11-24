"use server";

import { revalidatePath } from "next/cache";
import { ID } from "node-appwrite";
import { arquivoOtimizado } from "@/lib/imagem-servidor";
import { createAdminClient } from "@/lib/appwrite";
import { exigirSessao } from "@/lib/auth";
import { COMPROVANTES_BUCKET_ID } from "@/lib/config";
import { cederCredito, comprarPacote, usuarioPorEmail, type ResultadoCredito } from "@/lib/creditos";
import { conferirImagem } from "@/lib/imagem";
import { bloqueado, registrarFalha, textoEspera } from "@/lib/limite-taxa";

/** Falhas de busca de e-mail por pessoa antes de esperar: impede varrer contas tentando e-mails. */
const MAX_BUSCAS_FALHAS = 8;
const JANELA_BUSCA_MS = 10 * 60_000;

function revalidar() {
  revalidatePath("/minha-conta");
  revalidatePath("/admin/creditos");
  revalidatePath("/admin/eventos", "layout");
}

/** O participante compra um pacote do catálogo, informa que pagou (comprovante opcional) e aguarda a coordenação confirmar. */
export async function comprarPacoteAction(planoId: string, form: FormData): Promise<ResultadoCredito> {
  const u = await exigirSessao("/minha-conta?aba=creditos");
  let comprovanteFileId: string | null = null;
  const arquivo = form.get("comprovante");
  if (arquivo instanceof File && arquivo.size > 0) {
    const invalida = conferirImagem(arquivo, "comprovante");
    if (invalida) return { erro: invalida };
    try {
      const { storage } = createAdminClient();
      const novo = await storage.createFile({
        bucketId: COMPROVANTES_BUCKET_ID, fileId: ID.unique(), file: (await arquivoOtimizado(arquivo, arquivo.name, "comprovante")).input,
      });
      comprovanteFileId = novo.$id;
    } catch (e) {
      console.error("Comprovante do pacote:", e instanceof Error ? e.message : e);
      return { erro: "Não foi possível enviar o comprovante. Use PNG, JPG ou WEBP." };
    }
  }
  try {
    const r = await comprarPacote(u.id, String(planoId), comprovanteFileId);
    revalidar();
    return { ok: r.ok, erro: r.erro };
  } catch (e) {
    console.error("Comprar pacote:", e instanceof Error ? e.message : e);
    return { erro: "Não foi possível registrar o pacote agora. Tente de novo." };
  }
}

/** Primeiro passo da cessão: confere que existe uma conta ativa com o e-mail e devolve o nome para a pessoa confirmar. */
export async function localizarDestinatarioAction(email: string): Promise<{ nome?: string; erro?: string }> {
  const u = await exigirSessao("/minha-conta?aba=creditos");
  const chave = `ceder:${u.id}`;
  const espera = bloqueado(chave, MAX_BUSCAS_FALHAS);
  if (espera.bloqueado) return { erro: `Muitas tentativas. Tente de novo em ${textoEspera(espera.esperaS)}.` };
  const achado = await usuarioPorEmail(String(email ?? ""));
  if (!achado) {
    registrarFalha(chave, JANELA_BUSCA_MS);
    return { erro: "Não encontramos uma conta com esse e-mail. Confira se a pessoa já tem cadastro." };
  }
  if (achado.id === u.id) return { erro: "Esse é o seu próprio e-mail." };
  return { nome: achado.nome };
}

/** Segundo passo: passa o crédito para a pessoa do e-mail. Só ela poderá usá-lo. */
export async function cederCreditoAction(creditoId: string, email: string): Promise<ResultadoCredito> {
  const u = await exigirSessao("/minha-conta?aba=creditos");
  const achado = await usuarioPorEmail(String(email ?? ""));
  if (!achado) return { erro: "Não encontramos uma conta com esse e-mail." };
  if (achado.id === u.id) return { erro: "Esse é o seu próprio e-mail." };
  try {
    const r = await cederCredito(String(creditoId), u.id, achado.id, u.id);
    revalidar();
    return r.ok ? { ok: `Crédito cedido para ${achado.nome}.` } : r;
  } catch (e) {
    console.error("Ceder crédito:", e instanceof Error ? e.message : e);
    return { erro: "Não foi possível ceder o crédito agora. Tente de novo." };
  }
}
