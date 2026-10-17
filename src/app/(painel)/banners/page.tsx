import { exigir, pode } from "@/lib/auth";
import { getDadosInstituto, getEvento, listarEventos, listarModelos } from "@/lib/data";
import { hoje, limitesMes, nomeMes } from "@/lib/format";
import { Titulo } from "@/components/Titulo";
import { BannerEditor } from "./BannerEditor";

const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const DATA = /^\d{4}-\d{2}-\d{2}$/;

export default async function Banners({ searchParams }: PageProps<"/banners">) {
  const u = await exigir();
  const sp = await searchParams;
  const mesAtual = limitesMes(hoje().slice(0, 7));
  const inicio = DATA.test(um(sp.inicio) ?? "") ? um(sp.inicio)! : mesAtual.inicio;
  const fim = DATA.test(um(sp.fim) ?? "") ? um(sp.fim)! : mesAtual.fim;
  const tipos = (um(sp.tipos) ?? "").split(",").filter(Boolean);
  const eventoId = um(sp.evento);

  const [dados, modelos, eventoUnico] = await Promise.all([
    getDadosInstituto(),
    listarModelos(),
    eventoId ? getEvento(eventoId) : null,
  ]);
  const eventos = eventoUnico
    ? [eventoUnico]
    : await listarEventos({ inicio, fim, tipos, apenasBanner: true });

  const mesmoMes = inicio.slice(0, 7) === fim.slice(0, 7) && inicio.endsWith("-01");
  const tituloSugerido = eventoUnico
    ? eventoUnico.titulo
    : mesmoMes
      ? `Agenda de ${nomeMes(Number(inicio.slice(5, 7))).replace(/^./, (l) => l.toUpperCase())}`
      : "Agenda";

  return (
    <>
      <Titulo sobre="Divulgação" titulo="Gerador de banners" subtitulo="Escolha o período, personalize o visual e baixe em PNG." />
      <BannerEditor
        dados={JSON.parse(JSON.stringify(dados))}
        eventos={JSON.parse(JSON.stringify(eventos))}
        modelos={JSON.parse(JSON.stringify(modelos))}
        periodo={{ inicio, fim, tipos, eventoId: eventoUnico?.$id ?? null }}
        tituloSugerido={tituloSugerido}
        podeSalvarModelo={pode(u, ["admin", "mestre"])}
      />
    </>
  );
}
