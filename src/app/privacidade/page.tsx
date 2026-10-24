import type { Metadata } from "next";
import Link from "next/link";
import { getInstituto } from "@/lib/data";
import { PaginaTexto } from "@/components/publico/PaginaTexto";

export const metadata: Metadata = { title: "Política de Privacidade — Instituto IVAS" };

export default async function Privacidade() {
  const instituto = await getInstituto();
  const nome = instituto.nome || "Instituto IVAS";

  return (
    <PaginaTexto sobre="Transparência" titulo="Política de Privacidade" atualizado="18 de outubro de 2026">
      <p>
        Esta política explica quais dados pessoais o {nome} coleta no site <strong>virtudes.net.br</strong>, para que eles são usados e
        quais são os seus direitos, de acordo com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).
      </p>

      <section className="space-y-2">
        <h2>1. Quais dados coletamos</h2>
        <ul>
          <li><strong>Dados de cadastro:</strong> nome, e-mail, foto de perfil, WhatsApp, gênero, endereço, CPF e data de nascimento. Endereço, CPF e data de nascimento são opcionais.</li>
          <li><strong>Login com o Google:</strong> se você escolher entrar com o Google, recebemos apenas seu nome, e-mail e foto de perfil. Não temos acesso à sua senha do Google nem a outros dados da sua conta.</li>
          <li><strong>Participação:</strong> os rituais e encontros em que você se inscreveu, a situação da inscrição (confirmada, lista de espera, cancelada) e o histórico de participações.</li>
          <li><strong>Contribuições:</strong> a situação da sua contribuição (pendente, informada, feita, isenta ou para fazer na hora), o valor e o comprovante que você enviar.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2>2. Para que usamos seus dados</h2>
        <ul>
          <li>Criar e manter sua conta e permitir que você entre no site.</li>
          <li>Confirmar sua presença nos rituais, organizar as vagas e a lista de espera.</li>
          <li>Registrar e confirmar as contribuições e mostrar a você o seu histórico.</li>
          <li>Entrar em contato com você sobre os encontros em que se inscreveu (por exemplo, pelo WhatsApp).</li>
          <li>Cuidar da sua segurança durante os rituais.</li>
        </ul>
        <p>Não vendemos, alugamos nem usamos seus dados para publicidade.</p>
      </section>

      <section className="space-y-2">
        <h2>3. Quem tem acesso</h2>
        <p>
          Seus dados são vistos apenas pela coordenação do Instituto (administradores e coordenadores), na medida do necessário para organizar
          os rituais e as contribuições. Os comprovantes de contribuição ficam em área privada, acessível somente a você e à coordenação.
        </p>
        <p>
          Para funcionar, o site usa serviços de hospedagem e armazenamento de terceiros (Vercel e Appwrite), que guardam os dados em nosso
          nome. Só compartilhamos dados com autoridades quando a lei exigir.
        </p>
      </section>

      <section className="space-y-2">
        <h2>4. Cookies</h2>
        <p>
          Usamos apenas um cookie essencial, que mantém você conectado depois de entrar. Não usamos cookies de rastreamento ou de publicidade.
        </p>
      </section>

      <section className="space-y-2">
        <h2>5. Por quanto tempo guardamos</h2>
        <p>
          Guardamos seus dados enquanto sua conta estiver ativa. O histórico de participações e contribuições pode ser mantido pelo tempo
          necessário para a organização do Instituto e o cumprimento de obrigações legais. Se você pedir a exclusão da conta, apagamos ou
          tornamos anônimos os seus dados, exceto o que precisarmos manter por lei.
        </p>
      </section>

      <section className="space-y-2">
        <h2>6. Seus direitos</h2>
        <p>Pela LGPD, você pode a qualquer momento:</p>
        <ul>
          <li>confirmar se tratamos seus dados e ter acesso a eles;</li>
          <li>corrigir dados incompletos ou desatualizados (você mesmo pode fazer isso em <Link href="/minha-conta/dados" className="font-medium text-mata-700 hover:underline">Meus dados</Link>);</li>
          <li>pedir a exclusão da sua conta e dos seus dados;</li>
          <li>revogar o consentimento e saber com quem seus dados foram compartilhados.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2>7. Contato</h2>
        <p>
          Para exercer seus direitos ou tirar dúvidas sobre esta política, fale com a coordenação do {nome} pelos contatos que aparecem no
          rodapé do site.
        </p>
      </section>

      <section className="space-y-2">
        <h2>8. Mudanças nesta política</h2>
        <p>Podemos atualizar esta política. Quando isso acontecer, a data no topo desta página será alterada.</p>
      </section>
    </PaginaTexto>
  );
}
