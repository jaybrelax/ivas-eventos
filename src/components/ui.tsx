"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";
import { CircleAlert, CircleCheck, Info, Loader2 } from "lucide-react";

export function BotaoEnviar({
  children,
  className = "btn-primario",
  pendente = "Salvando…",
  ...rest
}: { children: ReactNode; className?: string; pendente?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending || rest.disabled} {...rest}>
      {pending ? <><Carregando />{pendente}</> : children}
    </button>
  );
}

export function Carregando({ tamanho = 16 }: { tamanho?: number }) {
  return <Loader2 size={tamanho} className="animate-spin" aria-hidden />;
}

export function Aviso({ tipo = "erro", children }: { tipo?: "erro" | "ok" | "info"; children: ReactNode }) {
  const { cores, Icone } = {
    erro: { cores: "border-red-200 bg-red-50 text-red-800", Icone: CircleAlert },
    ok: { cores: "border-emerald-200 bg-emerald-50 text-emerald-800", Icone: CircleCheck },
    info: { cores: "border-amber-200 bg-amber-50 text-amber-900", Icone: Info },
  }[tipo];
  return (
    <div role={tipo === "erro" ? "alert" : "status"} className={`flex animate-surgir items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm ${cores}`}>
      <Icone size={17} className="mt-px shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
