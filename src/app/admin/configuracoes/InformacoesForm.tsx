"use client";

import { useActionState } from "react";
import { HandCoins, Info } from "lucide-react";
import { salvarInformacoes } from "./actions";
import { Aviso, BotaoEnviar } from "@/components/ui";
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

      {CAMPOS.map(({ nome, rotulo, dica, Icone }) => (
        <div key={nome}>
          <label className="rotulo flex items-center gap-1.5" htmlFor={nome}>
            <Icone size={15} className="text-mata-600" /> {rotulo}
          </label>
          <textarea id={nome} name={nome} rows={7} maxLength={5000} defaultValue={instituto[nome] ?? ""} className="campo leading-relaxed" placeholder={dica} />
          <p className="ajuda">{dica} As quebras de linha são mantidas.</p>
        </div>
      ))}

      <div className="flex justify-end border-t border-stone-100 pt-5">
        <BotaoEnviar>Salvar informações</BotaoEnviar>
      </div>
    </form>
  );
}
