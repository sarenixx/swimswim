import {
  Ambulance,
  FileClock,
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
  { segment: '', label: 'WOWSA Observation Log', shortLabel: 'WOWSA', title: 'WOWSA Observation Log', icon: FileClock },
  { segment: 'medical', label: 'Medical', shortLabel: 'Medical', title: 'Medical', icon: Ambulance }
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
  return navItems;
}

export function getDeliverableTitle(mode: MissionMode): string {
  return mode === 'template' ? 'Reusable Observer Template' : 'Live Swim Observation Record';
}

export function getDeliverableBrand(mode: MissionMode): string {
  return mode === 'template' ? 'WOWSA Observer' : 'Swim California';
}

export function getAlternateDeliverableLink(mode: MissionMode) {
  return mode === 'template'
    ? { to: '/', label: 'Open Live Project' }
    : { to: '/template', label: 'Open Template Project' };
}
