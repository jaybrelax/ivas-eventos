/** Larguras em que /api/arquivo/[id]?w= entrega as imagens (cada uma fica em cache na CDN). */
export const LARGURAS_IMAGEM = [160, 320, 640, 960, 1600] as const;

/** Endereço de uma imagem do Storage; com `w`, a versão reduzida (WEBP) nessa largura. */
export function urlImagem(id: string, w?: number) {
  return w ? `/api/arquivo/${id}?w=${w}` : `/api/arquivo/${id}`;
}

/** `srcset` para o navegador escolher a versão certa conforme a largura na tela. */
