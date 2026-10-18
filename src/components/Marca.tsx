import type { Instituto } from "@/lib/types";

type DadosMarca = Pick<Instituto, "logo_file_id" | "logo_escura_file_id" | "nome_curto" | "nome">;

function Monograma({ instituto, tamanho }: { instituto: DadosMarca; tamanho: number }) {
  const sigla = (instituto.nome_curto || instituto.nome || "I").slice(0, 2).toUpperCase();
  return (
    <span
      style={{ width: tamanho, height: tamanho, fontSize: tamanho * 0.36 }}
      className="grid shrink-0 place-items-center rounded-xl bg-gradient-to-br from-ouro-300 to-ouro-600 font-display font-bold text-mata-950 shadow-[inset_0_1px_0_rgb(255_255_255/0.4)]"
    >
      {sigla}
    </span>
  );
}

/**
 * Logo do Instituto.
 * - `fundoClaro`: usa a versão colorida (logo_file_id) ideal para fundos brancos/claros.
 * - padrão: usa a versão clara para fundo escuro (logo_escura_file_id).
 */
export function MarcaInstituto({
  instituto,
  altura = 48,
  legenda,
  fundoClaro = false,
}: {
  instituto: DadosMarca;
  altura?: number;
  legenda?: string;
  fundoClaro?: boolean;
}) {
  const escura = instituto.logo_escura_file_id;
  const clara = instituto.logo_file_id;
  const nome = instituto.nome_curto || instituto.nome;

  const logoEscolhida = fundoClaro ? (clara || escura) : (escura || clara);

  if (logoEscolhida)
    return (
      <div className="min-w-0">
        {fundoClaro ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/arquivo/${logoEscolhida}`}
            alt={instituto.nome}
            style={{ height: altura }}
            className="w-auto max-w-full object-contain object-left"
          />
        ) : escura ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/arquivo/${escura}`}
            alt={instituto.nome}
            style={{ height: altura }}
            className="w-auto max-w-full object-contain object-left"
          />
        ) : (
          <span className="inline-flex rounded-xl bg-white px-2.5 py-1.5 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/arquivo/${clara}`}
              alt={instituto.nome}
              style={{ height: altura - 12 }}
              className="w-auto max-w-full object-contain"
            />
          </span>
        )}
        {legenda && (
          <p className={`mt-2 text-xs leading-snug tracking-wide ${fundoClaro ? "text-stone-500" : "text-mata-300"}`}>
            {legenda}
          </p>
        )}
      </div>
    );

  return (
    <div className="flex min-w-0 items-center gap-3">
      <Monograma instituto={instituto} tamanho={altura - 4} />
      <div className="min-w-0">
        <p className={`truncate font-display text-lg leading-tight font-semibold tracking-wide ${fundoClaro ? "text-mata-900" : "text-ouro-300"}`}>
          {nome}
        </p>
        {legenda && (
          <p className={`text-xs leading-snug ${fundoClaro ? "text-stone-500" : "text-mata-300"}`}>
            {legenda}
          </p>
        )}
      </div>
    </div>
  );
}
