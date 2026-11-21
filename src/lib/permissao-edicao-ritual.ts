import type { Usuario } from "./auth";
import type { Evento } from "./types";

export function podeEditarRitual(u: Pick<Usuario, "id" | "perfil" | "funcaoRitual" | "aprovacaoPendente" | "cadastroIncompleto"> | null, evento: Pick<Evento, "mestres">): boolean {
  return !!u && !u.aprovacaoPendente && !u.cadastroIncompleto && (
    u.perfil === "admin" || u.perfil === "coordenador" || (u.funcaoRitual === "mestre" && !!evento.mestres?.includes(u.id))
  );
}
