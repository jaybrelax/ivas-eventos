import type { ReactNode } from "react";

/**
 * Formatação simples dos textos das Configurações › Informações:
 * **negrito**, *itálico* e __sublinhado__ (podem ser combinados).
 * Monta elementos React (nada de HTML cru), então o texto digitado não injeta código.
 */
const MARCAS = [
  { abre: "**", Tag: "strong" as const, classe: "font-semibold text-stone-900" },
  { abre: "__", Tag: "u" as const, classe: "underline decoration-1 underline-offset-2" },
  { abre: "*", Tag: "em" as const, classe: "italic" },
];

function formatar(texto: string, chave = "f"): ReactNode[] {
  const saida: ReactNode[] = [];
  let resto = texto;
  let n = 0;
  while (resto) {
    // a marca que abre mais cedo no texto (e que tem fechamento) vence
    let melhor: { i: number; fim: number; m: (typeof MARCAS)[number] } | null = null;
    for (const m of MARCAS) {
      const t = m.abre.length;
      // abre colado no texto ("*palavra") e não é parte de uma marca maior ("**")
      let i = resto.indexOf(m.abre);
      while (i >= 0 && (/\s/.test(resto[i + t] ?? " ") || (t === 1 && (resto[i + 1] === "*" || resto[i - 1] === "*")))) {
        i = resto.indexOf(m.abre, i + t);
      }
      if (i < 0) continue;
      // fecha colado no texto ("palavra*")
      let fim = resto.indexOf(m.abre, i + t + 1);
      while (fim >= 0) {
        if (t === 1) {
          // itálico: numa sequência de asteriscos, "**" é do negrito (pula); "***" fecha no último
          let ate = fim;
          while (resto[ate + 1] === "*") ate++;
          const seq = ate - fim + 1;
          if (seq === 2) { fim = resto.indexOf("*", ate + 1); continue; }
          fim = ate;
        }
        if (!/\s/.test(resto[fim - 1])) break;
        fim = resto.indexOf(m.abre, fim + t);
      }
      if (fim < 0) continue;
      // "***" no fim = itálico fechando dentro do negrito: o negrito fecha nos dois últimos
      if (m.abre === "**") while (resto[fim + 2] === "*") fim++;
      if (!melhor || i < melhor.i) melhor = { i, fim, m };
    }
    if (!melhor) {
      saida.push(resto);
      break;
    }
    const { i, fim, m } = melhor;
    if (i > 0) saida.push(resto.slice(0, i));
    const k = `${chave}-${n++}`;
    saida.push(
      <m.Tag key={k} className={m.classe}>
        {formatar(resto.slice(i + m.abre.length, fim), k)}
      </m.Tag>,
    );
    resto = resto.slice(fim + m.abre.length);
  }
  return saida;
}

/** Texto com quebras de linha preservadas e marcas de formatação aplicadas. */
export function TextoFormatado({ texto, className = "" }: { texto: string; className?: string }) {
  return <div className={`whitespace-pre-line ${className}`}>{formatar(texto)}</div>;
}
