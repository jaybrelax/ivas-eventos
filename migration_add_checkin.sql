-- Adiciona coluna de check-in aos convidados (participantes)
ALTER TABLE public.convidados
ADD COLUMN IF NOT EXISTS checkin_em TIMESTAMPTZ;
