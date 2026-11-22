/**
 * Limite de tentativas em memória (login e cadastro).
 *
 * O Appwrite não limita estas chamadas: elas partem do servidor com chave de API, e esse tipo de
 * chamada fica fora do limite dele. Na Vercel cada instância tem a sua própria contagem, então o
 * limite é por instância (barra robôs e força bruta simples, não é garantia global).
 */
type Balde = { falhas: number; expira: number };

const baldes = new Map<string, Balde>();
const MAX_CHAVES = 5000;

function ativo(chave: string, agora: number): Balde | undefined {
  const b = baldes.get(chave);
  if (b && b.expira <= agora) {
    baldes.delete(chave);
    return undefined;
  }
  return b;
}

/** Já passou do máximo de falhas na janela? `esperaS` diz em quantos segundos libera. */
export function bloqueado(chave: string, max: number, agora = Date.now()): { bloqueado: boolean; esperaS: number } {
  const b = ativo(chave, agora);
  if (!b || b.falhas < max) return { bloqueado: false, esperaS: 0 };
  return { bloqueado: true, esperaS: Math.max(1, Math.ceil((b.expira - agora) / 1000)) };
}

/** Conta uma falha. A janela começa na primeira falha e não é renovada pelas seguintes. */
export function registrarFalha(chave: string, janelaMs: number, agora = Date.now()): void {
  const b = ativo(chave, agora);
  if (b) {
    b.falhas += 1;
    return;
  }
  if (baldes.size >= MAX_CHAVES) {
    for (const [k, v] of baldes) if (v.expira <= agora) baldes.delete(k);
    // Ainda cheio de janelas válidas: descarta a mais antiga para a memória não crescer sem fim.
    if (baldes.size >= MAX_CHAVES) baldes.delete(baldes.keys().next().value as string);
  }
  baldes.set(chave, { falhas: 1, expira: agora + janelaMs });
}

export function limpar(chave: string): void {
  baldes.delete(chave);
}

export function textoEspera(esperaS: number): string {
  const min = Math.ceil(esperaS / 60);
  return min <= 1 ? "1 minuto" : `${min} minutos`;
}

/** IP do visitante atrás da Vercel; `desconhecido` agrupa quem vier sem cabeçalho. */
export function ipDe(h: { get(nome: string): string | null }): string {
  const bruto = h.get("x-vercel-forwarded-for") ?? h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "";
  return bruto.split(",")[0]?.trim() || "desconhecido";
}
