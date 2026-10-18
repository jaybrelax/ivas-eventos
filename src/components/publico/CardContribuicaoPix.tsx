import { HandCoins } from "lucide-react";
import { TextoFormatado } from "@/components/TextoFormatado";

/** Texto de contribuição das Configurações › Informações. A chave Pix fica na janela “Participar”. */
export function CardContribuicaoPix({ infoContribuicao }: { infoContribuicao?: string | null }) {
  const texto = infoContribuicao?.trim();
  if (!texto) return null;

  return (
    <section className="cartao relative overflow-hidden p-6 sm:p-9">
      <div aria-hidden className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-ouro-300 via-ouro-500 to-ouro-700" />
      <div className="mb-5 flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-ouro-300 to-ouro-600 text-white shadow-sm">
          <HandCoins size={19} />
        </span>
        <div>
          <p className="text-[11px] font-semibold tracking-[0.16em] text-ouro-600 uppercase">Sustentação do trabalho</p>
          <h2 className="titulo-card text-xl sm:text-[22px]">Contribuição</h2>
        </div>
      </div>
      <TextoFormatado texto={texto} className="max-w-[68ch] text-[15px] leading-[1.85] text-stone-700 sm:text-base" />
    </section>
  );
}
