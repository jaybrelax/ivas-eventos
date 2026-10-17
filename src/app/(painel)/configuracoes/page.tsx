import Link from "next/link";
import { exigir } from "@/lib/auth";
import { PODE } from "@/lib/config";
import { getDadosInstituto, listarEventos } from "@/lib/data";
import { Building2, CreditCard, Info, MapPin, Phone, Share2, Tags } from "lucide-react";
import { Titulo } from "@/components/Titulo";
import { InstitutoForm } from "./InstitutoForm";
import { InformacoesForm } from "./InformacoesForm";
import { ListaEditavel } from "./ListaEditavel";
import { TiposEvento, type TipoItem } from "./TiposEvento";

type Item = Record<string, unknown> & { $id: string };
const limpo = (rows: object[]) => JSON.parse(JSON.stringify(rows)) as Item[];

const SECOES = ["instituto", "informacoes", "enderecos", "telefones", "redes", "pix", "tipos"] as const;
type Secao = (typeof SECOES)[number];

/** Cada seção aparece sozinha: o menu troca a seção (?secao=...) em vez de rolar a página. */
export default async function Configuracoes({ searchParams }: PageProps<"/configuracoes">) {
  await exigir(PODE.configurar);
  const sp = await searchParams;
  const pedida = typeof sp.secao === "string" ? sp.secao : "";
  const atual: Secao = (SECOES as readonly string[]).includes(pedida) ? (pedida as Secao) : "instituto";
  const d = await getDadosInstituto();
  // Quantos eventos usam cada tipo (só na aba de tipos)
  const contagem: Record<string, number> = {};
  if (atual === "tipos") for (const e of await listarEventos()) contagem[e.tipo_id] = (contagem[e.tipo_id] ?? 0) + 1;
  const secoes: { id: Secao; rotulo: string; Icone: typeof Building2; n?: number }[] = [
    { id: "instituto", rotulo: "Instituto", Icone: Building2 },
    { id: "informacoes", rotulo: "Informações", Icone: Info },
    { id: "enderecos", rotulo: "Endereços", Icone: MapPin, n: d.enderecos.length },
    { id: "telefones", rotulo: "Telefones", Icone: Phone, n: d.telefones.length },
    { id: "redes", rotulo: "Redes sociais", Icone: Share2, n: d.redes.length },
    { id: "pix", rotulo: "Chaves Pix", Icone: CreditCard, n: d.pix.length },
    { id: "tipos", rotulo: "Tipos de evento", Icone: Tags, n: d.tipos.length },
  ];

  return (
    <>
      <Titulo sobre="Administração" titulo="Configurações" subtitulo="Dados fixos do Instituto, reaproveitados nos eventos e banners." />
      <div className="grid items-start gap-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <nav
          className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:sticky lg:top-8 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0 lg:pb-0"
          aria-label="Seções das configurações"
        >
          {secoes.map(({ id, rotulo, Icone, n }) => {
            const ativa = id === atual;
            return (
              <Link
                key={id}
                href={id === "instituto" ? "/configuracoes" : `/configuracoes?secao=${id}`}
                scroll={false}
                aria-current={ativa ? "page" : undefined}
                className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium whitespace-nowrap transition ${
                  ativa ? "bg-white text-stone-900 shadow-sm ring-1 ring-stone-200" : "text-stone-600 hover:bg-white/70 hover:text-stone-900"
                }`}
              >
                <Icone size={16} className={ativa ? "text-mata-600" : "text-stone-400"} />
                {rotulo}
                {n !== undefined && <span className="ml-auto pl-2 text-xs text-stone-400 tabular-nums">{n}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="animate-aparecer" key={atual}>
          {atual === "instituto" && <InstitutoForm instituto={d.instituto} />}
          {atual === "informacoes" && <InformacoesForm instituto={d.instituto} />}
          {atual === "enderecos" && <ListaEditavel tabela="enderecos" itens={limpo(d.enderecos)} />}
          {atual === "telefones" && <ListaEditavel tabela="telefones" itens={limpo(d.telefones)} />}
          {atual === "redes" && <ListaEditavel tabela="redes" itens={limpo(d.redes)} />}
          {atual === "pix" && <ListaEditavel tabela="pix" itens={limpo(d.pix)} />}
          {atual === "tipos" && <TiposEvento itens={limpo(d.tipos) as unknown as TipoItem[]} contagem={contagem} />}
        </div>
      </div>
    </>
  );
}
