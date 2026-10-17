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

  // Título grande + faixa com o mês (ou o período), como no modelo "Calendário".
  const maiusc = (t: string) => t.replace(/^./, (l) => l.toUpperCase());
  const mesI = Number(inicio.slice(5, 7));
  const mesF = Number(fim.slice(5, 7));
  const tituloSugerido = eventoUnico ? eventoUnico.titulo : "Calendário";
  const subtituloSugerido = eventoUnico
    ? dados.instituto.nome
    : inicio.slice(0, 7) === fim.slice(0, 7)
      ? maiusc(nomeMes(mesI))
      : `${maiusc(nomeMes(mesI))} e ${maiusc(nomeMes(mesF))}`;

  return (
    <>
      <Titulo sobre="Divulgação" titulo="Gerador de banners" subtitulo="Escolha o período, personalize o visual e baixe em PNG." />
      <BannerEditor
        dados={JSON.parse(JSON.stringify(dados))}
        eventos={JSON.parse(JSON.stringify(eventos))}
        modelos={JSON.parse(JSON.stringify(modelos))}
        periodo={{ inicio, fim, tipos, eventoId: eventoUnico?.$id ?? null }}
        tituloSugerido={tituloSugerido}
        subtituloSugerido={subtituloSugerido}
        podeSalvarModelo={pode(u, ["admin", "mestre"])}
      />
    </>
  );
}
