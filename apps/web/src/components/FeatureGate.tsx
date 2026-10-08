import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import type { SpaceFeature } from '@ohana/shared';
import { useFeature } from '../lib/data';

/** Mostra la pagina solo se la funzione è accesa nello spazio scelto; altrimenti torna a Oggi. */
export function FeatureGate({ feature, children }: { feature: SpaceFeature; children: ReactNode }) {
  return useFeature(feature) ? <>{children}</> : <Navigate to="/oggi" replace />;
}
