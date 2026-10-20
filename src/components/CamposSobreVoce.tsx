import { EXPERIENCIAS, LIMITE_TEXTO_LONGO, type Experiencia } from "@/lib/perfil-extra";

/** Profissão, experiência com a ayahuasca, motivação e expectativas (todos opcionais). */
export function CamposSobreVoce({
  id, profissao, experiencia, motivacao, expectativas,
}: {
  id: string; profissao?: string | null; experiencia?: Experiencia | null; motivacao?: string | null; expectativas?: string | null;
}) {
  return (
    <>
      <div>
        <label className="rotulo" htmlFor={`${id}-profissao`}>Profissão</label>
        <input id={`${id}-profissao`} name="profissao" maxLength={100} defaultValue={profissao ?? ""} autoComplete="organization-title" className="campo h-11" />
      </div>
      <div>
        <label className="rotulo" htmlFor={`${id}-experiencia`}>Experiência com ayahuasca</label>
        <select id={`${id}-experiencia`} name="experiencia_ayahuasca" defaultValue={experiencia ?? ""} className="campo h-11">
          <option value="">Não informado</option>
          {EXPERIENCIAS.map((e) => <option key={e.valor} value={e.valor}>{e.rotulo}</option>)}
        </select>
      </div>
      <div>
        <label className="rotulo" htmlFor={`${id}-motivacao`}>Motivação para participar</label>
        <textarea id={`${id}-motivacao`} name="motivacao" rows={3} maxLength={LIMITE_TEXTO_LONGO} defaultValue={motivacao ?? ""} className="campo min-h-24 py-2.5" />
      </div>
      <div>
        <label className="rotulo" htmlFor={`${id}-expectativas`}>Expectativas</label>
        <textarea id={`${id}-expectativas`} name="expectativas" rows={3} maxLength={LIMITE_TEXTO_LONGO} defaultValue={expectativas ?? ""} className="campo min-h-24 py-2.5" />
      </div>
    </>
  );
}
