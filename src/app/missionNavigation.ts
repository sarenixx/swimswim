import {
  Activity,
  Ambulance,
  ClipboardCheck,
  CloudSun,
  ContactRound,
  FileClock,
  MapPinned,
  Settings2,
  ShieldAlert,
  Utensils
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
  { segment: '', label: 'Dashboard', shortLabel: 'Home', title: 'Swim Overview Dashboard', icon: Activity },
  { segment: 'live-operations', label: 'Timeline', shortLabel: 'Timeline', title: 'Swim Timeline', icon: MapPinned },
  { segment: 'crew', label: 'Crew Coordination', shortLabel: 'Crew', title: 'Crew Coordination', icon: ContactRound },
  { segment: 'feeding', label: 'Feeding Plan', shortLabel: 'Feed', title: 'Feeding / Nutrition Plan', icon: Utensils },
  { segment: 'conditions-risk', label: 'Conditions + Risk', shortLabel: 'Risk', title: 'Conditions + Risk', icon: CloudSun },
  { segment: 'checklists', label: 'Packing + Readiness', shortLabel: 'Pack', title: 'Packing + Readiness', icon: ClipboardCheck },
  {
    segment: 'safety#medical-record',
    label: 'Medical Record',
    shortLabel: 'Medical',
    title: 'Medical Record',
    icon: Ambulance
  },
  { segment: 'safety', label: 'Safety & Emergency', shortLabel: 'Safety', title: 'Safety & Emergency', icon: ShieldAlert },
  { segment: 'setup', label: 'Mission Setup', shortLabel: 'Setup', title: 'Mission Setup', icon: Settings2 },
  { segment: 'logs', label: 'Operating Record', shortLabel: 'Record', title: 'Operating Record', icon: FileClock }
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
  const medicalRecord = navItems.find((item) => item.label === 'Medical Record') ?? navItems[6];
  const operatingRecord = navItems.find((item) => item.label === 'Operating Record') ?? navItems[navItems.length - 1];
  return [navItems[0], navItems[1], medicalRecord, operatingRecord];
}

export function getDeliverableTitle(mode: MissionMode): string {
  return mode === 'template' ? 'Reusable Template Project' : 'Operational Swim Source of Truth';
}

export function getDeliverableBrand(mode: MissionMode): string {
  return mode === 'template' ? 'Endurance Swim OS' : 'Swim California';
}

export function getAlternateDeliverableLink(mode: MissionMode) {
  return mode === 'template'
    ? { to: '/', label: 'Open Live Project' }
    : { to: '/template', label: 'Open Template Project' };
}
