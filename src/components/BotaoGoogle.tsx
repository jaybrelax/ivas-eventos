/** Link para o fluxo de login/cadastro com um clique pelo Google (ver src/app/api/auth/google). */
export function BotaoGoogle({ next, guardiao, texto = "Continuar com Google", recomendado = false }: { next?: string; guardiao?: boolean; texto?: string; recomendado?: boolean }) {
  const params = new URLSearchParams();
  if (next) params.set("next", next);
  if (guardiao) params.set("guardiao", "1");
  const href = `/api/auth/google${params.size ? `?${params}` : ""}`;
  const botao = (
    <a
      href={href}
      className="inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-700 shadow-2xs transition hover:border-stone-300 hover:bg-stone-50 active:scale-[0.98]"
    >
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden className="shrink-0">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 5.8 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.4 18.9 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 5.8 29.3 4 24 4c-7.7 0-14.3 4.4-17.7 10.7z" />
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.4 26.7 36 24 36c-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.6 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.7l6.2 5.2C40.9 36.6 44 30.9 44 24c0-1.3-.1-2.7-.4-3.5z" />
      </svg>
      {texto}
    </a>
  );
  if (!recomendado) return botao;
  return (
    <div className="relative">
      {botao}
      <span className="pointer-events-none absolute -top-2 right-4 rounded-full bg-emerald-600 px-2 py-px text-[9px] leading-tight font-bold tracking-wide text-white uppercase shadow-sm">
        Recomendado
      </span>
    </div>
  );
}
