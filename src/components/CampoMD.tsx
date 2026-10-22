import type { LucideIcon } from "lucide-react";

/**
 * Campo no estilo Material, versão refinada: o ícone fica num bloco arredondado à esquerda (acende no foco),
 * com o rótulo pequeno e o valor ao lado. Use `campo-md` (ou `campo-md-area`) no input, select ou textarea.
 * `topo`: alinha o ícone ao topo, para campos de texto de várias linhas.
 */
export function CampoMD({
  id, rotulo, icone: Icone, obrigatorio = false, topo = false, children,
}: { id: string; rotulo: string; icone: LucideIcon; obrigatorio?: boolean; topo?: boolean; children: React.ReactNode }) {
  return (
    <div
      className={`group flex gap-3 rounded-2xl bg-white/35 p-2 pr-3.5 shadow-[0_1px_2px_rgb(0_0_0/0.04)] ring-1 ring-stone-900/10 backdrop-blur-sm transition duration-200 hover:bg-white/50 hover:ring-stone-900/20 focus-within:bg-white/60 focus-within:shadow-[0_0_0_4px_var(--color-mata-100)] focus-within:ring-2 focus-within:ring-mata-600 ${
        topo ? "items-start" : "items-center"
      }`}
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-stone-900/5 text-stone-500 transition duration-200 group-focus-within:bg-mata-600 group-focus-within:text-white">
        <Icone size={19} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="block text-[11px] leading-4 font-semibold tracking-wide text-stone-500 transition group-focus-within:text-mata-700">
          {rotulo}{obrigatorio && <span className="text-red-600"> *</span>}
        </label>
        {children}
      </div>
    </div>
  );
}
