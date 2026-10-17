import type { TipoPix } from "./types";

/** Gera o payload "Pix copia e cola" (BR Code / EMV) de uma chave estática. */

function campo(id: string, valor: string) {
  return id + String(valor.length).padStart(2, "0") + valor;
}

function limpar(s: string, max: number) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 .,-]/g, "")
    .toUpperCase()
    .slice(0, max)
    .trim();
}

function crc16(payload: string) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function normalizarChave(tipo: TipoPix, chave: string) {
  const c = chave.trim();
  if (tipo === "cpf" || tipo === "cnpj") return c.replace(/\D/g, "");
  if (tipo === "email") return c.toLowerCase();
  if (tipo === "telefone") {
    const d = c.replace(/\D/g, "");
    return d.startsWith("55") && d.length > 11 ? `+${d}` : `+55${d}`;
  }
  return c;
}

export function gerarPayloadPix(opts: {
  tipo: TipoPix;
  chave: string;
  favorecido: string;
  cidade: string;
  valor?: number | null;
  descricao?: string;
}) {
  const conta =
    campo("00", "br.gov.bcb.pix") +
    campo("01", normalizarChave(opts.tipo, opts.chave)) +
    (opts.descricao ? campo("02", limpar(opts.descricao, 40)) : "");
  let p =
    campo("00", "01") +
    campo("26", conta) +
    campo("52", "0000") +
    campo("53", "986") +
    (opts.valor && opts.valor > 0 ? campo("54", opts.valor.toFixed(2)) : "") +
    campo("58", "BR") +
    campo("59", limpar(opts.favorecido, 25) || "IVAS") +
    campo("60", limpar(opts.cidade, 15) || "BRASIL") +
    campo("62", campo("05", "***"));
  p += "6304";
  return p + crc16(p);
}

export const ROTULO_PIX: Record<TipoPix, string> = {
  cpf: "CPF",
  cnpj: "CNPJ",
  email: "E-mail",
  telefone: "Telefone",
  aleatoria: "Chave aleatória",
};
