import { Clock, HandCoins, Receipt, Shield, Users, Wallet } from "lucide-react";
import type { DadosParticipantes } from "../Participantes";
import type { DadosGuarnicao } from "../Guarnicao";

const formatoReal = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Resumo das contribuições dos confirmados (quem está na espera ainda não deve nada). */
export function resumoContribuicoes(p: DadosParticipantes) {
  const r = { recebido: 0, pagos: 0, conferir: 0, aberto: 0, isentos: 0, pacotes: 0 };
  for (const i of p.confirmados) {
    if (i.pagamento === "pago") { r.pagos++; r.recebido += i.valor ?? 0; if (i.usouPacote) r.pacotes++; }
    else if (i.pagamento === "informado") r.conferir++;
    else if (i.pagamento === "isento") r.isentos++;
    // Paga com crédito de pacote: não está em aberto e conta como pacote usado
    else if (i.pagamento === "credito") r.pacotes++;
    else r.aberto++;
  }
  return r;
}

/**
 * Cards de números do evento: ocupação, contribuições e (sem `quatro`) guarnição.
 * `quatro`: só Participantes, Recebido, Para conferir e Em aberto, em grade 2×2 ao lado da capa.
 */
export function EstatisticasEvento({ participantes, guarnicao, quatro = false }: { participantes: DadosParticipantes | null; guarnicao: DadosGuarnicao | null; quatro?: boolean }) {
  const cartoes: { rotulo: string; valor: string; detalhe: string; Icone: typeof Users; cor: string; barra?: number }[] = [];

  if (participantes) {
    const ocupadas = participantes.confirmados.length;
    const pct = participantes.vagas ? Math.min(100, Math.round((ocupadas / participantes.vagas) * 100)) : 0;
    const livres = Math.max(0, participantes.vagas - ocupadas);
    cartoes.push({
      rotulo: "Participantes", valor: `${ocupadas}/${participantes.vagas}`, Icone: Users, cor: "bg-mata-50 text-mata-600", barra: pct,
      detalhe: `${livres ? `${livres} ${livres === 1 ? "vaga livre" : "vagas livres"}` : "Lotado"}${participantes.espera.length ? ` · ${participantes.espera.length} na espera` : ""}`,
    });
    if (participantes.temContribuicao) {
      const r = resumoContribuicoes(participantes);
      cartoes.push(
        { rotulo: "Recebido", valor: formatoReal(r.recebido), detalhe: `${r.pagos} ${r.pagos === 1 ? "contribuição confirmada" : "contribuições confirmadas"}`, Icone: Wallet, cor: "bg-emerald-50 text-emerald-600" },
        { rotulo: "Para conferir", valor: String(r.conferir), detalhe: r.conferir ? "comprovantes aguardando" : "nada pendente", Icone: Receipt, cor: r.conferir ? "bg-amber-50 text-amber-600" : "bg-stone-100 text-stone-500" },
        { rotulo: "Em aberto", valor: String(r.aberto), detalhe: r.isentos ? `${r.isentos} ${r.isentos === 1 ? "isento" : "isentos"}` : "pendentes ou na hora", Icone: HandCoins, cor: "bg-stone-100 text-stone-600" },
      );
    }
  }

  if (guarnicao && !quatro) {
    const conf = guarnicao.confirmados.masculino.length + guarnicao.confirmados.feminino.length;
    const vagas = guarnicao.vagas.masculino + guarnicao.vagas.feminino;
    const espera = guarnicao.espera.masculino.length + guarnicao.espera.feminino.length;
    cartoes.push({
      rotulo: "Guarnição", valor: `${conf}/${vagas}`, Icone: Shield, cor: "bg-sky-50 text-sky-600",
      barra: vagas ? Math.min(100, Math.round((conf / vagas) * 100)) : 0,
      detalhe: `${guarnicao.confirmados.masculino.length}/${guarnicao.vagas.masculino} guardiões · ${guarnicao.confirmados.feminino.length}/${guarnicao.vagas.feminino} guardiãs${espera ? ` · ${espera} na espera` : ""}`,
    });
  }

  if (!cartoes.length) return null;

  return (
    <div className={quatro ? "grid h-full grid-cols-2 gap-3" : `mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3 ${cartoes.length >= 4 ? "xl:grid-cols-5" : ""}`}>
      {cartoes.map(({ rotulo, valor, detalhe, Icone, cor, barra }) => (
        <div key={rotulo} className={`cartao flex flex-col gap-3 p-4 sm:p-5 ${quatro ? "justify-between" : ""}`}>
          <div className="flex items-center gap-3">
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${cor}`}><Icone size={19} /></span>
            <div className="min-w-0">
              <p className="truncate text-[13px] text-stone-500">{rotulo}</p>
              <p className="truncate text-xl font-semibold tracking-tight text-stone-900 tabular-nums">{valor}</p>
            </div>
          </div>
          {barra !== undefined && (
            <div className="h-1.5 overflow-hidden rounded-full bg-stone-100" aria-hidden>
              <div className="h-full rounded-full bg-mata-500" style={{ width: `${barra}%` }} />
            </div>
          )}
          <p className="flex items-center gap-1 truncate text-xs text-stone-500" title={detalhe}>{rotulo === "Para conferir" && valor !== "0" && <Clock size={12} />}{detalhe}</p>
        </div>
      ))}
    </div>
  );
}
