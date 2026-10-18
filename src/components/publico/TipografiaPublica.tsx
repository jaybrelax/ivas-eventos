import type { Instituto } from "@/lib/types";
import { FONTES_TEXTO, FONTES_TITULO, cssTipografia, fonteValida, urlGoogleFonts } from "@/lib/tipografia";

/**
 * Carrega as fontes escolhidas em Configurações › Página pública e aplica nas páginas públicas.
 * Vale também para a janela “Participar”, que é aberta fora da árvore da página.
 */
export function TipografiaPublica({ instituto }: { instituto: Instituto }) {
  const titulo = fonteValida(instituto.fonte_publica_titulo, FONTES_TITULO);
  const texto = fonteValida(instituto.fonte_publica_texto, FONTES_TEXTO);
  const nomes = [titulo, texto].filter(Boolean) as string[];
  if (!nomes.length) return null;
  return (
    <>
      <link rel="stylesheet" href={urlGoogleFonts(nomes)} precedence="default" />
      <style>{cssTipografia(titulo, texto)}</style>
    </>
  );
}
