import { exigir } from "@/lib/auth";
import { PODE } from "@/lib/config";
import { getDadosInstituto } from "@/lib/data";
import { Building2, CreditCard, MapPin, Phone, Share2, Tags } from "lucide-react";
import { Titulo } from "@/components/Titulo";
import { InstitutoForm } from "./InstitutoForm";
import { ListaEditavel } from "./ListaEditavel";

type Item = Record<string, unknown> & { $id: string };
const limpo = (rows: object[]) => JSON.parse(JSON.stringify(rows)) as Item[];

export default async function Configuracoes() {
  await exigir(PODE.configurar);
  const d = await getDadosInstituto();
  const secoes = [
    { id: "instituto", rotulo: "Instituto", Icone: Building2 },
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
        <nav className="hidden space-y-0.5 lg:sticky lg:top-8 lg:block" aria-label="Seções">
          {secoes.map(({ id, rotulo, Icone, n }) => (
            <a key={id} href={`#${id}`} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-stone-600 transition hover:bg-white hover:text-stone-900 hover:shadow-sm">
              <Icone size={16} className="text-stone-400" />
              {rotulo}
              {n !== undefined && <span className="ml-auto text-xs text-stone-400 tabular-nums">{n}</span>}
            </a>
          ))}
        </nav>
        <div className="space-y-6 [&>*]:scroll-mt-6">
          <InstitutoForm instituto={d.instituto} />
          <ListaEditavel tabela="enderecos" itens={limpo(d.enderecos)} />
          <ListaEditavel tabela="telefones" itens={limpo(d.telefones)} />
          <ListaEditavel tabela="redes" itens={limpo(d.redes)} />
          <ListaEditavel tabela="pix" itens={limpo(d.pix)} />
          <ListaEditavel tabela="tipos" itens={limpo(d.tipos)} />
        </div>
      </div>
    </>
  );
}
