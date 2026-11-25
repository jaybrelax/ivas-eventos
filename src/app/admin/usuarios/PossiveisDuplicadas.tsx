import Link from "next/link";
import { GitMerge } from "lucide-react";
import { Avatar } from "@/components/Avatar";

export type GrupoDuplicado = { motivo: "telefone" | "nome"; contas: { id: string; nome: string; email: string | null; telefone: string | null; foto: string | null; rapida: boolean }[] };

/** Contas que parecem ser da mesma pessoa: cada uma leva à ficha, onde o admin usa "Mesclar com outra conta". */
export function PossiveisDuplicadas({ grupos }: { grupos: GrupoDuplicado[] }) {
  if (!grupos.length) return null;
  return (
    <section className="cartao mb-6 space-y-3">
      <div>
        <h2 className="cartao-titulo flex items-center gap-2"><GitMerge size={17} className="text-mata-600" aria-hidden /> Possíveis contas duplicadas <span className="text-sm font-medium text-stone-400 tabular-nums">· {grupos.length}</span></h2>
        <p className="cartao-sub">Mesmo telefone, ou mesmo nome com um cadastro rápido. Abra a ficha e use “Mesclar com outra conta”.</p>
      </div>
      <ul className="space-y-2">
        {grupos.map((g) => (
          <li key={g.contas.map((c) => c.id).join("-")} className="rounded-xl border border-stone-200 bg-white p-2.5">
            <p className="mb-1.5 px-1 text-[11px] font-semibold tracking-wide text-stone-400 uppercase">{g.motivo === "telefone" ? "Mesmo telefone" : "Mesmo nome"}</p>
            <div className="flex flex-wrap gap-2">
              {g.contas.map((c) => (
                <Link key={c.id} href={`/admin/participantes/${c.id}`} className="flex min-w-0 items-center gap-2.5 rounded-lg bg-stone-50 px-2.5 py-1.5 transition hover:bg-mata-50 hover:ring-1 hover:ring-mata-200">
                  <Avatar nome={c.nome} foto={c.foto} tamanho={32} className="ring-0" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-stone-800">{c.nome}{c.rapida && <span className="ml-1.5 chip bg-ouro-100 px-1.5 py-px text-[10px] text-ouro-700">rápido</span>}</span>
                    <span className="block truncate text-xs text-stone-500">{c.email ?? "sem e-mail"}{c.telefone ? ` · ${c.telefone}` : ""}</span>
                  </span>
                </Link>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
