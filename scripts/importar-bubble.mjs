// Importa os rituais exportados do Bubble (app agenda-instituto-virtudes) para a tabela eventos.
// Uso:  node --env-file=.env.local scripts/importar-bubble.mjs <rituais.json>            (simulação)
//       node --env-file=.env.local scripts/importar-bubble.mjs <rituais.json> --gravar   (grava)
// Cada evento usa o _id do Bubble como ID da linha: rodar de novo pula o que já foi importado.

import fs from "node:fs";
import { Client, TablesDB, Query, AppwriteException } from "node-appwrite";

const [arquivo, flag] = process.argv.slice(2);
const GRAVAR = flag === "--gravar";
if (!arquivo) {
  console.error("Informe o arquivo JSON exportado do Bubble");
  process.exit(1);
}

const { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY } = process.env;
const client = new Client().setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID).setKey(APPWRITE_API_KEY);
const db = new TablesDB(client);
const DB = "ivas";

const TIPOS = {
  Normal: "ritual-normal",
  Jejum: "ritual-jejum",
  Feitio: "feitio",
  "Reunião": "reuniao",
  "Evento comemorativo": "comemorativo",
};
const LOCAIS = {
  "🍒 Rua Café Cereja, 795 - Londrina": "Sede",
  "🌳 Chácara Terceiro Céu - Warta": "Chácara 3° Céu🌳",
};
// No Bubble, 22/11 e 25/11/2026 tinham o mesmo número (539/94). Ajuste combinado com o usuário.
const NUMEROS_AJUSTADOS = {
  "1791415212667x694433203771146200": { geral: 540, ano: 95 }, // 25/11/2026
  "1791415307333x698715303222706200": { geral: 541, ano: 96 }, // 28/11/2026
};

const limpo = (s) => (typeof s === "string" ? s.trim() : "") || null;
// O Bubble guarda a data à meia-noite de Brasília (03:00 UTC).
const dia = (iso) => new Date(new Date(iso).getTime() - 3 * 3600e3).toISOString().slice(0, 10);

async function main() {
  const rituais = JSON.parse(fs.readFileSync(arquivo, "utf8"));
  const [tipos, enderecos] = await Promise.all([
    db.listRows({ databaseId: DB, tableId: "tipos_evento", queries: [Query.limit(100)] }),
    db.listRows({ databaseId: DB, tableId: "enderecos", queries: [Query.limit(100)] }),
  ]);
  const tipoPorSlug = new Map(tipos.rows.map((t) => [t.slug, t]));
  const enderecoPorApelido = new Map(enderecos.rows.map((e) => [e.apelido, e.$id]));

  const linhas = rituais.map((r) => {
    const tipo = tipoPorSlug.get(TIPOS[r.Tipo]);
    if (!tipo) throw new Error(`Tipo sem correspondência: ${r.Tipo} (${r._id})`);
    const data = dia(r.Data);
    const hora = r["Horário"];
    if (!/^\d{2}:\d{2}$/.test(hora ?? "")) throw new Error(`Horário inválido: ${hora} (${r._id})`);

    let endereco_id = null;
    let endereco_livre = null;
    if (r.Local === "Outro:") endereco_livre = limpo(r["Outro Local"]) ?? "A definir";
    else {
      endereco_id = enderecoPorApelido.get(LOCAIS[r.Local]);
      if (!endereco_id) throw new Error(`Local sem endereço cadastrado: ${r.Local} (${r._id})`);
    }

    const ajuste = NUMEROS_AJUSTADOS[r._id];
    const numeros = tipo.conta_como_ritual
      ? {
          ritual_numero_geral: ajuste?.geral ?? r["Número Geral"],
          ritual_ano: Number(data.slice(0, 4)),
          ritual_numero_ano: ajuste?.ano ?? r["Número do Ano"],
        }
      : { ritual_numero_geral: null, ritual_ano: null, ritual_numero_ano: null };

    return {
      rowId: r._id,
      data: {
        titulo: (limpo(r["Título"]) ?? "A definir").slice(0, 80),
        descricao: limpo(r.Info),
        data,
        hora_inicio: hora,
        tipo_id: tipo.$id,
        endereco_id,
        endereco_livre,
        destaque: !!r.Destacado,
        mostrar_banner: true,
        ...numeros,
      },
    };
  });

  // Confere os índices únicos antes de gravar qualquer coisa.
  const repetidos = (chave) => {
    const vistos = new Map();
    for (const l of linhas) {
      const k = chave(l.data);
      if (k == null) continue;
      if (vistos.has(k)) throw new Error(`Número repetido ${k}: ${vistos.get(k)} e ${l.data.data}`);
      vistos.set(k, l.data.data);
    }
  };
  repetidos((d) => d.ritual_numero_geral);
  repetidos((d) => (d.ritual_numero_ano == null ? null : `${d.ritual_ano}/${d.ritual_numero_ano}`));

  const existentes = await db.listRows({ databaseId: DB, tableId: "eventos", queries: [Query.limit(1000)] });
  const idsExistentes = new Set(existentes.rows.map((e) => e.$id));
  const numerosExistentes = new Set(existentes.rows.map((e) => e.ritual_numero_geral).filter(Boolean));
  const novas = linhas.filter((l) => !idsExistentes.has(l.rowId));
  for (const l of novas) {
    if (numerosExistentes.has(l.data.ritual_numero_geral))
      throw new Error(`Número ${l.data.ritual_numero_geral} já usado por um evento do app (${l.data.data})`);
  }

  console.log(`${linhas.length} no arquivo · ${linhas.length - novas.length} já importados · ${novas.length} a importar`);
  for (const l of novas) {
    const d = l.data;
    const n = d.ritual_numero_geral ? `${d.ritual_numero_geral}/${d.ritual_numero_ano}` : "—";
    const local = d.endereco_livre ?? enderecos.rows.find((e) => e.$id === d.endereco_id)?.apelido;
    console.log(`${d.data} ${d.hora_inicio} | ${n.padEnd(7)} | ${tipos.rows.find((t) => t.$id === d.tipo_id).nome.padEnd(19)} | ${local} | ${d.titulo}${d.destaque ? " ⭐" : ""}`);
  }
  if (!GRAVAR) {
    console.log("\nSimulação: nada foi gravado. Rode com --gravar para importar.");
    return;
  }

  let ok = 0;
  for (const l of novas) {
    try {
      await db.createRow({ databaseId: DB, tableId: "eventos", rowId: l.rowId, data: l.data });
      ok++;
    } catch (e) {
      if (e instanceof AppwriteException && e.code === 409) console.log("  · já existe", l.rowId, l.data.data);
      else throw new Error(`Falha em ${l.data.data} (${l.rowId}): ${e.message}`);
    }
  }
  console.log(`\n✓ ${ok} eventos importados`);
}

main().catch((e) => {
  console.error("\nErro:", e?.message || e);
  process.exit(1);
});
