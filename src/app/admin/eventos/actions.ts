"use server";

import { corDaCapa } from "@/lib/cor";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ID } from "node-appwrite";
import { z } from "zod";
import { createAdminClient } from "@/lib/appwrite";
import { exigir, pode } from "@/lib/auth";
import { BUCKET_ID, DB_ID, PODE, TABLES } from "@/lib/config";
import { getEvento, listarTags, listarTipos } from "@/lib/data";
import { conferirImagem } from "@/lib/imagem";
import { arquivoOtimizado } from "@/lib/imagem-servidor";
import { listarEquipe } from "@/lib/usuarios";
import type { Pessoa } from "@/lib/types";
import { comNumeracao, isConflito } from "@/lib/ritual";
import { VAGAS_PADRAO, reorganizar } from "@/lib/guarnicao";

const esquema = z.object({
  titulo: z.string().trim().min(1, "Informe o título").max(80, "Título com no máximo 80 caracteres"),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  hora_inicio: z.string().regex(/^\d{2}:\d{2}$/, "Horário inválido"),
  tipo_id: z.string().min(1, "Escolha o tipo"),
  endereco_id: z.string().optional(),
  endereco_livre: z.string().trim().max(255).optional(),
  descricao: z.string().trim().max(5000).optional(),
});

export type EstadoForm = { erro?: string } | undefined;

function inteiroOuNull(v: FormDataEntryValue | null) {
  const n = Number(String(v ?? "").trim());
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function salvarEvento(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const u = await exigir(PODE.editarEventos);
  const id = String(form.get("id") ?? "") || null;

  const p = esquema.safeParse(Object.fromEntries(form));
  if (!p.success) return { erro: p.error.issues[0]?.message ?? "Dados inválidos" };
  const d = p.data;

  const usaLivre = d.endereco_id === "__livre";
  if (usaLivre && !d.endereco_livre) return { erro: "Digite o endereço" };
  if (!usaLivre && !d.endereco_id) return { erro: "Escolha o endereço" };

  const [tipos, equipe, todasTags] = await Promise.all([listarTipos(), listarEquipe(), listarTags()]);
  const tipo = tipos.find((t) => t.$id === d.tipo_id);
  if (!tipo) return { erro: "Tipo de evento não encontrado" };
  // Só aceita usuários que existem e têm a função certa nos rituais.
  const escalados = (campo: string, funcao: Pessoa["funcao"]) => {
    const validos = new Set(equipe.filter((p) => p.funcao === funcao).map((p) => p.$id));
    return [...new Set(form.getAll(campo).map(String))].filter((id) => validos.has(id));
  };

  // Guarnição: os campos só vêm no formulário de tipos que contam como ritual.
  const vagas = (campo: string) => {
    const n = Number(form.get(campo));
    return Number.isInteger(n) && n >= 0 && n <= 50 ? n : VAGAS_PADRAO;
  };
  const guarnicao = form.has("vagas_guardioes")
    ? { vagas_guardioes: vagas("vagas_guardioes"), vagas_guardias: vagas("vagas_guardias") }
    : {};
  // Participantes: campos só vêm no formulário de tipos abertos ao público (e não fechados para guardiões).
  const aceitaParticipantes = tipo.aberto_publico && !tipo.fechado_guardioes;
  const participantes = aceitaParticipantes
    ? { vagas_participantes: Math.min(1000, Math.max(0, Math.trunc(Number(form.get("vagas_participantes"))) || 30)) }
    : {};
  // "Aceitar candidaturas/inscrições" é um campo só, usado tanto pela guarnição quanto pelos participantes;
  // só é lido quando algum dos dois blocos (que o exibem) estava presente no formulário.
  const mostrouToggleAbertas = tipo.conta_como_ritual || aceitaParticipantes;
  const toggleAbertas = mostrouToggleAbertas ? { candidaturas_abertas: form.get("candidaturas_abertas") === "on" } : {};
  const dados = {
    ...guarnicao,
    ...participantes,
    ...toggleAbertas,
    titulo: d.titulo,
    data: d.data,
    hora_inicio: d.hora_inicio,
    tipo_id: d.tipo_id,
    // Só tags que existem (sem repetir), na ordem em que foram cadastradas
    tags: todasTags.filter((t) => form.getAll("tags").map(String).includes(t.$id)).map((t) => t.$id),
    destaque: form.get("destaque") === "on",
    descricao: d.descricao || null,
    endereco_id: usaLivre ? null : d.endereco_id!,
    endereco_livre: usaLivre ? d.endereco_livre! : null,
    mostrar_banner: form.get("mostrar_banner") === "on",
    mestres: escalados("mestres", "mestre"),
    atualizado_por: u.id,
  };
  const ano = Number(d.data.slice(0, 4));
  const { tablesDB, storage } = createAdminClient();
  const base = { databaseId: DB_ID, tableId: TABLES.eventos };
  const atual = id ? await getEvento(id) : null;
  if (id && !atual) return { erro: "Evento não encontrado" };

  // Imagem de capa: nova, removida ou mantida.
  const capa = form.get("capa");
  const capaAntiga = atual?.capa_file_id ?? null;
  let capaApagar: string | null = null;
  let capaNova: string | null = null;
  if (capa instanceof File && capa.size > 0) {
    const invalida = conferirImagem(capa, "capa");
    if (invalida) return { erro: invalida };
    try {
      const { input, bytes } = await arquivoOtimizado(capa, capa.name, "capa");
      const novo = await storage.createFile({ bucketId: BUCKET_ID, fileId: ID.unique(), file: input });
      capaNova = novo.$id;
      // A cor predominante vira o degradê do topo da página pública
      Object.assign(dados, { capa_file_id: capaNova, cor_capa: await corDaCapa(bytes) });
      capaApagar = capaAntiga;
    } catch (e) {
      console.error(e);
      return { erro: "Não foi possível enviar a capa. Use uma imagem PNG, JPG ou WEBP." };
    }
  } else if (form.get("remover_capa") === "on" && capaAntiga) {
    Object.assign(dados, { capa_file_id: null, cor_capa: null });
    capaApagar = capaAntiga;
  }

  try {
    if (!id) {
      const rowId = ID.unique();
      const criar = (extra: object = {}) =>
        tablesDB.createRow({ ...base, rowId, data: { ...dados, ...extra, criado_por: u.id } });
      if (tipo.conta_como_ritual) await comNumeracao(ano, (n) => criar(n));
      else await criar();
    } else {
      if (!atual) return { erro: "Evento não encontrado" };
      const atualizar = (extra: object = {}) => tablesDB.updateRow({ ...base, rowId: id, data: { ...dados, ...extra } });

      if (tipo.conta_como_ritual) {
        const manualGeral = pode(u, PODE.editarNumeracao) ? inteiroOuNull(form.get("ritual_numero_geral")) : null;
        const manualAno = pode(u, PODE.editarNumeracao) ? inteiroOuNull(form.get("ritual_numero_ano")) : null;
        if (!atual.ritual_numero_geral) {
          // Passou a ser ritual agora: ganha o próximo número livre.
          await comNumeracao(ano, (n) => atualizar(n));
        } else if (manualGeral || manualAno) {
          await atualizar({
            ritual_numero_geral: manualGeral ?? atual.ritual_numero_geral,
            ritual_numero_ano: manualAno ?? atual.ritual_numero_ano,
            ritual_ano: atual.ritual_ano ?? ano,
          });
        } else {
          await atualizar();
        }
      } else {
        // Deixou de ser ritual: libera a numeração.
        await atualizar({ ritual_numero_geral: null, ritual_ano: null, ritual_numero_ano: null });
      }
    }
  } catch (e) {
    // Não deixa a imagem nova órfã no bucket se a linha não foi salva.
    if (capaNova) await storage.deleteFile({ bucketId: BUCKET_ID, fileId: capaNova }).catch(() => {});
    if (isConflito(e)) return { erro: "Esse número de ritual já está em uso por outro evento." };
    console.error(e);
    return { erro: "Não foi possível salvar. Tente de novo." };
  }
  if (capaApagar) await storage.deleteFile({ bucketId: BUCKET_ID, fileId: capaApagar }).catch(() => {});

  // Mudou o limite de vagas: confirma da lista de espera ou devolve o excedente para a espera.
  if (id) {
    const salvo = await getEvento(id);
    if (salvo) await reorganizar(salvo, u.id).catch((e) => console.error(e));
    revalidatePath(`/admin/eventos/${id}`);
    revalidatePath("/admin/guarnicao");
  }
  revalidatePath("/admin/eventos");
  redirect(`/admin/eventos?mes=${d.data.slice(0, 7)}&ok=salvo`);
}

export async function excluirEvento(form: FormData) {
  await exigir(["admin"]);
  const id = String(form.get("id"));
  const { tablesDB, storage } = createAdminClient();
  const evento = await getEvento(id);
  await tablesDB.deleteRow({ databaseId: DB_ID, tableId: TABLES.eventos, rowId: id });
  if (evento?.capa_file_id) await storage.deleteFile({ bucketId: BUCKET_ID, fileId: evento.capa_file_id }).catch(() => {});
  revalidatePath("/admin/eventos");
  redirect("/admin/eventos?ok=excluido");
}
