-- Habilitar vendas encerradas (SOLD OUT) por evento
-- A página continua ativa, mas sem permitir novas compras.
ALTER TABLE public.eventos
  ADD COLUMN IF NOT EXISTS vendas_encerradas BOOLEAN NOT NULL DEFAULT false;
