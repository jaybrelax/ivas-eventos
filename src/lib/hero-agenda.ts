import type { Instituto } from "./types";

export type HeroAgenda = {
  selo: string;
  titulo: string;
  descricao: string;
  corTopo: string;
  corMeio: string;
  corBase: string;
  fundoDesktopFileId: string | null;
  fundoMobileFileId: string | null;
};

const HEX = /^#[0-9a-fA-F]{6}$/;
const FILE_ID = /^[A-Za-z0-9._-]{1,64}$/;

export function heroAgendaPadrao(nomeCurto = "IVAS"): HeroAgenda {
  return {
    selo: "Programação Oficial",
    titulo: "Rituais & Encontros Sagrados",
    descricao: `Participe de nossos encontros de consagração da Ayahuasca, autoconhecimento e conexão com a espiritualidade divina no ${nomeCurto || "Instituto IVAS"}.`,
    corTopo: "#170d26",
    corMeio: "#251639",
    corBase: "#1c1917",
    fundoDesktopFileId: null,
    fundoMobileFileId: null,
  };
}

export function lerHeroAgenda(instituto: Instituto): HeroAgenda {
  const padrao = heroAgendaPadrao(instituto.nome_curto);
  if (!instituto.config_hero_agenda) return padrao;
  try {
    const salvo = JSON.parse(instituto.config_hero_agenda) as Partial<HeroAgenda>;
    return {
      selo: typeof salvo.selo === "string" && salvo.selo.trim() ? salvo.selo : padrao.selo,
      titulo: typeof salvo.titulo === "string" && salvo.titulo.trim() ? salvo.titulo : padrao.titulo,
      descricao: typeof salvo.descricao === "string" && salvo.descricao.trim() ? salvo.descricao : padrao.descricao,
      corTopo: typeof salvo.corTopo === "string" && HEX.test(salvo.corTopo) ? salvo.corTopo : padrao.corTopo,
      corMeio: typeof salvo.corMeio === "string" && HEX.test(salvo.corMeio) ? salvo.corMeio : padrao.corMeio,
      corBase: typeof salvo.corBase === "string" && HEX.test(salvo.corBase) ? salvo.corBase : padrao.corBase,
      fundoDesktopFileId: typeof salvo.fundoDesktopFileId === "string" && FILE_ID.test(salvo.fundoDesktopFileId) ? salvo.fundoDesktopFileId : null,
      fundoMobileFileId: typeof salvo.fundoMobileFileId === "string" && FILE_ID.test(salvo.fundoMobileFileId) ? salvo.fundoMobileFileId : null,
    };
  } catch {
    return padrao;
  }
}

export function fundoHeroAgenda(hero: HeroAgenda) {
  return `linear-gradient(to bottom, ${hero.corTopo}, ${hero.corMeio}, ${hero.corBase})`;
}

export function sobreposicaoHeroAgenda(hero: HeroAgenda) {
  return `linear-gradient(to bottom, ${hero.corTopo}C7, ${hero.corMeio}AD, ${hero.corBase}E0)`;
}
