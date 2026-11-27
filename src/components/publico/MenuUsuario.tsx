"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Calendar, CalendarCheck, ChevronDown, Download, LayoutDashboard, LogOut, Settings, Share, Shield, Ticket } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { useInstalar } from "@/components/useInstalar";
import { SeletorTema } from "@/components/SeletorTema";

/** Avatar + nome no cabeçalho público; clicar abre o menu com os atalhos da conta. */
export function MenuUsuario({
  nome, foto, sair, guarnicaoUrl = null, admin = false,
}: {
  nome: string;
  foto: string | null;
  sair: () => Promise<void>;
  /** Endereço do app da Guarnição; null esconde a opção. */
  guarnicaoUrl?: string | null;
  admin?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [dicaIos, setDicaIos] = useState(false);
  const inst = useInstalar();
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => caixa.current && !caixa.current.contains(e.target as Node) && setAberto(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  const primeiroNome = nome.split(" ")[0];

  return (
    <div ref={caixa} className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-haspopup="menu"
        className="menu-usuario-trigger flex items-center gap-2 rounded-xl border border-stone-200/80 bg-stone-50/80 py-1.5 pr-1.5 pl-3 shadow-2xs transition hover:border-mata-300 hover:bg-stone-100"
      >
        <span className="text-right leading-tight">
          <span className="block max-w-28 truncate text-xs font-semibold text-stone-800">{primeiroNome}</span>
          <span className="block text-[11px] text-stone-500">Minha conta</span>
        </span>
        <Avatar nome={nome} foto={foto} tamanho={30} />
        <ChevronDown size={14} className={`shrink-0 text-stone-400 transition-transform ${aberto ? "rotate-180" : ""}`} />
      </button>

      {aberto && (
        <div role="menu" className="absolute top-full right-0 z-30 mt-2 w-56 animate-surgir rounded-2xl border border-stone-200 bg-white p-1.5 shadow-elevado">
          <Link
            href="/minha-conta/dados"
            role="menuitem"
            onClick={() => setAberto(false)}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
          >
            <Settings size={16} className="text-stone-400" /> Editar dados
          </Link>
          <Link
            href="/minha-conta?aba=proximos"
            role="menuitem"
            onClick={() => setAberto(false)}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
          >
            <CalendarCheck size={16} className="text-stone-400" /> Minhas inscrições
          </Link>
          <Link
            href="/minha-conta?aba=creditos"
            role="menuitem"
            onClick={() => setAberto(false)}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
          >
            <Ticket size={16} className="text-stone-400" /> Pacotes de créditos
          </Link>
          <Link
            href="/eventos"
            role="menuitem"
            onClick={() => setAberto(false)}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
          >
            <Calendar size={16} className="text-stone-400" /> Agenda de Rituais
          </Link>
          {(guarnicaoUrl || admin) && <div className="my-1 h-px bg-stone-100" />}
          {guarnicaoUrl && (
            // Outro domínio: link comum, sem o roteamento do Next
            <a
              href={guarnicaoUrl}
              role="menuitem"
              onClick={() => setAberto(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
            >
              <Shield size={16} className="text-stone-400" /> App Guarnição
            </a>
          )}
          {admin && (
            <Link
              href="/admin"
              role="menuitem"
              onClick={() => setAberto(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
            >
              <LayoutDashboard size={16} className="text-stone-400" /> Administração
            </Link>
          )}
          {inst.disponivel && (
            <>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  if (inst.nativo) {
                    setAberto(false);
                    void inst.instalar();
                  } else setDicaIos((v) => !v);
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
              >
                <Download size={16} className="text-stone-400" /> Instalar app
              </button>
              {dicaIos && !inst.nativo && (
                <p className="mx-3 mb-1 rounded-lg bg-stone-50 px-3 py-2 text-xs leading-relaxed text-stone-600">
                  Toque em <Share size={12} className="mx-0.5 inline -translate-y-px" aria-label="Compartilhar" /> no Safari e depois em <strong>Adicionar à Tela de Início</strong>.
                </p>
              )}
            </>
          )}
          <div className="my-1 h-px bg-stone-100" />
          <SeletorTema lateral />
          <div className="my-1 h-px bg-stone-100" />
          <form action={sair}>
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-50"
            >
              <LogOut size={16} /> Sair
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
