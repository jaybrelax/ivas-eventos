"use client";

import { Download } from "lucide-react";
import { dataCurta } from "@/lib/format";
import type { ItemPagamento } from "@/lib/pagamentos";

const PAGAMENTO_ROTULO: Record<ItemPagamento["pagamento"], string> = {
  pendente: "Pendente", informado: "Informado", pago: "Pago", isento: "Isento", na_hora: "Na hora",
};

function csvCampo(v: string) {
  return `"${v.replace(/"/g, '""')}"`;
}

export function ExportarCsv({ itens, nomeArquivo }: { itens: ItemPagamento[]; nomeArquivo: string }) {
  const exportar = () => {
    const cabecalho = ["Pessoa", "Evento", "Data", "Valor (R$)", "Situação do pagamento", "Pago em"];
    const linhas = itens.map((i) => [
      i.nome,
      i.titulo,
      dataCurta(i.data),
      i.valor != null ? i.valor.toFixed(2).replace(".", ",") : "",
      PAGAMENTO_ROTULO[i.pagamento],
      i.pagoEm ? dataCurta(i.pagoEm.slice(0, 10)) : "",
    ]);
    const csv = [cabecalho, ...linhas].map((l) => l.map((c) => csvCampo(String(c))).join(";")).join("\r\n");
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nomeArquivo;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button type="button" onClick={exportar} disabled={!itens.length} className="btn-secundario h-9 px-3 text-sm">
      <Download size={15} /> Exportar CSV
    </button>
  );
}
