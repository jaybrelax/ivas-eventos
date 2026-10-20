"use client";

import { useActionState } from "react";
import { HandCoins, Info } from "lucide-react";
import { salvarInformacoes } from "./actions";
import { Aviso, BotaoEnviar } from "@/components/ui";
import { CampoFormatado } from "./CampoFormatado";
import type { Instituto } from "@/lib/types";

const CAMPOS = [
  {
    nome: "info_rituais",
    rotulo: "Informações dos rituais",
    dica: "Orientações gerais que valem para todo ritual: preparação, dieta, o que levar, horário de chegada…",
    Icone: Info,
  },
  {
    nome: "info_contribuicao",
    rotulo: "Contribuição",
    dica: "Valores, formas de pagamento, chave Pix, prazos e política de cancelamento.",
    Icone: HandCoins,
  },
] as const;

export function InformacoesForm({ instituto }: { instituto: Instituto }) {
  const [estado, acao] = useActionState(salvarInformacoes, undefined);
  return (
    <form action={acao} className="cartao space-y-6">
      <div>
        <h2 className="cartao-titulo">Informações</h2>
        <p className="cartao-sub">Textos que aparecem na página de todo evento que conta como ritual. Deixe em branco para não mostrar.</p>
      </div>
      {estado?.erro && <Aviso>{estado.erro}</Aviso>}
      {estado?.ok && <Aviso tipo="ok">{estado.ok}</Aviso>}

      <div>
        <label className="rotulo flex items-center gap-1.5" htmlFor="valor_contribuicao">
          <HandCoins size={15} className="text-mata-600" /> Valor da contribuição (R$)
        </label>
        <input
          id="valor_contribuicao"
          name="valor_contribuicao"
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
          defaultValue={instituto.valor_contribuicao ?? ""}
          placeholder="75,00"
          className="campo h-11 max-w-48"
        />
        <p className="ajuda">Mesmo valor para todos os rituais. Usado no QR Pix da participação e nos relatórios de pagamento. Deixe em branco para não cobrar um valor fixo.</p>
      </div>

      {CAMPOS.map(({ nome, rotulo, dica, Icone }) => (
        <div key={nome}>
          <label className="rotulo flex items-center gap-1.5" htmlFor={nome}>
            <Icone size={15} className="text-mata-600" /> {rotulo}
          </label>
          <CampoFormatado id={nome} nome={nome} inicial={instituto[nome] ?? ""} placeholder={dica} />
          <p className="ajuda">{dica} Selecione um trecho e use os botões (ou Ctrl+B, I, U) para negrito, itálico e sublinhado.</p>
        </div>
      ))}

      <div className="flex justify-end border-t border-stone-100 pt-5">
        <BotaoEnviar>Salvar informações</BotaoEnviar>
      </div>
    </form>
  );
}
