import { Link } from 'react-router-dom';
import { AreaCard } from '../components/AreaCard';
import { BoardCard } from '../components/BoardCard';
import { CareCard } from '../components/care/CareCard';
import { useFeatures, useSpace } from '../lib/data';

/** Famiglia: persone assistite, rubrica, emergenza, bacheca, spazi e inviti. */
export function FamigliaPage() {
  const { spaces, current } = useSpace();
  const isOn = useFeatures();
  const spaceTo = current ? `/spazio/${current.id}` : spaces[0] ? `/spazio/${spaces[0].id}` : '/oggi';
  return (
    <>
      <h2 className="page-title">Famiglia</h2>
      <div className="more-grid">
        {isOn('cura') && <CareCard />}
        <BoardCard />
        <AreaCard to="/rubrica" title="Rubrica" sub="Medici, idraulico, amministratore" />
        <AreaCard to="/emergenza" title="Emergenza" sub="Numeri e info, anche offline" danger />
      </div>
      <div className="more-list">
        <Link to={spaceTo} className="more-row">
          <span>Spazi e inviti</span>
          <b>
            {spaces.length} {spaces.length === 1 ? 'spazio' : 'spazi'} ›
          </b>
        </Link>
      </div>
    </>
  );
}
