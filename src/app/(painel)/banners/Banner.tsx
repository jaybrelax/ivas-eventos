"use client";

import { forwardRef } from "react";
import { AtSign, Clock, Hash, MapPin, Phone } from "lucide-react";
import type { DadosInstituto, Evento } from "@/lib/types";
import { formatarIdRitual, partesData } from "@/lib/format";
import { FORMATOS, clarear, luminancia, rgba, type ConfigBanner } from "./tipos";
import { BannerCalendario } from "./BannerCalendario";

type Props = {
  c: ConfigBanner;
  dados: DadosInstituto;
  eventos: Evento[];
  fundoImagem: string | null;
  qr: string | null;
};

const ESCALA_LAYOUT = { calendario: 1, lista: 1, grade2: 0.8, grade3: 0.64 };

export const Banner = forwardRef<HTMLDivElement, Props & { refConteudo?: React.Ref<HTMLDivElement> }>(function Banner(
  { c, dados, eventos, fundoImagem, qr, refConteudo },
  ref,
) {
  if (c.layout === "calendario")
    return <BannerCalendario ref={ref} refConteudo={refConteudo} c={c} dados={dados} eventos={eventos} fundoImagem={fundoImagem} qr={qr} />;
  const f = FORMATOS[c.formato];
  const s = c.escala * ESCALA_LAYOUT[c.layout];
  const px = (n: number) => `${Math.round(n * s)}px`;
  const tipoPorId = new Map(dados.tipos.map((t) => [t.$id, t]));
  const endPorId = new Map(dados.enderecos.map((e) => [e.$id, e]));
  const logoId = c.logo === "clara" ? dados.instituto.logo_file_id : c.logo === "escura" ? dados.instituto.logo_escura_file_id ?? dados.instituto.logo_file_id : null;
  const insta = dados.redes.filter((r) => r.rede === "instagram");
  const tels = dados.telefones.filter((t) => t.padrao).length ? dados.telefones.filter((t) => t.padrao) : dados.telefones.slice(0, 2);
  const pix = dados.pix.find((p) => p.padrao) ?? dados.pix[0];
  const temRodape = (c.rodapeInstagram && insta.length) || (c.rodapeTelefones && tels.length) || (c.rodapePix && pix);

  const fundo =
    c.fundoTipo === "solido"
      ? { background: c.cor1 }
      : c.fundoTipo === "degrade"
        ? { background: `linear-gradient(${c.angulo}deg, ${c.cor1}, ${c.cor2})` }
        : {
            backgroundColor: c.cor1,
            backgroundImage: fundoImagem
              ? `linear-gradient(${rgba("#000000", c.imagemOpacidade)}, ${rgba("#000000", c.imagemOpacidade)}), url(${fundoImagem})`
              : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          };

  const colunas = c.layout === "lista" ? 1 : c.layout === "grade2" ? 2 : 3;

  return (
    <div
      ref={ref}
      style={{
        width: f.w,
        height: f.h,
        ...fundo,
        color: c.corTexto,
        fontFamily: `'${c.fonteTexto}', sans-serif`,
        padding: 64,
        display: "flex",
        flexDirection: "column",
        gap: 36,
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* Cabeçalho */}
      <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
        {logoId && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/arquivo/${logoId}`} alt="" style={{ height: 130 * c.escala, maxWidth: 260, objectFit: "contain" }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: `'${c.fonteTitulo}', serif`, fontSize: 76 * c.escala, fontWeight: 700, lineHeight: 1.05, color: c.corDestaque }}>
            {c.titulo}
          </div>
          {c.subtitulo && <div style={{ fontSize: 30 * c.escala, opacity: 0.85, marginTop: 10, letterSpacing: 1 }}>{c.subtitulo}</div>}
        </div>
      </div>

      {/* Cards */}
      <div
        ref={refConteudo}
        style={{
          flex: 1,
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: `repeat(${colunas}, minmax(0, 1fr))`,
          alignContent: "start",
          gap: px(22),
          overflow: "hidden",
        }}
      >
        {eventos.map((e) => {
          const t = tipoPorId.get(e.tipo_id);
          const cor = c.usarCorTipo && t ? t.cor : c.corDestaque;
          // Em fundo escuro (texto claro), o rótulo do tipo usa um tom mais claro para ser legível.
          const corRotulo = luminancia(c.corTexto) > 0.5 && luminancia(cor) < 0.35 ? clarear(cor, 0.45) : cor;
          const d = partesData(e.data);
          const end = e.endereco_id ? endPorId.get(e.endereco_id) : null;
          const textoEnd = end ? (c.enderecoCompleto ? `${end.endereco}${end.cidade ? ` — ${end.cidade}` : ""}` : end.apelido) : e.endereco_livre;
          const idR = formatarIdRitual(e.ritual_numero_geral, e.ritual_ano, e.ritual_numero_ano);
          return (
            <div
              key={e.$id}
              style={{
                display: "flex",
                gap: px(26),
                alignItems: "center",
                background: rgba(c.corCard, c.opacidadeCard),
                borderLeft: `${px(12)} solid ${cor}`,
                borderRadius: px(22),
                padding: `${px(22)} ${px(28)}`,
              }}
            >
              <div style={{ textAlign: "center", minWidth: px(110) }}>
                <div style={{ fontSize: px(70), fontWeight: 800, lineHeight: 1, fontFamily: `'${c.fonteTitulo}', serif` }}>{String(d.dia).padStart(2, "0")}</div>
                <div style={{ fontSize: px(24), fontWeight: 700, letterSpacing: 3, color: corRotulo }}>{d.mesCurto}</div>
                <div style={{ fontSize: px(18), opacity: 0.8, textTransform: "capitalize" }}>{d.diaSemana.split("-")[0]}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {c.mostrarTipo && t && (
                  <div style={{ fontSize: px(19), fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: corRotulo, marginBottom: px(4) }}>{t.nome}</div>
                )}
                <div style={{ fontSize: px(38), fontWeight: 700, lineHeight: 1.15 }}>{e.titulo}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: `${px(4)} ${px(22)}`, marginTop: px(8), fontSize: px(24), opacity: 0.92 }}>
                  {c.mostrarHora && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: px(8) }}>
                      <Clock size={Math.round(24 * s)} /> {e.hora_inicio.replace(":", "h")}
                    </span>
                  )}
                  {c.mostrarEndereco && textoEnd && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: px(8) }}>
                      <MapPin size={Math.round(24 * s)} /> {textoEnd}
                    </span>
                  )}
                  {c.mostrarNumero && idR && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: px(6), opacity: 0.85 }}>
                      <Hash size={Math.round(22 * s)} /> {idR.replace("R-", "")}
                    </span>
                  )}
                </div>
                {c.mostrarDescricao && e.descricao && (
                  <div style={{ fontSize: px(21), opacity: 0.8, marginTop: px(8), lineHeight: 1.35 }}>{e.descricao}</div>
                )}
              </div>
            </div>
          );
        })}
        {!eventos.length && <div style={{ fontSize: 32, opacity: 0.7 }}>Nenhum evento no período.</div>}
      </div>

      {c.mensagem && <div style={{ fontSize: 28 * c.escala, textAlign: "center", opacity: 0.9, fontStyle: "italic" }}>{c.mensagem}</div>}

      {/* Rodapé */}
      {temRodape ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 32,
            borderTop: `2px solid ${rgba(c.corTexto, 0.25)}`,
            paddingTop: 28,
            fontSize: 25 * c.escala,
          }}
        >
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
            {c.rodapeInstagram &&
              insta.map((r) => (
                <span key={r.$id} style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                  <AtSign size={Math.round(26 * c.escala)} /> {r.usuario.replace(/^@/, "")}
                </span>
              ))}
            {c.rodapeTelefones && tels.length > 0 && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                <Phone size={Math.round(26 * c.escala)} /> {tels.map((t) => t.numero).join("  ·  ")}
              </span>
            )}
            {c.rodapePix && pix && (
              <span>
                <strong style={{ color: c.corDestaque }}>Pix</strong> {pix.chave}
                <span style={{ opacity: 0.75 }}> — {pix.favorecido}</span>
              </span>
            )}
          </div>
          {c.rodapePix && c.rodapeQr && qr && (
            <div style={{ background: "#ffffff", padding: 10, borderRadius: 14 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="QR Code Pix" style={{ width: 150, height: 150, display: "block" }} />
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
});
