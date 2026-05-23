import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { AppShell } from './App';
import { Checklists } from '../features/checklists/Checklists';
import { CommunicationHub } from '../features/comms/CommunicationHub';
import { ConditionsRisk } from '../features/conditions-risk/ConditionsRisk';
import { CrewRoles } from '../features/crew/CrewRoles';
import { FeedingPlan } from '../features/feeding/FeedingPlan';
import { LiveOperations } from '../features/live-ops/LiveOperations';
import { LogsData } from '../features/logs/LogsData';
import { MissionControl } from '../features/mission-control/MissionControl';
import { PartnersMedia } from '../features/partners/PartnersMedia';
import { SafetyEmergency } from '../features/safety/SafetyEmergency';
import { MissionSetup } from '../features/setup/MissionSetup';
import { MissionStoreProvider, useLiveMissionStore, useTemplateMissionStore } from '../state/useMissionStore';

const missionRoutes: RouteObject[] = [
  { index: true, element: <MissionControl /> },
  { path: 'setup', element: <MissionSetup /> },
  { path: 'checklists', element: <Checklists /> },
  { path: 'live-operations', element: <LiveOperations /> },
  { path: 'feeding', element: <FeedingPlan /> },
  { path: 'conditions-risk', element: <ConditionsRisk /> },
  { path: 'wowsa', element: <PartnersMedia /> },
  { path: 'safety', element: <SafetyEmergency /> },
  { path: 'communication', element: <CommunicationHub /> },
  { path: 'crew', element: <CrewRoles /> },
  { path: 'logs', element: <LogsData /> },
  { path: 'partners', element: <PartnersMedia /> }
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
