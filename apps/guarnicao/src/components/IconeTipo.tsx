"use client";

import { CalendarDays } from "lucide-react";
import { DynamicIcon, iconNames, type IconName } from "lucide-react/dynamic";

/** Nomes válidos de ícones da biblioteca Lucide (cabem no campo `icone`, até 30 caracteres). */
export const NOMES_ICONES: string[] = iconNames.filter((n) => n.length <= 30);
const VALIDOS = new Set<string>(NOMES_ICONES);

/**
 * Ícone de um tipo de evento pelo nome Lucide (ex.: "flame"). Carrega só o ícone usado.
 * Sem ícone (ou nome inválido), mostra um calendário.
 */
export function IconeTipo({ nome, size = 16, className, strokeWidth }: { nome?: string | null; size?: number; className?: string; strokeWidth?: number }) {
  if (!nome || !VALIDOS.has(nome)) return <CalendarDays size={size} className={className} strokeWidth={strokeWidth} aria-hidden />;
  return (
    <DynamicIcon
      name={nome as IconName}
      size={size}
      className={className}
      strokeWidth={strokeWidth}
      aria-hidden
      fallback={() => <span style={{ display: "inline-block", width: size, height: size }} />}
    />
  );
}
