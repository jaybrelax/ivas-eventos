import { getDadosInstituto, listarEventos } from "@/lib/data";
import { candidaturasDosEventos } from "@/lib/guarnicao";
import { hoje } from "@/lib/format";
import { enviarPush } from "@/lib/push";

/**
 * Lembrete da véspera (Vercel Cron, todo dia de manhã): avisa os guardiões confirmados
 * nos rituais de amanhã. Protegido pelo CRON_SECRET que a Vercel envia no cabeçalho.
 */
export async function GET(req: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || req.headers.get("authorization") !== `Bearer ${segredo}`) return new Response("Não autorizado", { status: 401 });

  const amanha = new Date(Date.parse(`${hoje()}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
  const [{ tipos, enderecos }, eventos] = await Promise.all([getDadosInstituto(), listarEventos({ inicio: amanha, fim: amanha })]);
  const ritual = new Set(tipos.filter((t) => t.conta_como_ritual).map((t) => t.$id));
  const rituais = eventos.filter((e) => ritual.has(e.tipo_id));
  const cand = await candidaturasDosEventos(rituais.map((e) => e.$id));

  let enviados = 0;
  for (const e of rituais) {
    const confirmados = cand.filter((c) => c.evento_id === e.$id && c.situacao === "confirmada").map((c) => c.usuario_id);
    if (!confirmados.length) continue;
    const end = e.endereco_id ? enderecos.find((x) => x.$id === e.endereco_id) : undefined;
    const nome = e.ritual_numero_geral ? `Ritual Nº ${e.ritual_numero_geral}` : e.titulo;
    enviados += await enviarPush(confirmados, {
      titulo: `Amanhã: ${nome}`,
      corpo: `Você está na guarnição · ${e.hora_inicio}${end ? ` · ${end.apelido}` : ""}.`,
      url: `/guarnicao/ritual/${e.$id}`,
      tag: `lembrete-${e.$id}`,
    });
  }
  return Response.json({ dia: amanha, rituais: rituais.length, enviados });
}
