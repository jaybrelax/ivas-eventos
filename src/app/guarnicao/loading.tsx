/** Esqueleto enquanto a tela carrega: blocos pulsando no lugar do cabeçalho e dos cartões. */
export default function Carregando() {
  const bloco = "motion-safe:animate-pulse rounded-2xl bg-stone-200/80";
  return (
    // Altura limitada à da tela (menos o menu): se o esqueleto passar disso, a página vira rolável por um instante
    // e o menu fixo "pula" de lugar a cada troca de aba.
    <div aria-busy="true" aria-label="Carregando" className="h-[calc(100dvh-7.25rem-env(safe-area-inset-bottom))] overflow-hidden [animation:aparecer_120ms_ease_350ms_backwards]">
      <div className="flex items-end justify-between px-5 pt-[calc(1rem+env(safe-area-inset-top))] pb-4">
        <div className="flex items-end gap-2.5">
          <div className={`${bloco} h-[38px] w-[38px] rounded-xl`} />
          <div className={`${bloco} h-8 w-36`} />
        </div>
        <div className={`${bloco} h-10 w-10 rounded-full`} />
      </div>
      <div className="flex gap-2 px-5 pb-3">
        <div className={`${bloco} h-9 w-20 rounded-full`} />
        <div className={`${bloco} h-9 w-40 rounded-full`} />
      </div>
      <ul className="space-y-3 px-4">
        {[0, 1, 2].map((i) => (
          <li key={i} className="flex overflow-hidden rounded-3xl bg-white ring-1 ring-stone-200/70">
            <div className="h-40 w-[6.5rem] shrink-0 motion-safe:animate-pulse bg-stone-200" />
            <div className="flex-1 space-y-2.5 p-4">
              <div className={`${bloco} h-4 w-4/5 rounded-lg`} />
              <div className={`${bloco} h-3 w-1/2 rounded-lg`} />
              <div className="flex gap-1.5 pt-2">
                {[0, 1, 2, 3].map((j) => <div key={j} className={`${bloco} h-9 w-9 rounded-full`} />)}
              </div>
              <div className={`${bloco} h-6 w-32 rounded-full`} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
