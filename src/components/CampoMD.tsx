import type { LucideIcon } from "lucide-react";

/**
 * Campo no estilo Material (preenchido): o rótulo, com ícone, fica dentro do campo, acima do valor,
 * e a moldura acende no foco. Use com `campo-md` (ou `campo-md-area`) no input, select ou textarea.
 */
export function CampoMD({
  id, rotulo, icone: Icone, obrigatorio = false, children,
}: { id: string; rotulo: string; icone: LucideIcon; obrigatorio?: boolean; children: React.ReactNode }) {
  return (
    <div className="group rounded-xl bg-white px-3.5 pt-2 pb-1.5 shadow-[0_1px_2px_rgb(0_0_0/0.04)] ring-1 ring-stone-300 transition hover:ring-stone-400 focus-within:ring-2 focus-within:ring-mata-600">
      <label htmlFor={id} className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-stone-500 transition group-focus-within:text-mata-700">
        <Icone size={14} aria-hidden className="shrink-0" />
        <span>{rotulo}{obrigatorio && <span className="text-red-600"> *</span>}</span>
      </label>
      {children}
    </div>
  );
}
