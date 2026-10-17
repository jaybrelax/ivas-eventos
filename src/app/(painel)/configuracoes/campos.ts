export type Campo = {
  nome: string;
  rotulo: string;
  tipo: "text" | "checkbox" | "select" | "color" | "number";
  obrigatorio?: boolean;
  opcoes?: { valor: string; rotulo: string }[];
  dica?: string;
  largura?: "sm" | "md" | "lg";
};

export const CAMPOS = {
  enderecos: {
    titulo: "Endereços",
    descricao: "Locais onde os eventos acontecem. O padrão já vem marcado ao criar um evento.",
    campos: [
      { nome: "apelido", rotulo: "Apelido", tipo: "text", obrigatorio: true, dica: "Ex.: Sede", largura: "sm" },
      { nome: "endereco", rotulo: "Endereço completo", tipo: "text", obrigatorio: true, largura: "lg" },
      { nome: "cidade", rotulo: "Cidade/UF", tipo: "text", largura: "sm" },
      { nome: "link_maps", rotulo: "Link do Google Maps", tipo: "text", largura: "md" },
      { nome: "padrao", rotulo: "Padrão", tipo: "checkbox" },
    ],
  },
  telefones: {
    titulo: "Telefones",
    descricao: "Aparecem no rodapé dos banners.",
    campos: [
      { nome: "rotulo", rotulo: "Rótulo", tipo: "text", dica: "Ex.: Secretaria", largura: "sm" },
      { nome: "numero", rotulo: "Número", tipo: "text", obrigatorio: true, dica: "(00) 00000-0000", largura: "md" },
      { nome: "whatsapp", rotulo: "WhatsApp", tipo: "checkbox" },
      { nome: "padrao", rotulo: "Padrão", tipo: "checkbox" },
    ],
  },
  redes: {
    titulo: "Instagram e redes",
    descricao: "Perfis exibidos nos banners.",
    campos: [
      {
        nome: "rede", rotulo: "Rede", tipo: "select", obrigatorio: true, largura: "sm",
        opcoes: [
          { valor: "instagram", rotulo: "Instagram" }, { valor: "facebook", rotulo: "Facebook" },
          { valor: "youtube", rotulo: "YouTube" }, { valor: "site", rotulo: "Site" },
        ],
      },
      { nome: "usuario", rotulo: "Usuário", tipo: "text", obrigatorio: true, dica: "@ivas.ayahuasca", largura: "md" },
      { nome: "url", rotulo: "Link", tipo: "text", largura: "md" },
    ],
  },
  pix: {
    titulo: "Chaves Pix",
    descricao: "A chave padrão aparece no banner, com QR Code opcional. Favorecido e cidade entram no QR Code.",
    campos: [
      {
        nome: "tipo", rotulo: "Tipo", tipo: "select", obrigatorio: true, largura: "sm",
        opcoes: [
          { valor: "cnpj", rotulo: "CNPJ" }, { valor: "cpf", rotulo: "CPF" }, { valor: "email", rotulo: "E-mail" },
          { valor: "telefone", rotulo: "Telefone" }, { valor: "aleatoria", rotulo: "Aleatória" },
        ],
      },
      { nome: "chave", rotulo: "Chave", tipo: "text", obrigatorio: true, largura: "md" },
      { nome: "favorecido", rotulo: "Favorecido", tipo: "text", obrigatorio: true, largura: "md" },
      { nome: "cidade", rotulo: "Cidade", tipo: "text", largura: "sm" },
      { nome: "banco", rotulo: "Banco", tipo: "text", largura: "sm" },
      { nome: "padrao", rotulo: "Padrão", tipo: "checkbox" },
    ],
  },
  tipos: {
    titulo: "Tipos de evento",
    descricao: "Marque “Conta como ritual” para o tipo entrar na numeração (sequência única para todos).",
    campos: [
      { nome: "nome", rotulo: "Nome", tipo: "text", obrigatorio: true, largura: "md" },
      { nome: "cor", rotulo: "Cor", tipo: "color" },
      { nome: "ordem", rotulo: "Ordem", tipo: "number" },
      { nome: "conta_como_ritual", rotulo: "Conta como ritual", tipo: "checkbox" },
      { nome: "ativo", rotulo: "Ativo", tipo: "checkbox" },
    ],
  },
} satisfies Record<string, { titulo: string; descricao: string; campos: Campo[] }>;

export type TabelaEditavel = keyof typeof CAMPOS;

export const FONTES = ["Cinzel", "Montserrat", "Playfair Display", "Cormorant Garamond", "Lora", "Poppins", "Inter", "Raleway", "Marcellus", "Josefin Sans"];
