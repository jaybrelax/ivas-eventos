export type Instituto = {
  nome: string;
  nome_curto: string;
  logo_file_id: string | null;
  logo_escura_file_id: string | null;
  cor_primaria: string;
  cor_secundaria: string;
  fonte_titulo: string;
  fonte_texto: string;
  ritual_numero_inicial: number;
};

export type Endereco = { $id: string; apelido: string; endereco: string; cidade: string; link_maps: string | null; padrao: boolean };
export type Telefone = { $id: string; rotulo: string; numero: string; whatsapp: boolean; padrao: boolean };
export type Rede = { $id: string; rede: string; usuario: string; url: string | null };
export type TipoPix = "cpf" | "cnpj" | "email" | "telefone" | "aleatoria";
export type ChavePix = { $id: string; tipo: TipoPix; chave: string; favorecido: string; cidade: string; banco: string | null; padrao: boolean };
export type Funcao = "mestre" | "guardiao";
export type Sexo = "masculino" | "feminino";
/** Usuário do painel que pode ser escalado nos eventos como mestre ou guardião. */
export type Pessoa = { $id: string; nome: string; funcao: Funcao; sexo: Sexo | null; foto: string | null };

export type TipoEvento = { $id: string; nome: string; slug: string; cor: string; icone: string | null; conta_como_ritual: boolean; ativo: boolean; ordem: number };

export type Evento = {
  $id: string;
  titulo: string;
  descricao: string | null;
  data: string; // AAAA-MM-DD
  hora_inicio: string; // HH:MM
  endereco_id: string | null;
  endereco_livre: string | null;
  tipo_id: string;
  destaque: boolean;
  capa_file_id: string | null;
  mestres: string[] | null; // IDs de usuários
  guardioes: string[] | null;
  mostrar_banner: boolean;
  ritual_numero_geral: number | null;
  ritual_ano: number | null;
  ritual_numero_ano: number | null;
  criado_por: string | null;
  atualizado_por: string | null;
  $createdAt: string;
  $updatedAt: string;
};

export type ModeloBanner = { $id: string; nome: string; config: string };

export type DadosInstituto = {
  instituto: Instituto;
  enderecos: Endereco[];
  telefones: Telefone[];
  redes: Rede[];
  pix: ChavePix[];
  tipos: TipoEvento[];
};
