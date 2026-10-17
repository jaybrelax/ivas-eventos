"use client";

import { forwardRef } from "react";
import { AtSign, CalendarCheck, CalendarDays, Clock, Flame, Leaf, MapPin, Moon, Sparkles, Star, Sun, Users } from "lucide-react";
import type { DadosInstituto, Evento } from "@/lib/types";
import { partesData } from "@/lib/format";
import { mascararTelefone } from "@/lib/telefone";
import { FORMATOS, clarear, escurecer, rgba, type ConfigBanner } from "./tipos";

type Props = {
  c: ConfigBanner;
  dados: DadosInstituto;
  eventos: Evento[];
  fundoImagem: string | null;
  qr: string | null;
  refConteudo?: React.Ref<HTMLDivElement>;
};

const ICONES = { flame: Flame, moon: Moon, leaf: Leaf, users: Users, sparkles: Sparkles, sun: Sun } as const;

/** Ícone do WhatsApp (balão com telefone). */
function IconeWhats({ tamanho }: { tamanho: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 32 32" aria-hidden>
      <circle cx="16" cy="16" r="16" fill="#25D366" />
      <path
        fill="#fff"
        d="M16 6.4c-5.3 0-9.6 4.2-9.6 9.5 0 1.7.5 3.4 1.3 4.8L6.4 25.6l5-1.3c1.4.8 3 1.2 4.6 1.2 5.3 0 9.6-4.3 9.6-9.6S21.3 6.4 16 6.4zm0 17.5c-1.5 0-2.9-.4-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3c-.8-1.3-1.2-2.7-1.2-4.2 0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 7.9-8 7.9zm4.4-5.9c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.8 1c-.1.2-.3.2-.5.1-.2-.1-1-.4-1.9-1.2-.7-.6-1.2-1.4-1.3-1.6-.1-.2 0-.4.1-.5l.4-.4.2-.4c.1-.1 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 2s.9 2.3 1 2.5c.1.2 1.7 2.6 4.1 3.6 2 .8 2.4.6 2.8.6.4 0 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1 0-.1-.2-.2-.4-.3z"
      />
    </svg>
  );
}

/**
 * Layout "Calendário": logo e título dourado no topo, faixa com o mês, cards de eventos
 * em duas colunas na cor de cada tipo (data à esquerda, painel claro à direita) e rodapé
 * com agendamento e WhatsApp.
 */
export const BannerCalendario = forwardRef<HTMLDivElement, Props>(function BannerCalendario(
  { c, dados, eventos, fundoImagem, qr, refConteudo },
  ref,
) {
  const f = FORMATOS[c.formato];
  const colunas = eventos.length <= 1 ? 1 : 2;
  const linhas = Math.max(1, Math.ceil(eventos.length / colunas));
  // Com muitos eventos, o card encolhe um pouco; "Tamanho do texto" ajusta o resto.
  const altoDisponivel = f.h - 520;
  const s = c.escala * Math.max(0.6, Math.min(1, altoDisponivel / (linhas * 186)));
  // Altura máxima de cada linha: poucos eventos não viram cards gigantes.
  const tetoLinha = eventos.length <= 2 ? 300 : 230;
  const px = (n: number) => `${Math.round(n * s)}px`;
  const n = (v: number) => Math.round(v * s);

  const inst = dados.instituto;
  const tipoPorId = new Map(dados.tipos.map((t) => [t.$id, t]));
  const endPorId = new Map(dados.enderecos.map((e) => [e.$id, e]));
  const logoId = c.logo === "clara" ? inst.logo_file_id : c.logo === "escura" ? inst.logo_escura_file_id ?? inst.logo_file_id : null;
  const tels = dados.telefones.filter((t) => t.padrao).length ? dados.telefones.filter((t) => t.padrao) : dados.telefones.slice(0, 1);
  const tel = tels[0];
  const insta = dados.redes.filter((r) => r.rede === "instagram");
  const pix = dados.pix.find((p) => p.padrao) ?? dados.pix[0];

  const ouro = c.corTitulo;
  const ouroGrad = `linear-gradient(180deg, ${clarear(ouro, 0.7)} 0%, ${clarear(ouro, 0.2)} 38%, ${ouro} 55%, ${escurecer(ouro, 0.3)} 100%)`;

  // Fundo: imagem enviada, ou degradê com um brilho de "nascer do sol" no topo e vinheta nas bordas.
  const brilho = `radial-gradient(ellipse 70% 38% at 50% 14%, ${rgba("#ffd98a", 0.55)}, transparent 70%)`;
  const vinheta = `radial-gradient(ellipse 120% 90% at 50% 45%, transparent 55%, ${rgba("#000000", 0.55)} 100%)`;
  const base =
    c.fundoTipo === "solido" ? `linear-gradient(${c.cor1}, ${c.cor1})` : `linear-gradient(${c.angulo}deg, ${c.cor1}, ${c.cor2})`;
  const fundo =
    c.fundoTipo === "imagem" && fundoImagem
      ? {
          backgroundImage: `linear-gradient(${rgba("#000000", c.imagemOpacidade)}, ${rgba("#000000", c.imagemOpacidade)}), url(${fundoImagem})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }
      : { backgroundImage: `${vinheta}, ${brilho}, ${base}` };

  return (
    <div
      ref={ref}
      style={{
        width: f.w,
        height: f.h,
        backgroundColor: c.cor2,
        ...fundo,
        color: c.corTexto,
        fontFamily: `'${c.fonteTexto}', sans-serif`,
        padding: "44px 48px 36px",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Cabeçalho */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: 22 }}>
        {logoId && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/arquivo/${logoId}`} alt="" style={{ height: 100 * c.escala, maxWidth: 520, objectFit: "contain", filter: "drop-shadow(0 4px 12px rgba(0,0,0,.45))" }} />
        )}
        <div
          style={{
            fontFamily: `'${c.fonteTitulo}', serif`,
            fontSize: 104 * c.escala,
            fontWeight: 700,
            lineHeight: 1,
            marginTop: logoId ? 6 : 0,
            backgroundImage: ouroGrad,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            filter: `drop-shadow(0 3px 0 ${escurecer(ouro, 0.55)}) drop-shadow(0 8px 18px rgba(0,0,0,.55))`,
            paddingBottom: 6,
          }}
        >
          {c.titulo}
        </div>
        {c.subtitulo && (
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 6 }}>
            <Ornamento cor={ouro} lado="esq" />
            <div
              style={{
                fontFamily: `'${c.fonteTitulo}', serif`,
                fontSize: 34 * c.escala,
                fontWeight: 700,
                letterSpacing: 6,
                textTransform: "uppercase",
                color: escurecer(ouro, 0.78),
                backgroundImage: ouroGrad,
                padding: `${6 * c.escala}px ${34 * c.escala}px`,
                borderRadius: 999,
                boxShadow: `0 0 0 2px ${rgba("#ffffff", 0.35)} inset, 0 6px 18px rgba(0,0,0,.4)`,
              }}
            >
              {c.subtitulo}
            </div>
            <Ornamento cor={ouro} lado="dir" />
          </div>
        )}
      </div>

      {/* Cards: as linhas dividem a altura disponível (até o teto); se o conteúdo não couber, o aviso de transbordo aparece. */}
      <div ref={refConteudo} style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", overflow: "hidden", padding: 6, margin: -6 }}>
      <div
        style={{
          width: "100%",
          height: `min(100%, ${linhas * n(tetoLinha) + (linhas - 1) * n(18)}px)`,
          display: "grid",
          gridTemplateColumns: `repeat(${colunas}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${linhas}, minmax(min-content, 1fr))`,
          gap: `${px(18)} ${px(20)}`,
        }}
      >
        {eventos.map((e) => {
          const t = tipoPorId.get(e.tipo_id);
          const cor = c.usarCorTipo && t ? t.cor : c.corDestaque;
          const Icone = (t?.icone && ICONES[t.icone as keyof typeof ICONES]) || CalendarDays;
          const d = partesData(e.data);
          const end = e.endereco_id ? endPorId.get(e.endereco_id) : null;
          const textoEnd = end
            ? c.enderecoCompleto
              ? `${end.endereco}${end.cidade ? ` – ${end.cidade.split(/[-–/]/)[0].trim()}` : ""}`
              : end.apelido
            : e.endereco_livre;
          const linhaRitual =
            c.mostrarNumero && e.ritual_numero_geral
              ? `Ritual ${e.ritual_numero_geral} do ${inst.nome_curto || "Instituto"}${e.ritual_numero_ano ? ` – ${e.ritual_numero_ano}º de ${e.ritual_ano ?? d.ano}` : ""}`
              : c.mostrarTipo && t
                ? t.nome
                : null;
          const escuro = escurecer(cor, 0.72);
          return (
            <div
              key={e.$id}
              style={{
                display: "flex",
                borderRadius: px(22),
                padding: px(5),
                gap: px(5),
                background: `linear-gradient(160deg, ${clarear(cor, 0.12)}, ${escurecer(cor, 0.35)})`,
                border: `${px(3)} solid ${clarear(cor, 0.55)}`,
                boxShadow: `0 0 ${px(16)} ${rgba(cor, 0.75)}, 0 ${px(8)} ${px(20)} rgba(0,0,0,.45)`,
                minWidth: 0,
              }}
            >
              {/* Data */}
              <div
                style={{
                  width: colunas === 1 ? "26%" : "31%",
                  flexShrink: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  padding: `${px(10)} ${px(6)}`,
                  color: "#ffffff",
                  textShadow: "0 2px 4px rgba(0,0,0,.35)",
                }}
              >
                <div style={{ fontSize: px(50), fontWeight: 800, lineHeight: 1, letterSpacing: -1 }}>
                  {String(d.dia).padStart(2, "0")}/{String(d.mes).padStart(2, "0")}
                </div>
                <div style={{ fontSize: px(22), fontWeight: 800, letterSpacing: 1, marginTop: px(4), textTransform: "uppercase" }}>
                  {d.diaSemana.split("-")[0]}
                </div>
                {c.mostrarHora && (
                  <>
                    <div style={{ width: "70%", height: px(2), background: rgba("#ffffff", 0.45), margin: `${px(10)} 0 ${px(8)}` }} />
                    <div style={{ display: "flex", alignItems: "center", gap: px(8), fontSize: px(26), fontWeight: 700 }}>
                      <Clock size={n(27)} strokeWidth={2.4} /> {e.hora_inicio}
                    </div>
                  </>
                )}
              </div>

              {/* Painel claro */}
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  position: "relative",
                  overflow: "hidden",
                  borderRadius: px(16),
                  background: `linear-gradient(135deg, ${clarear(cor, 0.94)}, ${clarear(cor, 0.8)})`,
                  color: escuro,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  padding: `${px(12)} ${px(16)}`,
                  boxShadow: `inset 0 0 0 ${px(1.5)} ${rgba("#ffffff", 0.7)}`,
                }}
              >
                {c.mostrarCapa && e.capa_file_id && (
                  <>
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        right: 0,
                        bottom: 0,
                        width: "42%",
                        backgroundImage: `url(/api/arquivo/${e.capa_file_id})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        right: 0,
                        bottom: 0,
                        width: "42%",
                        background: `linear-gradient(90deg, ${clarear(cor, 0.86)} 0%, ${rgba("#ffffff", 0)} 75%)`,
                      }}
                    />
                  </>
                )}
                <div style={{ position: "relative", display: "flex", alignItems: "flex-start", gap: px(10) }}>
                  <span style={{ flexShrink: 0, color: cor, marginTop: px(2) }}>
                    <Icone size={n(28)} strokeWidth={2.2} />
                  </span>
                  <div
                    style={{
                      fontSize: px(colunas === 1 ? 32 : 23),
                      fontWeight: 800,
                      lineHeight: 1.15,
                      color: escurecer(cor, 0.8),
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {e.titulo}
                    {e.destaque && (
                      <Star size={n(22)} fill="#f2b400" stroke="#d99a00" style={{ display: "inline", marginLeft: px(6), verticalAlign: "-0.08em" }} />
                    )}
                  </div>
                </div>
                {linhaRitual && (
                  <div style={{ position: "relative", fontSize: px(16), fontWeight: 600, marginTop: px(3), paddingLeft: px(38), color: escurecer(cor, 0.6), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {linhaRitual}
                  </div>
                )}
                {c.mostrarDescricao && e.descricao && (
                  <div style={{ position: "relative", fontSize: px(17), marginTop: px(4), paddingLeft: px(38), opacity: 0.85, lineHeight: 1.3 }}>
                    {e.descricao.length > 110 ? `${e.descricao.slice(0, 108)}…` : e.descricao}
                  </div>
                )}
                {c.mostrarEndereco && textoEnd && (
                  <>
                    <div style={{ position: "relative", height: px(2), margin: `${px(7)} 0 ${px(6)} ${px(38)}`, background: `linear-gradient(90deg, ${rgba(cor, 0.7)}, transparent)` }} />
                    <div style={{ position: "relative", display: "flex", alignItems: "center", gap: px(6), fontSize: px(16), fontWeight: 600, color: escurecer(cor, 0.7) }}>
                      <MapPin size={n(23)} fill={c.corDestaque} stroke="#ffffff" strokeWidth={1.8} style={{ flexShrink: 0 }} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{textoEnd}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
        {!eventos.length && <div style={{ fontSize: 32, opacity: 0.8, textAlign: "center", gridColumn: "1 / -1" }}>Nenhum evento no período.</div>}
      </div>
      </div>

      {c.mensagem && (
        <div style={{ fontSize: 26 * c.escala, textAlign: "center", marginTop: 18, fontWeight: 600, textShadow: "0 2px 6px rgba(0,0,0,.5)" }}>{c.mensagem}</div>
      )}

      {/* Rodapé */}
      {((c.rodapeTelefones && tel) || (c.rodapeInstagram && insta.length) || (c.rodapePix && pix)) && (
        <div
          style={{
            marginTop: 22,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 30,
            flexWrap: "wrap",
            textShadow: "0 2px 6px rgba(0,0,0,.55)",
          }}
        >
          {c.rodapeTelefones && tel && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span
                  style={{
                    display: "grid",
                    placeItems: "center",
                    width: 58,
                    height: 58,
                    borderRadius: 14,
                    backgroundImage: ouroGrad,
                    color: escurecer(ouro, 0.75),
                    boxShadow: "0 4px 12px rgba(0,0,0,.4)",
                  }}
                >
                  <CalendarCheck size={32} strokeWidth={2.2} />
                </span>
                <div style={{ lineHeight: 1.15 }}>
                  <div style={{ fontSize: 22 * c.escala, color: clarear(ouro, 0.25), fontWeight: 700 }}>Agendamento</div>
                  <div style={{ fontSize: 28 * c.escala, fontWeight: 700 }}>{tel.rotulo || inst.nome_curto}</div>
                </div>
              </div>
              <div style={{ width: 2, height: 58, background: rgba(ouro, 0.7) }} />
              <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 44 * c.escala, fontWeight: 800, letterSpacing: 0.5 }}>
                {tel.whatsapp ? <IconeWhats tamanho={Math.round(54 * c.escala)} /> : null}
                {mascararTelefone(tel.numero)}
              </div>
            </>
          )}
          {c.rodapeInstagram && insta.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 26 * c.escala, fontWeight: 600 }}>
              <AtSign size={Math.round(28 * c.escala)} /> {insta.map((r) => r.usuario.replace(/^@/, "")).join("  ·  ")}
            </div>
          )}
          {c.rodapePix && pix && (
            <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 24 * c.escala }}>
              {c.rodapeQr && qr && (
                <span style={{ background: "#fff", padding: 6, borderRadius: 10, display: "block" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qr} alt="QR Code Pix" style={{ width: 96, height: 96, display: "block" }} />
                </span>
              )}
              <span>
                <strong style={{ color: clarear(ouro, 0.2) }}>Pix</strong> {pix.chave}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

/** Linha com losango, ao lado da faixa do mês. */
function Ornamento({ cor, lado }: { cor: string; lado: "esq" | "dir" }) {
  const linha = <div style={{ width: 70, height: 2, background: `linear-gradient(${lado === "esq" ? "90deg" : "270deg"}, transparent, ${cor})` }} />;
  const losango = <div style={{ width: 12, height: 12, transform: "rotate(45deg)", background: cor, boxShadow: `0 0 8px ${cor}` }} />;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {lado === "esq" ? <>{linha}{losango}</> : <>{losango}{linha}</>}
    </div>
  );
}
