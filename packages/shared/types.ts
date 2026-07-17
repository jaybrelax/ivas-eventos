export interface Evento {
  id: string;
  titulo: string;
  descricao?: string;
  slug?: string;
  imagem_url?: string;
  capacidade: number;
  valor_ingresso: number;
  data_evento: string;
  local_evento?: string;
  horario_evento?: string;
  status: 'ativo' | 'desativado';
  timeout_reserva: number;
  meta_guardiao?: number;
  off_price?: number;
  qtd_off?: number;
  created_at: string;
}

export interface Pedido {
  id: string;
  evento_id: string;
  cliente_id: string;
  vendedor_id?: string;
  quantidade: number;
  valor_total: number;
  status: 'pendente' | 'pago' | 'cancelado' | 'expirado';
  venda_direta?: boolean;
  expira_em: string;
  display_id?: string;
  mp_payment_id?: string;
  mp_qr_code?: string;
  mp_pix_copy_paste?: string;
  created_at: string;
}

export interface Cliente {
  id: string;
  nome_completo: string;
  cpf: string;
  email: string;
  telefone: string;
}

export interface Vendedor {
  id: string;
  nome: string;
  codigo_ref: string;
  telefone?: string;
}

export interface Convidado {
  id: string;
  pedido_id: string;
  nome_completo: string;
  created_at: string;
}
