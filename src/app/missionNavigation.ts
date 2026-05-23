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
import type { LucideIcon } from 'lucide-react';
import type { MissionMode } from '../state/types';

interface MissionNavBlueprint {
  segment: string;
  label: string;
  shortLabel: string;
  title: string;
  icon: LucideIcon;
}

export interface MissionNavItem {
  to: string;
  label: string;
  shortLabel: string;
  title: string;
  icon: LucideIcon;
}

const navBlueprint: MissionNavBlueprint[] = [
  { segment: '', label: 'Expedition Home', shortLabel: 'Home', title: 'Expedition Home', icon: Activity },
  { segment: 'setup', label: 'Mission Setup', shortLabel: 'Setup', title: 'Mission Setup', icon: Settings2 },
  { segment: 'checklists', label: 'Checklists', shortLabel: 'Checks', title: 'Checklists', icon: ClipboardCheck },
  { segment: 'live-operations', label: 'Swim Tracker', shortLabel: 'Track', title: 'Swim Tracker', icon: MapPinned },
  { segment: 'wowsa', label: 'WOWSA Evidence', shortLabel: 'WOWSA', title: 'WOWSA Evidence', icon: Camera },
  { segment: 'safety', label: 'Safety & Emergency', shortLabel: 'Safety', title: 'Safety & Emergency', icon: ShieldAlert },
  { segment: 'communication', label: 'Communication Hub', shortLabel: 'Comms', title: 'Communication Hub', icon: MessageSquare },
  { segment: 'crew', label: 'Crew & Roles', shortLabel: 'Crew', title: 'Crew & Roles', icon: ContactRound },
  { segment: 'logs', label: 'Reports & Data', shortLabel: 'Reports', title: 'Reports & Data', icon: FileClock }
];

export function getMissionBasePath(mode: MissionMode): string {
  return mode === 'template' ? '/template' : '/';
}

export function getMissionPath(mode: MissionMode, segment = ''): string {
  const cleanSegment = segment.replace(/^\/+|\/+$/g, '');
  const basePath = getMissionBasePath(mode);
  if (!cleanSegment) {
    return basePath;
  }

  return basePath === '/' ? `/${cleanSegment}` : `${basePath}/${cleanSegment}`;
}

export function buildMissionNavItems(mode: MissionMode): MissionNavItem[] {
  return navBlueprint.map((item) => ({
    to: getMissionPath(mode, item.segment),
    label: item.label,
    shortLabel: item.shortLabel,
    title: item.title,
    icon: item.icon
  }));
}

export function getPrimaryMobileNavItems(navItems: MissionNavItem[]): MissionNavItem[] {
  return [navItems[0], navItems[2], navItems[3], navItems[4]];
}

export function getDeliverableTitle(mode: MissionMode): string {
  return mode === 'template' ? 'Reusable Template Project' : 'Live Operational Project';
}

export function getDeliverableBrand(mode: MissionMode): string {
  return mode === 'template' ? 'Endurance Swim OS' : 'Swim California';
}

export function getAlternateDeliverableLink(mode: MissionMode) {
  return mode === 'template'
    ? { to: '/', label: 'Open Live Project' }
    : { to: '/template', label: 'Open Template Project' };
}
