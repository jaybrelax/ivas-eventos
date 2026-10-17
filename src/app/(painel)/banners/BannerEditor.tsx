"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { domToPng } from "modern-screenshot";
import { Download } from "lucide-react";
import type { DadosInstituto, Evento, ModeloBanner } from "@/lib/types";
import { dataCurta } from "@/lib/format";
import { gerarPayloadPix } from "@/lib/pix";
import { FONTES } from "../configuracoes/campos";
import { Banner } from "./Banner";
import { FORMATOS, configPadrao, type ConfigBanner, type Formato } from "./tipos";
import { excluirModelo, salvarModelo } from "./actions";
import { Aviso } from "@/components/ui";
import { BotaoConfirmar } from "@/components/Confirmar";

type Props = {
  dados: DadosInstituto;
  eventos: Evento[];
  modelos: ModeloBanner[];
  periodo: { inicio: string; fim: string; tipos: string[]; eventoId: string | null };
  tituloSugerido: string;
  subtituloSugerido: string;
  podeSalvarModelo: boolean;
};

const FAMILIAS = FONTES.map((f) => `family=${f.replace(/ /g, "+")}${f === "Marcellus" ? "" : ":wght@400;600;700"}`).join("&");
const URL_FONTES = `https://fonts.googleapis.com/css2?${FAMILIAS}&display=swap`;

function Secao({ titulo, children, aberta = false }: { titulo: string; children: ReactNode; aberta?: boolean }) {
  return (
    <details open={aberta} className="group border-b border-stone-100 py-1 last:border-b-0">
      <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg px-2 py-2.5 text-sm font-semibold text-stone-800 select-none hover:bg-stone-50">
        {titulo}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-stone-400 transition group-open:rotate-180" aria-hidden><path d="m6 9 6 6 6-6" /></svg>
      </summary>
      <div className="space-y-3 px-2 pt-1 pb-4">{children}</div>
    </details>
  );
}

function Check({ rotulo, v, set }: { rotulo: string; v: boolean; set: (b: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={v} onChange={(e) => set(e.target.checked)} className="h-4 w-4 cursor-pointer rounded accent-mata-700" />
      {rotulo}
    </label>
  );
}

function Cor({ rotulo, v, set }: { rotulo: string; v: string; set: (s: string) => void }) {
  return (
    <label className="flex items-center justify-between gap-2 text-sm">
      {rotulo}
      <input type="color" value={v} onChange={(e) => set(e.target.value)} className="h-8 w-14 cursor-pointer rounded-lg border border-stone-200 bg-white p-0.5 shadow-sm" />
    </label>
  );
}

function Faixa({ rotulo, v, set, min, max, passo }: { rotulo: string; v: number; set: (n: number) => void; min: number; max: number; passo: number }) {
  return (
    <label className="block text-sm">
      <span className="flex justify-between">{rotulo}<span className="tabular-nums text-stone-500">{v}</span></span>
      <input type="range" min={min} max={max} step={passo} value={v} onChange={(e) => set(Number(e.target.value))} className="mt-1 w-full cursor-pointer accent-mata-700" />
    </label>
  );
}

export function BannerEditor({ dados, eventos, modelos, periodo, tituloSugerido, subtituloSugerido, podeSalvarModelo }: Props) {
  const router = useRouter();
  const [c, setC] = useState<ConfigBanner>(() => configPadrao(dados.instituto, tituloSugerido, subtituloSugerido));
  const set = <K extends keyof ConfigBanner>(k: K) => (v: ConfigBanner[K]) => setC((o) => ({ ...o, [k]: v }));

  const [inicio, setInicio] = useState(periodo.inicio);
  const [fim, setFim] = useState(periodo.fim);
  const [tiposSel, setTiposSel] = useState<string[]>(periodo.tipos);
  const [excluidos, setExcluidos] = useState<Set<string>>(new Set());
  const [fundoImagem, setFundoImagem] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [transbordou, setTransbordou] = useState(false);
  const [ajuste, setAjuste] = useState<null | "subindo" | "descendo">(null);
  const [baixando, setBaixando] = useState(false);
  const [modeloId, setModeloId] = useState("");
  const [nomeNovo, setNomeNovo] = useState<string | null>(null); // campo do "Salvar como novo"
  const [msg, setMsg] = useState<{ ok?: string; erro?: string }>();
  const [salvando, iniciar] = useTransition();

  // Título acompanha o período escolhido
  useEffect(() => setC((o) => ({ ...o, titulo: tituloSugerido, subtitulo: subtituloSugerido })), [tituloSugerido, subtituloSugerido]);

  const visiveis = useMemo(() => eventos.filter((e) => !excluidos.has(e.$id)), [eventos, excluidos]);
  const pix = dados.pix.find((p) => p.padrao) ?? dados.pix[0];

  useEffect(() => {
    if (!pix) return setQr(null);
    const payload = gerarPayloadPix({ tipo: pix.tipo, chave: pix.chave, favorecido: pix.favorecido, cidade: pix.cidade, valor: c.valorPix });
    QRCode.toDataURL(payload, { margin: 1, width: 360, errorCorrectionLevel: "M" }).then(setQr);
  }, [pix, c.valorPix]);

  // Escala da pré-visualização
  const caixa = useRef<HTMLDivElement>(null);
  const [largura, setLargura] = useState(500);
  useLayoutEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setLargura(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const f = FORMATOS[c.formato];
  const escalaPrevia = Math.min(1, largura / f.w);

  const noBanner = useRef<HTMLDivElement>(null);
  const conteudo = useRef<HTMLDivElement>(null);
  const medirTransbordo = () => {
    const el = conteudo.current;
    return !!el && el.scrollHeight > el.clientHeight + 2;
  };
  useLayoutEffect(() => {
    const checar = () => setTransbordou(medirTransbordo());
    checar();
    document.fonts?.ready.then(checar);
  });

  // "Ajustar para caber": aumenta ou diminui o texto em passos até os eventos preencherem o formato.
  useLayoutEffect(() => {
    if (!ajuste) return;
    const passa = medirTransbordo();
    const arred = (n: number) => Math.round(n * 100) / 100;
    if (ajuste === "descendo") {
      if (passa && c.escala > 0.6) setC((o) => ({ ...o, escala: arred(o.escala - 0.05) }));
      else setAjuste(null);
    } else {
      if (passa) {
        setC((o) => ({ ...o, escala: arred(o.escala - 0.05) }));
        setAjuste(null);
      } else if (c.escala < 1.6) setC((o) => ({ ...o, escala: arred(o.escala + 0.05) }));
      else setAjuste(null);
    }
  }, [ajuste, c.escala]);

  function aplicarPeriodo() {
    const p = new URLSearchParams({ inicio, fim });
    if (tiposSel.length) p.set("tipos", tiposSel.join(","));
    router.push(`/banners?${p}`);
  }

  async function baixar() {
    if (!noBanner.current) return;
    setBaixando(true);
    try {
      await document.fonts?.ready;
      const png = await domToPng(noBanner.current, { scale: f.saida / f.w, width: f.w, height: f.h });
      const a = document.createElement("a");
      a.href = png;
      a.download = `banner-ivas-${c.formato}-${periodo.eventoId ? "evento" : periodo.inicio}.png`;
      a.click();
    } catch (e) {
      console.error(e);
      setMsg({ erro: "Não foi possível gerar a imagem. Tente de novo." });
    } finally {
      setBaixando(false);
    }
  }

  function carregarModelo(id: string) {
    setModeloId(id);
    const m = modelos.find((x) => x.$id === id);
    if (!m) return;
    try {
      const salvo = JSON.parse(m.config) as Partial<ConfigBanner>;
      setC((o) => ({ ...o, ...salvo, titulo: o.titulo, subtitulo: o.subtitulo }));
    } catch {
      setMsg({ erro: "Modelo corrompido." });
    }
  }

  function guardarModelo(novo: boolean, nomeDigitado?: string) {
    const atual = modelos.find((m) => m.$id === modeloId);
    const nome = (novo || !atual ? nomeDigitado : atual.nome)?.trim();
    if (!nome) return;
    setNomeNovo(null);
    // O modelo guarda só o visual; título e eventos vêm do período.
    const { titulo: _t, subtitulo: _s, ...visual } = c;
    void _t;
    void _s;
    iniciar(async () => {
      const r = await salvarModelo(nome, JSON.stringify(visual), novo ? undefined : modeloId || undefined);
      setMsg(r);
      if (r.id) setModeloId(r.id);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
      <link rel="stylesheet" href={URL_FONTES} crossOrigin="anonymous" precedence="default" />

      {/* Controles */}
      <div className="cartao h-fit p-2 sm:p-3 lg:sticky lg:top-8 lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto">
        {msg && <div className="mb-2"><Aviso tipo={msg.erro ? "erro" : "ok"}>{msg.erro ?? msg.ok}</Aviso></div>}

        <Secao titulo="Período e eventos" aberta>
          {periodo.eventoId ? (
            <p className="text-sm">
              Banner de um único evento. <a href="/banners" className="text-mata-700 underline">Usar período</a>
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs">De<input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} className="campo mt-1" /></label>
                <label className="text-xs">Até<input type="date" value={fim} onChange={(e) => setFim(e.target.value)} className="campo mt-1" /></label>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {dados.tipos.map((t) => {
                  const on = tiposSel.includes(t.$id);
                  return (
                    <button
                      key={t.$id}
                      type="button"
                      onClick={() => setTiposSel((s) => (on ? s.filter((x) => x !== t.$id) : [...s, t.$id]))}
                      className="rounded-full border px-2.5 py-1 text-xs"
                      style={on ? { background: t.cor, borderColor: t.cor, color: "white" } : {}}
                    >
                      {t.nome}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-stone-500">Sem tipo marcado = todos os tipos.</p>
              <button type="button" onClick={aplicarPeriodo} className="btn-secundario w-full">Aplicar período</button>
            </>
          )}
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-stone-200 p-2">
            {eventos.length === 0 && <p className="text-xs text-stone-500">Nenhum evento marcado para banner nesse período.</p>}
            {eventos.map((e) => (
              <label key={e.$id} className="flex items-start gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={!excluidos.has(e.$id)}
                  onChange={() => setExcluidos((s) => { const n = new Set(s); if (n.has(e.$id)) n.delete(e.$id); else n.add(e.$id); return n; })}
                  className="mt-0.5 accent-mata-800"
                />
                <span><strong>{dataCurta(e.data).slice(0, 5)}</strong> {e.titulo}</span>
              </label>
            ))}
          </div>
        </Secao>

        <Secao titulo="Modelos salvos">
          <select value={modeloId} onChange={(e) => carregarModelo(e.target.value)} className="campo">
            <option value="">— escolher modelo —</option>
            {modelos.map((m) => <option key={m.$id} value={m.$id}>{m.nome}</option>)}
          </select>
          {podeSalvarModelo && (
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={salvando} onClick={() => setNomeNovo((v) => (v === null ? "" : null))} className="btn-secundario px-3 py-1.5 text-xs">Salvar como novo</button>
              {modeloId && <button type="button" disabled={salvando} onClick={() => guardarModelo(false)} className="btn-secundario px-3 py-1.5 text-xs">Atualizar modelo</button>}
              {modeloId && (
                <BotaoConfirmar
                  disabled={salvando}
                  pergunta="Excluir este modelo de banner?"
                  aoConfirmar={() => iniciar(async () => { setMsg(await excluirModelo(modeloId)); setModeloId(""); router.refresh(); })}
                  className="btn-perigo px-3 py-1.5 text-xs"
                >
                  Excluir
                </BotaoConfirmar>
              )}
            </div>
          )}
          {podeSalvarModelo && nomeNovo !== null && (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                guardarModelo(true, nomeNovo);
              }}
            >
              <input
                value={nomeNovo}
                onChange={(e) => setNomeNovo(e.target.value)}
                placeholder="Nome do modelo"
                maxLength={80}
                autoFocus
                className="campo h-9 flex-1 text-xs"
                aria-label="Nome do novo modelo"
              />
              <button className="btn-primario h-9 px-3 text-xs" disabled={salvando || !nomeNovo.trim()}>Salvar</button>
            </form>
          )}
          <p className="text-xs text-stone-500">O modelo guarda só o visual. Os eventos são lidos de novo a cada vez.</p>
        </Secao>

        <Secao titulo="Formato e layout" aberta>
          <select value={c.formato} onChange={(e) => set("formato")(e.target.value as Formato)} className="campo">
            {Object.entries(FORMATOS).map(([k, v]) => <option key={k} value={k}>{v.nome}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-1 rounded-lg border border-stone-300 p-0.5 text-xs">
            {([["calendario", "Calendário (cards)"], ["lista", "Lista"], ["grade2", "2 colunas"], ["grade3", "3 colunas"]] as const).map(([k, r]) => (
              <button key={k} type="button" onClick={() => set("layout")(k)} className={`rounded-md py-1.5 ${c.layout === k ? "bg-mata-800 text-white" : ""}`}>{r}</button>
            ))}
          </div>
        </Secao>

        <Secao titulo="Textos">
          <label className="block text-xs">{c.layout === "calendario" ? "Título grande" : "Título"}<input value={c.titulo} onChange={(e) => set("titulo")(e.target.value)} className="campo mt-1" /></label>
          <label className="block text-xs">{c.layout === "calendario" ? "Faixa abaixo do título (ex.: mês)" : "Subtítulo"}<input value={c.subtitulo} onChange={(e) => set("subtitulo")(e.target.value)} className="campo mt-1" /></label>
          <label className="block text-xs">Mensagem acima do rodapé<input value={c.mensagem} onChange={(e) => set("mensagem")(e.target.value)} className="campo mt-1" placeholder="Ex.: Inscrições pelo WhatsApp" /></label>
        </Secao>

        <Secao titulo="Fundo">
          <div className="grid grid-cols-3 gap-1 rounded-lg border border-stone-300 p-0.5 text-xs">
            {([["solido", "Sólido"], ["degrade", "Degradê"], ["imagem", "Imagem"]] as const).map(([k, r]) => (
              <button key={k} type="button" onClick={() => set("fundoTipo")(k)} className={`rounded-md py-1.5 ${c.fundoTipo === k ? "bg-mata-800 text-white" : ""}`}>{r}</button>
            ))}
          </div>
          <Cor rotulo={c.fundoTipo === "degrade" ? "Cor inicial" : "Cor de fundo"} v={c.cor1} set={set("cor1")} />
          {c.fundoTipo === "degrade" && (
            <>
              <Cor rotulo="Cor final" v={c.cor2} set={set("cor2")} />
              <Faixa rotulo="Ângulo" v={c.angulo} set={set("angulo")} min={0} max={360} passo={5} />
            </>
          )}
          {c.fundoTipo === "imagem" && (
            <>
              <input
                type="file"
                accept="image/*"
                className="block text-xs"
                onChange={(e) => {
                  const arq = e.target.files?.[0];
                  if (!arq) return;
                  const r = new FileReader();
                  r.onload = () => setFundoImagem(String(r.result));
                  r.readAsDataURL(arq);
                }}
              />
              <Faixa rotulo="Escurecer imagem" v={c.imagemOpacidade} set={set("imagemOpacidade")} min={0} max={0.9} passo={0.05} />
            </>
          )}
        </Secao>

        <Secao titulo="Cores">
          <Cor rotulo="Texto" v={c.corTexto} set={set("corTexto")} />
          {c.layout === "calendario" && <Cor rotulo="Título dourado e faixa" v={c.corTitulo} set={set("corTitulo")} />}
          <Cor rotulo={c.layout === "calendario" ? "Ícone de local e detalhes" : "Destaque (título, Pix)"} v={c.corDestaque} set={set("corDestaque")} />
          <Cor rotulo="Fundo do card" v={c.corCard} set={set("corCard")} />
          <Faixa rotulo="Opacidade do card" v={c.opacidadeCard} set={set("opacidadeCard")} min={0} max={1} passo={0.05} />
          {(c.layout === "grade2" || c.layout === "grade3") && (
            <>
              <Check rotulo="Efeito vidro (desfoca o fundo atrás do card)" v={c.vidro} set={set("vidro")} />
              {c.vidro && <Faixa rotulo="Intensidade do desfoque" v={c.desfoque} set={set("desfoque")} min={4} max={40} passo={2} />}
            </>
          )}
          <Check rotulo="Usar a cor de cada tipo de evento" v={c.usarCorTipo} set={set("usarCorTipo")} />
          <label className="block text-xs">Logo
            <select value={c.logo} onChange={(e) => set("logo")(e.target.value as ConfigBanner["logo"])} className="campo mt-1">
              <option value="escura">Versão para fundo escuro</option>
              <option value="clara">Versão para fundo claro</option>
              <option value="nenhuma">Sem logo</option>
            </select>
          </label>
        </Secao>

        <Secao titulo="Tipografia">
          <label className="block text-xs">Fonte do título
            <select value={c.fonteTitulo} onChange={(e) => set("fonteTitulo")(e.target.value)} className="campo mt-1">{FONTES.map((x) => <option key={x}>{x}</option>)}</select>
          </label>
          <label className="block text-xs">Fonte do texto
            <select value={c.fonteTexto} onChange={(e) => set("fonteTexto")(e.target.value)} className="campo mt-1">{FONTES.map((x) => <option key={x}>{x}</option>)}</select>
          </label>
          <Faixa rotulo="Tamanho do texto" v={c.escala} set={set("escala")} min={0.6} max={1.4} passo={0.05} />
        </Secao>

        <Secao titulo="Campos no card">
          <Check rotulo="Tipo do evento" v={c.mostrarTipo} set={set("mostrarTipo")} />
          <Check rotulo="Horário" v={c.mostrarHora} set={set("mostrarHora")} />
          <Check rotulo="Endereço" v={c.mostrarEndereco} set={set("mostrarEndereco")} />
          {c.mostrarEndereco && <div className="pl-6"><Check rotulo="Endereço completo (em vez do apelido)" v={c.enderecoCompleto} set={set("enderecoCompleto")} /></div>}
          <Check rotulo="Número do ritual" v={c.mostrarNumero} set={set("mostrarNumero")} />
          <Check rotulo="Descrição" v={c.mostrarDescricao} set={set("mostrarDescricao")} />
          {c.layout === "calendario" && <Check rotulo="Capa do evento no card" v={c.mostrarCapa} set={set("mostrarCapa")} />}
        </Secao>

        <Secao titulo="Rodapé">
          <Check rotulo="Instagram" v={c.rodapeInstagram} set={set("rodapeInstagram")} />
          <Check rotulo={c.layout === "calendario" ? "Agendamento e WhatsApp (telefone padrão)" : "Telefones"} v={c.rodapeTelefones} set={set("rodapeTelefones")} />
          <Check rotulo="Chave Pix" v={c.rodapePix} set={set("rodapePix")} />
          {c.rodapePix && <div className="pl-6"><Check rotulo="QR Code Pix" v={c.rodapeQr} set={set("rodapeQr")} /></div>}
          {c.rodapePix && c.rodapeQr && (
            <label className="block text-xs">Valor sugerido no QR (0 = livre)
              <input type="number" min={0} step={1} value={c.valorPix} onChange={(e) => set("valorPix")(Number(e.target.value) || 0)} className="campo mt-1" />
            </label>
          )}
          {!pix && <p className="text-xs text-stone-500">Cadastre uma chave Pix em Configurações.</p>}
        </Secao>
      </div>

      {/* Pré-visualização */}
      <div className="space-y-4 lg:sticky lg:top-8 lg:h-fit">
        <div className="cartao flex flex-wrap items-center gap-3 p-3 sm:p-3">
          <button type="button" onClick={baixar} disabled={baixando} className="btn-primario">
            <Download size={16} /> {baixando ? "Gerando…" : `Baixar PNG (${f.saida}×${Math.round((f.h * f.saida) / f.w)})`}
          </button>
          <button type="button" onClick={() => setAjuste(medirTransbordo() ? "descendo" : "subindo")} disabled={!!ajuste} className="btn-secundario">
            Ajustar texto para caber
          </button>
          <span className="chip ml-auto bg-stone-100 text-stone-600 tabular-nums">{visiveis.length} evento(s)</span>
        </div>
        {transbordou && (
          <Aviso tipo="info">
            Os eventos não cabem nesse formato. Clique em “Ajustar texto para caber”, use 2 ou 3 colunas, o Story, ou divida o período.
          </Aviso>
        )}
        <div ref={caixa} className="w-full max-w-[640px] rounded-2xl bg-[repeating-conic-gradient(#f0efeb_0_25%,#f7f6f3_0_50%)] bg-[length:20px_20px] p-4 ring-1 ring-stone-200/80 sm:p-6">
          <div className="mx-auto overflow-hidden rounded-lg shadow-elevado ring-1 ring-black/5" style={{ width: f.w * escalaPrevia, height: f.h * escalaPrevia }}>
            <div style={{ transform: `scale(${escalaPrevia})`, transformOrigin: "top left", width: f.w, height: f.h }}>
              <Banner ref={noBanner} refConteudo={conteudo} c={c} dados={dados} eventos={visiveis} fundoImagem={fundoImagem} qr={qr} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
