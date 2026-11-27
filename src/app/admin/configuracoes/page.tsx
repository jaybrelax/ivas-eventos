import Link from "next/link";
import { exigir } from "@/lib/auth";
import { PODE } from "@/lib/config";
import { getDadosInstituto, listarEventos } from "@/lib/data";
import { ArrowLeft, Building2, ChevronRight, CreditCard, Globe, Info, KeyRound, MapPin, Phone, Share2, ShieldCheck, Tags, Ticket } from "lucide-react";
import { listarPlanos } from "@/lib/creditos";
import { Titulo } from "@/components/Titulo";
import { InstitutoForm } from "./InstitutoForm";
import { InformacoesForm } from "./InformacoesForm";
import { GestaoGuardiaoForm } from "./GestaoGuardiaoForm";
import { ChavesApiForm } from "./ChavesApiForm";
import { TipografiaForm } from "./TipografiaForm";
import { HeroAgendaForm } from "./HeroAgendaForm";
import { CreditosPreferenciasForm } from "./CreditosPreferenciasForm";
import { PacotesEditaveis } from "./PacotesEditaveis";
import { lerPreferenciasCreditos } from "@/lib/creditos-preferencias";
import type { PlanoPacote } from "@/lib/types";
import { lerHeroAgenda } from "@/lib/hero-agenda";
import { getConfigIA, mascararChave } from "@/lib/ia";
import { ListaEditavel } from "./ListaEditavel";
import { TiposEvento, type TipoItem } from "./TiposEvento";
import { TagsEvento, type TagItem } from "./TagsEvento";

type Item = Record<string, unknown> & { $id: string };
const limpo = (rows: object[]) => JSON.parse(JSON.stringify(rows)) as Item[];

const SECOES = ["instituto", "informacoes", "publica", "enderecos", "telefones", "redes", "pix", "pacotes", "gestao", "tipos", "chaves"] as const;
type Secao = (typeof SECOES)[number];

/** Cada seção aparece sozinha: o menu troca a seção (?secao=...) em vez de rolar a página. */
export default async function Configuracoes({ searchParams }: PageProps<"/admin/configuracoes">) {
  await exigir(PODE.configurar);
  const sp = await searchParams;
  const pedida = typeof sp.secao === "string" ? sp.secao : "";
  const temSecao = (SECOES as readonly string[]).includes(pedida);
  const atual: Secao = temSecao ? (pedida as Secao) : "instituto";
  const d = await getDadosInstituto();
  // Quantos eventos usam cada tipo (só na aba de tipos)
  const contagem: Record<string, number> = {};
  // Quantos eventos usam cada tag (também na aba de tipos, que reúne tipos e tags)
  const contagemTags: Record<string, number> = {};
  if (atual === "tipos") {
    for (const e of await listarEventos()) {
      contagem[e.tipo_id] = (contagem[e.tipo_id] ?? 0) + 1;
      for (const id of e.tags ?? []) contagemTags[id] = (contagemTags[id] ?? 0) + 1;
    }
  }
  const ia = atual === "chaves" ? await getConfigIA() : null;
  const planos = atual === "pacotes" ? await listarPlanos() : [];
  const secoes: { id: Secao; rotulo: string; descricao: string; grupo: string; Icone: typeof Building2; n?: number }[] = [
    { id: "instituto", rotulo: "Instituto", descricao: "Identidade, logos e dados gerais", grupo: "Instituto e conteúdo", Icone: Building2 },
    { id: "informacoes", rotulo: "Informações", descricao: "Orientações e contribuição", grupo: "Instituto e conteúdo", Icone: Info },
    { id: "publica", rotulo: "Página pública", descricao: "Hero, imagens e tipografia", grupo: "Instituto e conteúdo", Icone: Globe },
    { id: "enderecos", rotulo: "Endereços", descricao: "Locais dos eventos", grupo: "Contatos e pagamentos", Icone: MapPin, n: d.enderecos.length },
    { id: "telefones", rotulo: "Telefones", descricao: "Números de contato", grupo: "Contatos e pagamentos", Icone: Phone, n: d.telefones.length },
    { id: "redes", rotulo: "Redes sociais", descricao: "Perfis e links", grupo: "Contatos e pagamentos", Icone: Share2, n: d.redes.length },
    { id: "pix", rotulo: "Chaves Pix", descricao: "Chaves para contribuição", grupo: "Contatos e pagamentos", Icone: CreditCard, n: d.pix.length },
    { id: "pacotes", rotulo: "Pacotes de créditos", descricao: "Planos e regras de cessão", grupo: "Contatos e pagamentos", Icone: Ticket },
    { id: "gestao", rotulo: "Gestão do ritual", descricao: "Preferências de guarnição", grupo: "Eventos e acesso", Icone: ShieldCheck },
    { id: "tipos", rotulo: "Tipos e tags", descricao: "Categorias e etiquetas", grupo: "Eventos e acesso", Icone: Tags, n: d.tipos.length + d.tags.length },
    { id: "chaves", rotulo: "Chaves API", descricao: "Integrações e inteligência artificial", grupo: "Eventos e acesso", Icone: KeyRound },
  ];

  return (
    <>
      <div className="hidden lg:block"><Titulo sobre="Administração" titulo="Configurações" subtitulo="Dados fixos do Instituto, reaproveitados nos eventos e banners." /></div>
      {!temSecao && <div className="-mx-2 -mt-3 min-h-dvh px-4 py-6 sm:mx-0 sm:mt-0 sm:px-0 lg:hidden">
        <header className="mb-7 flex items-center gap-3">
          <Link href="/admin/eventos" aria-label="Voltar ao painel" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-stone-700 shadow-sm ring-1 ring-stone-200 transition-colors active:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mata-600"><ArrowLeft size={20} aria-hidden /></Link>
          <div><p className="text-xs font-semibold tracking-[0.14em] text-ouro-700 uppercase">Administração</p><h1 className="mt-0.5 text-[26px] font-semibold tracking-tight text-stone-900">Configurações</h1></div>
        </header>
        <nav aria-label="Seções das configurações" className="space-y-6">
          {["Instituto e conteúdo", "Contatos e pagamentos", "Eventos e acesso"].map((grupo) => <div key={grupo}>
            <h2 className="mb-2 px-1 text-xs font-semibold tracking-[0.12em] text-stone-500 uppercase">{grupo}</h2>
            <div className="config-mobile-categoria divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm">
              {secoes.filter((s) => s.grupo === grupo).map(({ id, rotulo, descricao, Icone, n }) => <Link
                key={id} href={`/admin/configuracoes?secao=${id}`}
                className="config-mobile-opcao flex min-h-16 items-center gap-3 px-4 py-3 transition-colors hover:bg-mata-50/40 active:bg-mata-50 focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-mata-600"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mata-50 text-mata-700"><Icone size={19} aria-hidden /></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-stone-900">{rotulo}</span><span className="mt-0.5 block text-xs leading-snug text-stone-500">{descricao}</span></span>
                {n !== undefined && <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600 tabular-nums">{n}</span>}
                <ChevronRight size={17} className="shrink-0 text-stone-400" aria-hidden />
              </Link>)}
            </div>
          </div>)}
        </nav>
      </div>}
      {temSecao && <div className="mb-5 flex items-center gap-3 lg:hidden">
        <Link href="/admin/configuracoes" aria-label="Voltar ao menu de configurações" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-stone-700 shadow-sm ring-1 ring-stone-200 transition-colors active:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mata-600"><ArrowLeft size={20} aria-hidden /></Link>
        <div className="min-w-0"><p className="text-xs font-medium text-stone-500">Configurações</p><h1 className="truncate text-xl font-semibold tracking-tight text-stone-900">{secoes.find((s) => s.id === atual)?.rotulo}</h1></div>
      </div>}
      <div className="grid items-start gap-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <nav
          className="hidden lg:sticky lg:top-8 lg:flex lg:flex-col lg:gap-0.5"
          aria-label="Seções das configurações"
        >
          {secoes.map(({ id, rotulo, Icone, n }) => {
            const ativa = id === atual;
            return (
              <Link
                key={id}
                href={`/admin/configuracoes?secao=${id}`}
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
        <div className={`${temSecao ? "animate-aparecer" : "hidden lg:block"}`} key={atual}>
          {atual === "instituto" && <InstitutoForm instituto={d.instituto} />}
          {atual === "informacoes" && <InformacoesForm instituto={d.instituto} />}
          {atual === "publica" && (
            <div className="space-y-6">
              <HeroAgendaForm inicial={lerHeroAgenda(d.instituto)} />
              <TipografiaForm titulo={d.instituto.fonte_publica_titulo} texto={d.instituto.fonte_publica_texto} />
            </div>
          )}
          {atual === "enderecos" && <ListaEditavel tabela="enderecos" itens={limpo(d.enderecos)} />}
          {atual === "telefones" && <ListaEditavel tabela="telefones" itens={limpo(d.telefones)} />}
          {atual === "redes" && <ListaEditavel tabela="redes" itens={limpo(d.redes)} />}
          {atual === "pix" && <ListaEditavel tabela="pix" itens={limpo(d.pix)} />}
          {atual === "pacotes" && <div className="space-y-6"><PacotesEditaveis itens={limpo(planos) as unknown as PlanoPacote[]} /><CreditosPreferenciasForm inicial={lerPreferenciasCreditos(d.instituto)} /></div>}
          {atual === "gestao" && <GestaoGuardiaoForm instituto={d.instituto} />}
          {atual === "chaves" && ia && <ChavesApiForm chaveMascarada={mascararChave(ia.chave)} prompt={ia.prompt} opcoes={ia.opcoes} />}
          {atual === "tipos" && (
            <div className="space-y-6">
              <TiposEvento itens={limpo(d.tipos) as unknown as TipoItem[]} contagem={contagem} />
              <TagsEvento itens={limpo(d.tags) as unknown as TagItem[]} contagem={contagemTags} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
