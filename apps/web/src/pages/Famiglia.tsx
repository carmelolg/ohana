import { Link } from 'react-router-dom';
import { AreaCard } from '../components/AreaCard';
import { CareCard } from '../components/care/CareCard';
import { useFeatures, useSpace } from '../lib/data';

/** Famiglia: persone assistite, rubrica, emergenza, spazi e impostazioni. */
export function FamigliaPage() {
  const { spaces, current } = useSpace();
  const isOn = useFeatures();
  const spaceTo = current ? `/spazio/${current.id}` : spaces[0] ? `/spazio/${spaces[0].id}` : '/oggi';
  return (
    <>
      <h2 className="page-title">Famiglia</h2>
      <div className="more-grid">
        {isOn('cura') && <CareCard />}
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
        <Link to={`${spaceTo}#bacheca`} className="more-row">
          <span>Bacheca</span>
          <b>›</b>
        </Link>
        <Link to="/impostazioni" className="more-row">
          <span>Profilo e impostazioni</span>
          <b>›</b>
        </Link>
      </div>
    </>
  );
}
