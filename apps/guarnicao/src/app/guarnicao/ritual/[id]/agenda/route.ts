import { urlRitualGuarnicao } from "@/lib/guarnicao-links";
import { getDadosInstituto, getEventoPorIdOuNumero } from "@/lib/data";
import { getUsuario } from "@/lib/auth";
import { inicioDe } from "@/lib/guarnicao";
import { SITE_URL } from "@/lib/site";

/** Formato de data do iCalendar em UTC: 20261021T220000Z */
const ics = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
// Caracteres especiais do iCalendar (barra invertida, ponto e vírgula, vírgula, quebra de linha)
const BARRA = String.fromCharCode(92);
const QUEBRA = String.fromCharCode(10);
const escapar = (t: string) =>
  t.split(String.fromCharCode(13)).join("").split(BARRA).join(BARRA + BARRA).split(";").join(BARRA + ";").split(",").join(BARRA + ",").split(QUEBRA).join(BARRA + "n");

/** Arquivo .ics do ritual, para o guardião colocar na agenda do celular (Google Agenda, iPhone…). */
export async function GET(_req: Request, ctx: RouteContext<"/guarnicao/ritual/[id]/agenda">) {
  if (!(await getUsuario())) return new Response("Entre na sua conta.", { status: 401 });
  const { id } = await ctx.params;
  const [evento, { enderecos }] = await Promise.all([getEventoPorIdOuNumero(id), getDadosInstituto()]);
  if (!evento) return new Response("Não encontrado", { status: 404 });
  const end = evento.endereco_id ? enderecos.find((e) => e.$id === evento.endereco_id) : undefined;
  const inicio = inicioDe(evento);
  const fim = new Date(inicio.getTime() + 4 * 3_600_000);
  const local = end ? `${end.apelido} — ${end.endereco}` : evento.endereco_livre ?? "";
  const titulo = `${evento.ritual_numero_geral ? `Ritual Nº ${evento.ritual_numero_geral} · ` : ""}${evento.titulo} (guarnição)`;
  const corpo = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Instituto IVAS//Guarnicao//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${evento.$id}@virtudes.net.br`,
    `DTSTAMP:${ics(new Date())}`,
    `DTSTART:${ics(inicio)}`,
    `DTEND:${ics(fim)}`,
    `SUMMARY:${escapar(titulo)}`,
    local && `LOCATION:${escapar(local)}`,
    `DESCRIPTION:${escapar(`Você está na guarnição deste ritual.${QUEBRA}${SITE_URL}${urlRitualGuarnicao(evento)}`)}`,
    `URL:${SITE_URL}${urlRitualGuarnicao(evento)}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT3H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapar(titulo)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
  return new Response(corpo, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="ritual-${evento.ritual_numero_geral ?? evento.$id}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
