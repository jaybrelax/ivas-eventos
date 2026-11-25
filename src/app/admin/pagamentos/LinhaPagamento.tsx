"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ExternalLink, FileImage, UserRound, Wallet, X } from "lucide-react";
import { Avatar } from "@/components/Avatar";

/** Tudo que o modal mostra, já formatado no servidor (datas e valores), para não haver diferença de fuso ou hidratação. */
export type DadosPagamento = {
  usuarioId: string;
  nome: string;
  foto: string | null;
  eventoId: string;
  evento: string;
  dataEvento: string;
  tipoNome: string;
  situacaoInscricao: string;
  pagamentoRotulo: string;
  pagamentoCor: string;
  valor: string | null;
  informadoEm: string | null;
  pagoEm: string | null;
  comprovante: string | null;
};

/**
 * Linha (ou cartão) de um pagamento: clicar em qualquer ponto abre o modal com as informações dele.
 * Links e botões dentro da linha (perfil da pessoa, evento, comprovante) funcionam sozinhos, sem abrir o modal.
 */
export function LinhaPagamento({ as: Tag, className, children, dados }: { as: "tr" | "li"; className?: string; children: ReactNode; dados: DadosPagamento }) {
  const [aberto, setAberto] = useState(false);
  const fechar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    window.addEventListener("keydown", esc);
    fechar.current?.focus();
    return () => window.removeEventListener("keydown", esc);
  }, [aberto]);

  const linhas: [string, ReactNode][] = [
    ["Evento", <Link key="ev" href={`/admin/eventos/${dados.eventoId}`} className="font-medium text-mata-700 hover:underline">{dados.evento}</Link>],
    ["Data do ritual", dados.dataEvento],
    ["Tipo", dados.tipoNome || "—"],
    ["Inscrição", dados.situacaoInscricao],
    ["Valor", dados.valor ?? "—"],
    ...(dados.informadoEm ? [["Informado em", dados.informadoEm] as [string, ReactNode]] : []),
    ...(dados.pagoEm ? [["Pago em", dados.pagoEm] as [string, ReactNode]] : []),
  ];

  const modal = aberto && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`Pagamento de ${dados.nome}`}>
      <div className="fixed inset-0 bg-stone-950/60" onClick={() => setAberto(false)} />
      <div className="relative z-10 flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-2xl bg-white p-5 text-left shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-base font-semibold text-stone-900"><Wallet size={18} className="text-mata-600" aria-hidden /> Pagamento</h3>
          <button ref={fechar} type="button" onClick={() => setAberto(false)} className="grid h-10 w-10 place-items-center rounded-full text-stone-500 hover:bg-stone-100" aria-label="Fechar"><X size={18} /></button>
        </div>

        <div className="flex items-center gap-3">
          <Avatar nome={dados.nome} foto={dados.foto} tamanho={48} className="ring-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-stone-900">{dados.nome}</p>
            <Link href={`/admin/participantes/${dados.usuarioId}`} className="inline-flex items-center gap-1 text-xs font-medium text-mata-700 hover:underline">
              <UserRound size={12} aria-hidden /> Ver perfil
            </Link>
          </div>
          <span className={`chip shrink-0 ${dados.pagamentoCor}`}>{dados.pagamentoRotulo}</span>
        </div>

        <dl className="grid grid-cols-[7rem_minmax(0,1fr)] gap-x-3 gap-y-2 rounded-xl bg-stone-50 p-3 text-sm">
          {linhas.map(([rotulo, valor]) => (
            <div key={rotulo} className="contents">
              <dt className="text-stone-500">{rotulo}</dt>
              <dd className="min-w-0 break-words text-stone-800">{valor}</dd>
            </div>
          ))}
        </dl>

        {dados.comprovante ? (
          <div className="space-y-1.5">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-stone-500"><FileImage size={13} aria-hidden /> Comprovante</p>
            <a href={`/api/comprovante/${dados.comprovante}`} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-xl border border-stone-200 bg-stone-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/comprovante/${dados.comprovante}`} alt={`Comprovante de ${dados.nome}`} className="max-h-64 w-full object-contain" loading="lazy" />
            </a>
            <a href={`/api/comprovante/${dados.comprovante}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-mata-700 hover:underline">
              <ExternalLink size={12} aria-hidden /> Abrir em tamanho real
            </a>
          </div>
        ) : (
          <p className="text-xs text-stone-400">Sem comprovante anexado.</p>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link href={`/admin/participantes/${dados.usuarioId}`} className="btn-secundario h-10"><UserRound size={15} aria-hidden /> Perfil</Link>
          <Link href={`/admin/eventos/${dados.eventoId}`} className="btn-primario h-10"><CalendarDays size={15} aria-hidden /> Abrir evento</Link>
        </div>
      </div>
    </div>
  );

  const abrirSeNaoForLink = (alvo: EventTarget | null) => {
    // Clique em link ou botão dentro da linha (perfil, evento, comprovante) segue o próprio caminho
    if (alvo instanceof Element && alvo.closest("a, button")) return;
    setAberto(true);
  };

  return (
    <>
      <Tag
        className={`cursor-pointer ${className ?? ""}`}
        tabIndex={0}
        aria-haspopup="dialog"
        title="Ver detalhes do pagamento"
        onClick={(e) => abrirSeNaoForLink(e.target)}
        onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setAberto(true); } }}
      >
        {children}
      </Tag>
      {modal && createPortal(modal, document.body)}
    </>
  );
}
