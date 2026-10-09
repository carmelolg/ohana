import { Suspense, useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { spaceColor } from '../lib/color';
import { useRealtimeSync, useSpace } from '../lib/data';
import { useShortcuts } from '../lib/useShortcuts';
import { NewSheet } from './NewSheet';
import { RightColumn } from './RightColumn';
import { SearchSheet } from './SearchSheet';
import { SpaceSheet } from './SpaceSheet';
import { ConnectionBar } from './shell/ConnectionBar';
import { Sidebar } from './shell/Sidebar';
import { TabBar } from './shell/TabBar';
import { TopBar } from './shell/TopBar';
import { isFullScreenFlow } from './shell/isFullScreenFlow';

type Overlay = 'spaces' | 'search' | 'new' | null;

/** Guscio dell'app: barra superiore, navigazione (laterale o inferiore), contenuto e pannelli. */
export function Shell() {
  const { current } = useSpace();
  const { pathname } = useLocation();
  const [overlay, setOverlay] = useState<Overlay>(null);
  const close = () => setOverlay(null);
  useRealtimeSync();
  useShortcuts({ onNew: () => setOverlay('new'), onSearch: () => setOverlay('search') });

  const spaceStyle = useMemo(
    () => (current ? { '--space': spaceColor(current.color_hue) } : {}) as React.CSSProperties,
    [current],
  );
  const fullScreen = isFullScreenFlow(pathname);
  // la sezione Cura usa tutta la larghezza (filoni affiancati e colonna laterale propria)
  const wide = pathname.startsWith('/cura');

  return (
    <div className="app" style={spaceStyle}>
      <TopBar
        editor={fullScreen}
        onSpaces={() => setOverlay('spaces')}
        onSearch={() => setOverlay('search')}
        onCreate={() => setOverlay('new')}
      />
      <ConnectionBar />
      <div className="app-body">
        <Sidebar onSpaces={() => setOverlay('spaces')} />
        <div className="center">
          <main className={'main' + (wide ? ' wide' : '')}>
            <Suspense
              fallback={
                <div className="empty" role="status">
                  Caricamento…
                </div>
              }
            >
              <Outlet />
            </Suspense>
          </main>
        </div>
        {!wide && <RightColumn />}
      </div>
      {!fullScreen && <TabBar onCreate={() => setOverlay('new')} />}
      {overlay === 'new' && <NewSheet onClose={close} />}
      {overlay === 'spaces' && <SpaceSheet onClose={close} />}
      {overlay === 'search' && <SearchSheet onClose={close} />}
    </div>
  );
}
