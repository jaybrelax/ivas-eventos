/** Fontes do Google Fonts que podem ser escolhidas para a página pública. */
export const FONTES_TITULO = [
  { nome: "Cinzel", tipo: "serif" },
  { nome: "Cinzel Decorative", tipo: "serif" },
  { nome: "Cormorant Garamond", tipo: "serif" },
  { nome: "Playfair Display", tipo: "serif" },
  { nome: "Marcellus", tipo: "serif" },
  { nome: "Philosopher", tipo: "sans-serif" },
  { nome: "Italiana", tipo: "serif" },
  { nome: "Forum", tipo: "serif" },
  { nome: "Tenor Sans", tipo: "sans-serif" },
  { nome: "EB Garamond", tipo: "serif" },
  { nome: "Lora", tipo: "serif" },
  { nome: "Libre Baskerville", tipo: "serif" },
  { nome: "Montserrat", tipo: "sans-serif" },
  { nome: "Poppins", tipo: "sans-serif" },
  { nome: "Raleway", tipo: "sans-serif" },
  { nome: "Josefin Sans", tipo: "sans-serif" },
] as const;

export const FONTES_TEXTO = [
  { nome: "Inter", tipo: "sans-serif" },
  { nome: "Montserrat", tipo: "sans-serif" },
  { nome: "Poppins", tipo: "sans-serif" },
  { nome: "Lato", tipo: "sans-serif" },
  { nome: "Nunito", tipo: "sans-serif" },
  { nome: "Raleway", tipo: "sans-serif" },
  { nome: "Josefin Sans", tipo: "sans-serif" },
  { nome: "Lora", tipo: "serif" },
  { nome: "EB Garamond", tipo: "serif" },
] as const;

/** Padrões atuais do site (usados quando nada foi escolhido). */
export const PADRAO_TITULO = "Cinzel";
export const PADRAO_TEXTO = "Inter";

const todas = [...FONTES_TITULO, ...FONTES_TEXTO];
const tipoDe = (nome: string) => todas.find((f) => f.nome === nome)?.tipo ?? "serif";
export const fonteValida = (nome: unknown, lista: readonly { nome: string }[]) =>
  typeof nome === "string" && lista.some((f) => f.nome === nome) ? nome : null;

/** URL do Google Fonts com as famílias pedidas (pesos usados no site). */
export function urlGoogleFonts(nomes: string[]) {
  const familias = [...new Set(nomes)].map((n) => `family=${n.replace(/ /g, "+")}:wght@400;500;600;700`).join("&");
  return `https://fonts.googleapis.com/css2?${familias}&display=swap`;
}

/** CSS que troca a fonte dos títulos (font-display) e dos textos só nas páginas públicas. */
export function cssTipografia(titulo: string | null, texto: string | null) {
  const regras: string[] = [];
  if (titulo) regras.push(`--font-display: "${titulo}", ${tipoDe(titulo)};`);
  if (texto) regras.push(`--font-sans: "${texto}", ${tipoDe(texto)};`);
  return regras.length ? `:root{${regras.join("")}}body{font-family:var(--font-sans)}` : "";
}
