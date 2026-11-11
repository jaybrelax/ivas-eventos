import type { Evento, TipoEvento } from "./types";

/** Larguras em que /api/arquivo/[id]?w= entrega as imagens (cada uma fica em cache na CDN). */
export const LARGURAS_IMAGEM = [64, 128, 160, 320, 640, 960, 1600] as const;

/** Endereço de uma imagem do Storage; com `w`, a versão reduzida (WEBP) nessa largura. */
export function urlImagem(id: string, w?: number) {
  return w ? `/api/arquivo/${id}?w=${w}` : `/api/arquivo/${id}`;
}

/** `srcset` para o navegador escolher a versão certa conforme a largura na tela. */
export function srcsetImagem(id: string, larguras: readonly number[] = [320, 640, 960]) {
  return larguras.map((w) => `${urlImagem(id, w)} ${w}w`).join(", ");
}

/**
 * Para quem terminou o cadastro vindo de uma página de evento: a mesma página, já com a janela de
 * confirmação de participação aberta (?participar=1). Outros destinos seguem como estão.
 */
export function comParticiparAberto(destino: string) {
  if (!/^\/(ritual|evento|eventos)\/[^/?#]+/.test(destino) || /[?&]participar=/.test(destino)) return destino;
  const [base, ancora] = destino.split("#");
  return `${base}${base.includes("?") ? "&" : "?"}participar=1${ancora ? `#${ancora}` : ""}`;
}

/**
 * Endereço público do evento: rituais usam o número geral (/ritual/525);
 * os demais tipos seguem com o id (/evento/abc123).
 */
export function urlPublicaEvento(e: Pick<Evento, "$id" | "ritual_numero_geral">, tipo?: Pick<TipoEvento, "conta_como_ritual"> | null) {
  const ritual = !!e.ritual_numero_geral && (tipo ? tipo.conta_como_ritual : true);
  return ritual ? `/ritual/${e.ritual_numero_geral}` : `/eventos/${e.$id}`;
}
