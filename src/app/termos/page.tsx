import type { Metadata } from "next";
import Link from "next/link";
import { getInstituto } from "@/lib/data";
import { PaginaTexto } from "@/components/publico/PaginaTexto";

export const metadata: Metadata = { title: "Termos de Uso — Instituto IVAS" };

export default async function Termos() {
  const instituto = await getInstituto();
  const nome = instituto.nome || "Instituto IVAS";

  return (
    <PaginaTexto sobre="Transparência" titulo="Termos de Uso" atualizado="18 de outubro de 2026">
      <p>
        Estes termos valem para o uso do site <strong>virtudes.net.br</strong>, mantido pelo {nome}. Ao criar um cadastro ou se inscrever
        em um encontro, você concorda com eles.
      </p>

      <section className="space-y-2">
        <h2>1. Cadastro</h2>
        <ul>
          <li>O cadastro é pessoal. Informe dados verdadeiros e mantenha-os atualizados.</li>
          <li>Você é responsável por manter sua senha em segurança. Se entrar com o Google, o acesso segue as regras da sua conta Google.</li>
          <li>A coordenação pode desativar cadastros com dados falsos ou usados de forma indevida.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2>2. Inscrições nos encontros</h2>
        <ul>
          <li>As vagas de cada encontro são limitadas e preenchidas por ordem de inscrição. Quando lotam, as próximas inscrições entram na lista de espera e são confirmadas automaticamente se alguém desistir.</li>
          <li>Você pode cancelar a sua inscrição pelo site até 4 horas antes do início do encontro, enquanto a sua contribuição não tiver sido confirmada pela coordenação. Fora disso, fale com a coordenação.</li>
          <li>A coordenação pode alterar data, horário ou local de um encontro, ou cancelá-lo, avisando os inscritos.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2>3. Contribuição</h2>
        <ul>
          <li>A participação nos rituais tem uma contribuição, informada na página de cada encontro.</li>
          <li>Ao contribuir, você pode avisar pelo site e anexar o comprovante, ou avisar que vai contribuir na hora, no dia do ritual. Com o comprovante, a contribuição fica “informada” até a coordenação confirmar.</li>
          <li>Casos de isenção ou devolução são combinados diretamente com a coordenação.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2>4. Saúde e segurança</h2>
        <p>
          Os rituais envolvem o uso sacramental da Ayahuasca, que tem contraindicações e pode interagir com medicamentos. Antes de
          participar, informe à coordenação qualquer condição de saúde ou uso de medicamentos e, quando necessário, procure orientação médica.
          Siga as orientações da coordenação antes, durante e depois de cada encontro.
        </p>
      </section>

      <section className="space-y-2">
        <h2>5. Conduta</h2>
        <p>
          Esperamos respeito a todos os participantes, à equipe e às tradições do Instituto. A coordenação pode recusar ou cancelar a
          inscrição de quem não seguir as orientações.
        </p>
      </section>

      <section className="space-y-2">
        <h2>6. Privacidade</h2>
        <p>
          O uso dos seus dados está descrito na nossa{" "}
          <Link href="/privacidade" className="font-medium text-mata-700 hover:underline">Política de Privacidade</Link>.
        </p>
      </section>

      <section className="space-y-2">
        <h2>7. Mudanças e contato</h2>
        <p>
          Podemos atualizar estes termos, e a data no topo desta página mostra a última alteração. Em caso de dúvida, fale com a coordenação
          pelos contatos que aparecem no rodapé do site.
        </p>
      </section>
    </PaginaTexto>
  );
}
