"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, EllipsisVertical, ShieldOff, Trash2 } from "lucide-react";
import { toast } from "@/components/Toaster";
import { Carregando } from "@/components/ui";
import { Folha } from "../../Folha";
import { removerSuspensaoGuardiao, retirarCargoGuardiao, suspenderGuardiao } from "./actions";

function dataFim(ate: string) {
  return new Date(ate).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "long", year: "numeric" });
}

export function AcoesGuardiao({ id, nome, suspensoAte }: { id: string; nome: string; suspensoAte: string | null }) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuAberto, setMenuAberto] = useState(false);
  const [folha, setFolha] = useState<"suspender" | "excluir" | null>(null);
  const [meses, setMeses] = useState<3 | 6>(3);
  const [pendente, iniciar] = useTransition();

  useEffect(() => {
    if (!menuAberto) return;
    const fecharFora = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuAberto(false);
    };
    document.addEventListener("mousedown", fecharFora);
    document.addEventListener("touchstart", fecharFora);
    return () => {
      document.removeEventListener("mousedown", fecharFora);
      document.removeEventListener("touchstart", fecharFora);
    };
  }, [menuAberto]);

  const abrir = (alvo: "suspender" | "excluir") => {
    setMenuAberto(false);
    setFolha(alvo);
  };

  const executar = (acao: () => Promise<{ ok?: string; erro?: string }>, voltar = false) => iniciar(async () => {
    const r = await acao();
    if (r.erro) toast(r.erro);
    else {
      if (r.ok) toast(r.ok, "ok");
      setFolha(null);
      if (voltar) router.push("/guarnicao/guardioes");
      else router.refresh();
    }
  });

  return (
    <>
      <div ref={menuRef} className="relative">
        <button
          type="button"
          aria-label="Gerenciar guardião"
          aria-expanded={menuAberto}
          onClick={() => setMenuAberto((v) => !v)}
          className="grid h-10 w-10 place-items-center rounded-full bg-white text-stone-600 shadow-cartao ring-1 ring-stone-200 transition active:scale-90 active:bg-stone-50"
        >
          <EllipsisVertical size={21} />
        </button>
        {menuAberto && (
          <div role="menu" className="absolute top-full right-0 z-30 mt-2 w-56 animate-surgir overflow-hidden rounded-2xl bg-white p-1.5 shadow-elevado ring-1 ring-stone-200">
            <button type="button" role="menuitem" onClick={() => abrir("suspender")} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-3 text-left text-sm font-medium text-amber-800 active:bg-amber-50">
              <CalendarClock size={18} /> Suspender guardião
            </button>
            <button type="button" role="menuitem" onClick={() => abrir("excluir")} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-3 text-left text-sm font-medium text-red-700 active:bg-red-50">
              <Trash2 size={18} /> Excluir guardião
            </button>
          </div>
        )}
      </div>

      <Folha aberta={folha === "suspender"} aoFechar={() => !pendente && setFolha(null)} titulo="Suspender guardião">
        {suspensoAte ? (
          <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
            <p className="font-semibold">Suspenso até {dataFim(suspensoAte)}</p>
            <p className="mt-1 leading-relaxed">O guardião continua usando o aplicativo e vendo suas estatísticas. Ele poderá voltar a se candidatar automaticamente ao fim do prazo.</p>
            <button type="button" disabled={pendente} onClick={() => executar(() => removerSuspensaoGuardiao(id))} className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 font-semibold text-white disabled:opacity-50">
              {pendente ? <Carregando /> : <ShieldOff size={17} />} Remover suspensão
            </button>
            <label htmlFor="periodo-suspensao" className="mt-5 block font-semibold">Novo prazo a partir de hoje</label>
            <select id="periodo-suspensao" value={meses} onChange={(e) => setMeses(Number(e.target.value) as 3 | 6)} className="campo mt-1 h-11">
              <option value={3}>3 meses</option>
              <option value={6}>6 meses</option>
            </select>
            <button type="button" disabled={pendente} onClick={() => executar(() => suspenderGuardiao(id, meses))} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-amber-400 px-4 font-semibold text-amber-900 disabled:opacity-50">
              {pendente ? <Carregando /> : <CalendarClock size={17} />} Atualizar prazo
            </button>
          </div>
        ) : (
          <div>
            <p className="text-sm leading-relaxed text-stone-600">Impede novas candidaturas durante o prazo. O acesso ao aplicativo, as participações existentes e as estatísticas continuam normalmente.</p>
            <label htmlFor="periodo-suspensao" className="mt-4 block text-sm font-semibold text-stone-700">Período da suspensão</label>
            <select id="periodo-suspensao" value={meses} onChange={(e) => setMeses(Number(e.target.value) as 3 | 6)} className="campo mt-1 h-11">
              <option value={3}>3 meses</option>
              <option value={6}>6 meses</option>
            </select>
            <button type="button" disabled={pendente} onClick={() => executar(() => suspenderGuardiao(id, meses))} className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 text-sm font-semibold text-white disabled:opacity-50">
              {pendente ? <Carregando /> : <CalendarClock size={17} />} Suspender guardião
            </button>
          </div>
        )}
      </Folha>

      <Folha aberta={folha === "excluir"} aoFechar={() => !pendente && setFolha(null)} titulo="Excluir guardião">
        <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-900 ring-1 ring-red-200">
          <p className="font-semibold">Retirar a função de guardião de {nome}?</p>
          <p className="mt-1 leading-relaxed">A conta do usuário e todo o histórico de rituais serão mantidos. O usuário perderá somente o cargo de guardião e as participações futuras serão retiradas.</p>
        </div>
        <button type="button" disabled={pendente} onClick={() => executar(() => retirarCargoGuardiao(id), true)} className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white disabled:opacity-50">
          {pendente ? <Carregando /> : <Trash2 size={17} />} Excluir guardião
        </button>
        <button type="button" disabled={pendente} onClick={() => setFolha(null)} className="mt-2 h-11 w-full rounded-xl text-sm font-semibold text-stone-600 active:bg-stone-100 disabled:opacity-50">
          Cancelar
        </button>
      </Folha>
    </>
  );
}
