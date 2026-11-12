import "server-only";
import sharp from "sharp";

/**
 * Cor predominante da capa, já ajustada para servir de fundo do topo da página pública:
 * mantém a tonalidade, mas escurece (e dosa a saturação) para o título branco continuar legível.
 * Devolve "#rrggbb" ou null se a imagem não puder ser lida.
 */
export async function corDaCapa(imagem: Buffer): Promise<string | null> {
  try {
    const { data } = await sharp(imagem).resize(48, 48, { fit: "inside" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    // Tom mais frequente entre os pixels vivos (histograma de matiz em 24 faixas, peso = saturação).
    // Só depois tira a média das cores dessa faixa: misturar tons diferentes dá marrom.
    const FAIXAS = 24;
    const soma = Array.from({ length: FAIXAS }, () => ({ peso: 0, r: 0, g: 0, b: 0 }));
    let rt = 0, gt = 0, bt = 0;
    for (let i = 0; i < data.length; i += 3) {
      const pr = data[i], pg = data[i + 1], pb = data[i + 2];
      rt += pr; gt += pg; bt += pb;
      const [ph, ps, pl] = rgbParaHsl(pr, pg, pb);
      if (ps < 0.2 || pl < 0.1 || pl > 0.9) continue;
      const f = soma[Math.min(FAIXAS - 1, Math.floor(ph * FAIXAS))];
      const w = ps;
      f.peso += w; f.r += pr * w; f.g += pg * w; f.b += pb * w;
    }
    const top = soma.reduce((a, f) => (f.peso > a.peso ? f : a));
    const n = data.length / 3;
    // Pouca cor viva na imagem: usa a média geral (tende ao neutro, que é o certo nesse caso)
    return top.peso > n * 0.04 ? corDeFundo(top.r / top.peso, top.g / top.peso, top.b / top.peso) : corDeFundo(rt / n, gt / n, bt / n);
  } catch {
    return null;
  }
}

/** Ajusta uma cor RGB para fundo escuro: luminosidade entre 16% e 26% e saturação entre 45% e 85%. */
export function corDeFundo(r: number, g: number, b: number) {
  const [h, s, l] = rgbParaHsl(r, g, b);
  const sat = s < 0.08 ? s : Math.min(0.85, Math.max(0.45, s));
  const luz = Math.min(0.26, Math.max(0.16, l * 0.5));
  return hslParaHex(h, sat, luz);
}

function rgbParaHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}

function hslParaHex(h: number, s: number, l: number) {
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
