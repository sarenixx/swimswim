import { Navigate, createBrowserRouter, type RouteObject } from 'react-router-dom';
import { AppShell } from './App';
import { PartnersMedia as ObservationLog } from '../features/partners/PartnersMedia';
import { SafetyEmergency } from '../features/safety/SafetyEmergency';
import { MissionStoreProvider, useLiveMissionStore, useTemplateMissionStore } from '../state/useMissionStore';

const missionRoutes: RouteObject[] = [
  { index: true, element: <ObservationLog /> },
  { path: 'medical', element: <SafetyEmergency /> },
  { path: 'wowsa', element: <Navigate to=".." replace /> },
  { path: 'safety', element: <Navigate to="../medical" replace /> },
  { path: '*', element: <Navigate to="." replace /> }
];

export const routes: RouteObject[] = [
  {
    path: '/',
    element: (
      <MissionStoreProvider store={useLiveMissionStore}>
        <AppShell />
      </MissionStoreProvider>
    ),
    children: missionRoutes
  },
  {
    path: '/template',
    element: (
      <MissionStoreProvider store={useTemplateMissionStore}>
        <AppShell />
      </MissionStoreProvider>
    ),
    children: missionRoutes
  }
];

export function createAppRouter() {
  return createBrowserRouter(routes);
}
