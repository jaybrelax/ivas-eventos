import Link from "next/link";
import { ArrowUpRight, CalendarDays, Globe, Lock, MapPin, MessageCircle, Phone } from "lucide-react";
import type { ReactNode } from "react";
import type { Endereco, Instituto, Rede, Telefone } from "@/lib/types";
import { MarcaInstituto } from "@/components/Marca";
import { AvisoCookies } from "./AvisoCookies";

// Ícones de marca desenhados à mão (a biblioteca Lucide não traz logos de marcas)
const svg = (children: ReactNode) => (
  <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
);
const ICONES: Record<string, ReactNode> = {
  instagram: svg(<><rect x="2.5" y="2.5" width="19" height="19" rx="5.5" /><circle cx="12" cy="12" r="4.2" /><circle cx="17.6" cy="6.4" r="0.6" fill="currentColor" /></>),
  facebook: svg(<path d="M15.5 3.5h-2.2A3.8 3.8 0 0 0 9.5 7.3v2.7H7v3.6h2.5v7h3.6v-7h2.6l.6-3.6h-3.2V7.7c0-.6.4-1 1-1h1.4z" />),
  youtube: svg(<><rect x="2" y="5" width="20" height="14" rx="4" /><path d="m10 9.2 5 2.8-5 2.8z" fill="currentColor" /></>),
};

/** Endereço do perfil a partir do que foi cadastrado (URL completa tem prioridade). */
function linkDaRede(r: Rede) {
  if (r.url) return r.url;
  const u = r.usuario.replace(/^@/, "").trim();
  switch (r.rede) {
    case "instagram": return `https://instagram.com/${u}`;
    case "facebook": return `https://facebook.com/${u}`;
    case "youtube": return `https://youtube.com/@${u}`;
    default: return /^https?:\/\//.test(u) ? u : `https://${u}`;
  }
}
const NOME_REDE: Record<string, string> = { instagram: "Instagram", facebook: "Facebook", youtube: "YouTube", site: "Site" };

function linkWhatsApp(numero: string) {
  const n = numero.replace(/\D/g, "");
  return `https://wa.me/${n.startsWith("55") ? n : `55${n}`}`;
}

export function RodapePublico({
  instituto,
  enderecos,
  telefones,
  redes,
}: {
  instituto: Instituto;
  enderecos: Endereco[];
  telefones: Telefone[];
  redes: Rede[];
}) {
  const tel = telefones.find((t) => t.whatsapp && t.padrao) ?? telefones.find((t) => t.whatsapp) ?? telefones[0];
  const ano = new Date().getFullYear();

  return (
    <footer className="relative mt-20 overflow-hidden bg-mata-950 text-white/70">
      <AvisoCookies />
      {/* filete dourado e brilho suave no topo */}
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-ouro-400/60 to-transparent" />
      <div aria-hidden className="pointer-events-none absolute -top-32 left-1/2 h-64 w-[44rem] -translate-x-1/2 rounded-full bg-mata-600/20 blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-4 pt-14 pb-10 sm:px-6 sm:pt-16 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          {/* Marca, missão e redes */}
          <div className="lg:col-span-5">
            <MarcaInstituto instituto={instituto} altura={52} />
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/60">
              Espaço sagrado de consagração, cura e expansão da consciência, dedicado às virtudes, à fraternidade e ao respeito às tradições
              ancestrais da floresta.
            </p>
            {redes.length > 0 && (
              <ul className="mt-6 flex flex-wrap gap-2.5" aria-label="Redes sociais">
                {redes.map((r) => (
                  <li key={r.$id}>
                    <a
                      href={linkDaRede(r)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`${NOME_REDE[r.rede] ?? r.rede} · ${r.usuario}`}
                      aria-label={`${NOME_REDE[r.rede] ?? r.rede} do ${instituto.nome_curto || "Instituto"}`}
                      className="grid h-10 w-10 place-items-center rounded-full bg-white/5 text-white/80 ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:bg-ouro-400 hover:text-mata-950 hover:ring-ouro-400"
                    >
                      {ICONES[r.rede] ?? <Globe size={17} />}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Espaços */}
          <div className="lg:col-span-4">
            <h4 className="text-xs font-semibold tracking-[0.16em] text-ouro-300 uppercase">Nossos espaços</h4>
            <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5 lg:block lg:space-y-4">
              {enderecos.map((e) => (
                <li key={e.$id} className="flex gap-3">
                  <MapPin size={16} className="mt-0.5 shrink-0 text-ouro-300/80" />
                  <div className="min-w-0 text-sm">
                    <p className="font-medium text-white">{e.apelido}</p>
                    <p className="text-white/55">{[e.endereco, e.cidade].filter(Boolean).join(" — ")}</p>
                    {e.link_maps && (
                      <a href={e.link_maps} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-ouro-300 transition hover:text-ouro-200">
                        Ver no mapa <ArrowUpRight size={12} />
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Contato */}
          <div className="lg:col-span-3">
            <h4 className="text-xs font-semibold tracking-[0.16em] text-ouro-300 uppercase">Contato</h4>
            <div className="mt-5 space-y-3">
              {tel && (
                <>
                  <p className="flex items-center gap-2.5 text-sm text-white">
                    <Phone size={15} className="text-ouro-300/80" /> {tel.numero}
                  </p>
                  {tel.rotulo && <p className="-mt-2 pl-[1.6rem] text-xs text-white/50">{tel.rotulo}</p>}
                  {tel.whatsapp && (
                    <a
                      href={linkWhatsApp(tel.numero)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-medium text-white ring-1 ring-white/15 transition hover:bg-emerald-600 hover:ring-emerald-600"
                    >
                      <MessageCircle size={16} /> Falar no WhatsApp
                    </a>
                  )}
                </>
              )}
              <Link href="/eventos" className="flex items-center gap-2.5 pt-1 text-sm text-white/70 transition hover:text-white">
                <CalendarDays size={15} className="text-ouro-300/80" /> Agenda de rituais e encontros
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Socket: direitos, lema e acesso restrito */}
      <div className="relative border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-5 text-xs text-white/45 sm:flex-row sm:px-6 lg:px-8">
          <p className="text-center sm:text-left">© {ano} {instituto.nome}</p>
          <p className="hidden items-center gap-1.5 md:flex">
            Amor, Consciência e Verdade <span className="text-ouro-400">✦</span>
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <Link href="/privacidade" className="transition hover:text-ouro-300">Privacidade</Link>
            <Link href="/termos" className="transition hover:text-ouro-300">Termos de uso</Link>
            <Link href="/login" className="inline-flex items-center gap-1.5 transition hover:text-ouro-300">
              <Lock size={12} /> Área restrita
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
