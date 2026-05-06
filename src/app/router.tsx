import {
  Activity,
  Camera,
  ClipboardCheck,
  ContactRound,
  FileClock,
  MapPinned,
  MessageSquare,
  Settings2,
  ShieldAlert
} from 'lucide-react';
import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { AppShell } from './App';
import { Checklists } from '../features/checklists/Checklists';
import { CommunicationHub } from '../features/comms/CommunicationHub';
import { CrewRoles } from '../features/crew/CrewRoles';
import { LiveOperations } from '../features/live-ops/LiveOperations';
import { LogsData } from '../features/logs/LogsData';
import { MissionControl } from '../features/mission-control/MissionControl';
import { PartnersMedia } from '../features/partners/PartnersMedia';
import { SafetyEmergency } from '../features/safety/SafetyEmergency';
import { MissionSetup } from '../features/setup/MissionSetup';

export const navItems = [
  { to: '/', label: 'Expedition Home', shortLabel: 'Home', title: 'Expedition Home', icon: Activity },
  { to: '/setup', label: 'Mission Setup', shortLabel: 'Setup', title: 'Mission Setup', icon: Settings2 },
  { to: '/checklists', label: 'Checklists', shortLabel: 'Checks', title: 'Checklists', icon: ClipboardCheck },
  { to: '/live-operations', label: 'Swim Tracker', shortLabel: 'Track', title: 'Swim Tracker', icon: MapPinned },
  { to: '/wowsa', label: 'WOWSA Evidence', shortLabel: 'WOWSA', title: 'WOWSA Evidence', icon: Camera },
  { to: '/safety', label: 'Safety & Emergency', shortLabel: 'Safety', title: 'Safety & Emergency', icon: ShieldAlert },
  { to: '/communication', label: 'Communication Hub', shortLabel: 'Comms', title: 'Communication Hub', icon: MessageSquare },
  { to: '/crew', label: 'Crew & Roles', shortLabel: 'Crew', title: 'Crew & Roles', icon: ContactRound },
  { to: '/logs', label: 'Reports & Data', shortLabel: 'Reports', title: 'Reports & Data', icon: FileClock }
];

export const primaryMobileNavItems = [navItems[0], navItems[2], navItems[3], navItems[4]];

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <MissionControl /> },
      { path: 'setup', element: <MissionSetup /> },
      { path: 'checklists', element: <Checklists /> },
      { path: 'live-operations', element: <LiveOperations /> },
      { path: 'wowsa', element: <PartnersMedia /> },
      { path: 'safety', element: <SafetyEmergency /> },
      { path: 'communication', element: <CommunicationHub /> },
      { path: 'crew', element: <CrewRoles /> },
      { path: 'logs', element: <LogsData /> },
      { path: 'partners', element: <PartnersMedia /> }
    ]
  }
];

export function createAppRouter() {
  return createBrowserRouter(routes);
}
