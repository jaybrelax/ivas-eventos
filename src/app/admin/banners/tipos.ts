import type { Instituto } from "@/lib/types";

export const FORMATOS = {
  feed: { nome: "Feed 1080×1350", w: 1080, h: 1350, saida: 1080 },
  quadrado: { nome: "Quadrado 1080×1080", w: 1080, h: 1080, saida: 1080 },
  story: { nome: "Story 1080×1920", w: 1080, h: 1920, saida: 1080 },
  a4: { nome: "A4 impressão (300 dpi)", w: 1080, h: 1527, saida: 2480 },
} as const;
export type Formato = keyof typeof FORMATOS;

export type ConfigBanner = {
  formato: Formato;
  layout: "calendario" | "lista" | "grade2" | "grade3";
  fundoTipo: "solido" | "degrade" | "imagem";
  cor1: string;
  cor2: string;
  angulo: number;
  imagemOpacidade: number; // escurecimento sobre a imagem 0–1
  corTexto: string;
  corCard: string;
  opacidadeCard: number;
  vidro: boolean; // glassmorphism nos cards (layouts de 2 e 3 colunas)
  desfoque: number; // intensidade do desfoque do vidro, em px
  corDestaque: string;
  corTitulo: string; // título dourado do layout Calendário
  usarCorTipo: boolean;
  fonteTitulo: string;
  fonteTexto: string;
  escala: number;
  titulo: string;
  subtitulo: string;
  mensagem: string;
  logo: "clara" | "escura" | "nenhuma";
  mostrarTipo: boolean;
  mostrarHora: boolean;
  mostrarEndereco: boolean;
  enderecoCompleto: boolean;
  mostrarNumero: boolean;
  mostrarDescricao: boolean;
  mostrarCapa: boolean; // capa do evento esmaecida no card (layout Calendário)
  rodapeInstagram: boolean;
  rodapeTelefones: boolean;
  rodapePix: boolean;
  rodapeQr: boolean;
  valorPix: number;
};

export function configPadrao(inst: Instituto, titulo: string, subtitulo: string): ConfigBanner {
  return {
    formato: "feed",
    layout: "calendario",
    fundoTipo: "degrade",
    cor1: inst.cor_primaria,
    cor2: "#120a20",
    angulo: 160,
    imagemOpacidade: 0.55,
    corTexto: "#ffffff",
    corCard: "#ffffff",
    opacidadeCard: 0.1,
    vidro: true,
    desfoque: 18,
    corDestaque: inst.cor_secundaria,
    corTitulo: "#f2c14e",
    usarCorTipo: true,
    // Serifa com minúsculas, como no modelo de calendário (a do Instituto continua na lista).
    fonteTitulo: "Playfair Display",
    fonteTexto: inst.fonte_texto,
    escala: 1,
    titulo,
    subtitulo,
    mensagem: "",
    logo: "escura",
    mostrarTipo: true,
    mostrarHora: true,
    mostrarEndereco: true,
    enderecoCompleto: true,
    mostrarNumero: true,
    mostrarDescricao: false,
    mostrarCapa: true,
    rodapeInstagram: false,
    rodapeTelefones: true,
    rodapePix: false,
    rodapeQr: true,
    valorPix: 0,
  };
}

export function rgba(hex: string, a: number) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

function canais(hex: string) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Luminância relativa (0 = preto, 1 = branco). */
export function luminancia(hex: string) {
  const [r, g, b] = canais(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Mistura a cor com branco (t = 0..1). */
export function clarear(hex: string, t: number) {
  const [r, g, b] = canais(hex).map((v) => Math.round(v + (255 - v) * t));
  return `rgb(${r}, ${g}, ${b})`;
}

/** Mistura a cor com preto (t = 0..1). */
export function escurecer(hex: string, t: number) {
  const [r, g, b] = canais(hex).map((v) => Math.round(v * (1 - t)));
  return `rgb(${r}, ${g}, ${b})`;
}
