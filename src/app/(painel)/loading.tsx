// Esqueleto exibido enquanto a página busca os dados no Appwrite.
export default function Carregando() {
  return (
    <div aria-busy="true" aria-label="Carregando">
      <div className="mb-8 space-y-3">
        <div className="esqueleto h-3 w-20" />
        <div className="esqueleto h-8 w-64" />
        <div className="esqueleto h-4 w-96 max-w-full" />
      </div>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="cartao flex items-center gap-4 p-5">
            <div className="esqueleto h-11 w-11 rounded-xl" />
            <div className="flex-1 space-y-2">
              <div className="esqueleto h-3 w-24" />
              <div className="esqueleto h-6 w-12" />
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="cartao flex items-center gap-4 p-4">
            <div className="esqueleto h-16 w-16 rounded-xl" />
            <div className="flex-1 space-y-2">
              <div className="esqueleto h-4 w-1/3" />
              <div className="esqueleto h-3 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
