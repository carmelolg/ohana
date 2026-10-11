import { Link } from 'react-router-dom';
import { ProgressBar } from '../../components/ProgressBar';
import { useProcedures, useSpace } from '../../lib/data';
import type { Procedure } from '../../lib/types';

/** Gli interventi a fasi ancora aperti (modello «lavori») dello spazio in vista. */
export const openProjects = (procedures: Procedure[], inScope: (spaceId: string) => boolean): Procedure[] =>
  procedures.filter((p) => p.template_key === 'lavori' && p.status === 'in_corso' && inScope(p.space_id));

/** Card evidenziate in cima a Manutenzioni: aprono la timeline a fasi dell'intervento. */
export function ProjectCards() {
  const { selected } = useSpace();
  const { data: procedures = [] } = useProcedures();
  const projects = openProjects(procedures, (id) => selected === 'all' || id === selected);
  if (projects.length === 0) {
    return null;
  }
  return (
    <div className="stack" style={{ marginTop: 14 }}>
      {projects.map((p) => {
        const done = p.procedure_steps.filter((s) => s.done_at).length;
        const total = p.procedure_steps.length;
        return (
          <Link key={p.id} to={`/pratiche/${p.id}`} className="project-card">
            <span className="label">Intervento in corso</span>
            <span className="project-title">{p.title}</span>
            <ProgressBar value={done} max={total} />
            <span className="muted" style={{ fontSize: 13 }}>
              {done} di {total} fasi
            </span>
          </Link>
        );
      })}
    </div>
  );
}
