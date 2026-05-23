import { addMinutes, differenceInMinutes, format, formatDistanceToNowStrict } from 'date-fns';
import { emergencyLabels, roleLabels } from './seed';
import type {
  Alert,
  ChecklistCategory,
  ChecklistItem,
  CrewMember,
  EmergencyKind,
  Mission,
  OperationalTimelineItem,
  Severity,
  TimelineEvent
} from './types';

export interface CriticalAction {
  title: string;
  detail: string;
  severity: Exclude<Severity, 'info'> | 'normal';
  dueAt?: string;
  actionLabel: string;
  intent: 'feeding' | 'protocol' | 'alert' | 'checklist' | 'timeline' | 'wowsa' | 'monitor';
  alertId?: string;
  checklistItemId?: string;
}

export type ReadinessDomain = 'packing' | 'nutrition' | 'safety' | 'medical' | 'crew' | 'evidence';

export interface ReadinessGroup {
  domain: ReadinessDomain;
  label: string;
  done: number;
  total: number;
  open: number;
  overdue: number;
  percent: number;
  status: 'ready' | 'attention' | 'pending';
}

export interface CadenceItem {
  id: string;
  label: string;
  detail: string;
  dueAt: string;
  minutesUntil: number;
  severity: 'normal' | 'warning' | 'critical';
  action: 'feeding' | 'check-in' | 'condition' | 'checklist' | 'timeline';
  checklistItemId?: string;
  timelineItemId?: string;
}

export const readinessDomainLabels: Record<ReadinessDomain, string> = {
  packing: 'Packing',
  nutrition: 'Nutrition',
  safety: 'Safety',
  medical: 'Medical',
  crew: 'Crew',
  evidence: 'Docs / Evidence'
};

export function getCrewMember(mission: Mission, crewId: string): CrewMember | undefined {
  return mission.crew.find((member) => member.id === crewId);
}

export function getCrewLabel(mission: Mission, crewId: string): string {
  const crew = getCrewMember(mission, crewId);
  return crew ? `${crew.name} · ${roleLabels[crew.role]}` : 'Unassigned';
}

export function getActiveCrew(mission: Mission, now = new Date()): CrewMember[] {
  return mission.crew.filter((member) => {
    const start = new Date(member.shiftStart).getTime();
    const end = new Date(member.shiftEnd).getTime();
    const current = now.getTime();
    return current >= start && current <= end;
  });
}

export function getActiveAlerts(mission: Mission): Alert[] {
  return mission.alerts
    .filter((alert) => alert.status !== 'resolved')
    .sort((a, b) => {
      if (a.severity !== b.severity) {
        return a.severity === 'critical' ? -1 : 1;
      }

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
}

export function getRecentTimeline(mission: Mission, count = 5): TimelineEvent[] {
  return [...mission.timeline]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, count);
}

export function getChecklistStatus(item: ChecklistItem, now = new Date()): ChecklistItem['status'] {
  if (item.completedAt) {
    return 'done';
  }

  if (item.dueAt && new Date(item.dueAt).getTime() < now.getTime()) {
    return 'overdue';
  }

  return item.status;
}

export function getOperationalTimelineStatus(item: OperationalTimelineItem, now = new Date()): 'pending' | 'done' | 'overdue' {
  if (item.status === 'done' || item.completedAt) {
    return 'done';
  }

  if (new Date(item.at).getTime() < now.getTime()) {
    return 'overdue';
  }

  return 'pending';
}

export function getOverdueChecklistItems(mission: Mission, now = new Date()): ChecklistItem[] {
  return mission.checklistItems.filter((item) => getChecklistStatus(item, now) === 'overdue');
}

export function getChecklistDomain(item: ChecklistItem): ReadinessDomain {
  const text = `${item.id} ${item.title} ${item.ownerId}`.toLowerCase();

  if (
    text.includes('nutrition') ||
    text.includes('feeding') ||
    text.includes('hydration') ||
    text.includes('bottle') ||
    text.includes('electrolyte')
  ) {
    return 'nutrition';
  }

  if (
    text.includes('packed') ||
    text.includes('gear') ||
    text.includes('electronics') ||
    text.includes('supplies') ||
    text.includes('crate') ||
    text.includes('dry bag')
  ) {
    return 'packing';
  }

  if (
    text.includes('document') ||
    text.includes('permit') ||
    text.includes('float plan') ||
    text.includes('observer') ||
    text.includes('wowsa') ||
    text.includes('photo') ||
    text.includes('media')
  ) {
    return 'evidence';
  }

  if (text.includes('medical') || text.includes('recovery') || text.includes('condition scan') || item.ownerId === 'crew-medical') {
    return 'medical';
  }

  if (
    text.includes('safety') ||
    text.includes('boat') ||
    text.includes('vhf') ||
    text.includes('gps/chart') ||
    text.includes('pfd') ||
    text.includes('fuel') ||
    text.includes('forecast') ||
    text.includes('vessel') ||
    text.includes('abort') ||
    text.includes('wildlife') ||
    text.includes('water temperature') ||
    item.ownerId === 'crew-boat'
  ) {
    return 'safety';
  }

  if (
    item.category === 'mental-health' ||
    text.includes('wellness') ||
    text.includes('mental') ||
    text.includes('check-in') ||
    text.includes('rotation') ||
    item.ownerId === 'crew-captain' ||
    item.ownerId === 'crew-safety'
  ) {
    return 'crew';
  }

  return 'safety';
}

export function getReadinessGroups(mission: Mission, now = new Date()): ReadinessGroup[] {
  const domains = Object.keys(readinessDomainLabels) as ReadinessDomain[];
  return domains.map((domain) => {
    const items = mission.checklistItems.filter((item) => getChecklistDomain(item) === domain);
    const done = items.filter((item) => getChecklistStatus(item, now) === 'done').length;
    const overdue = items.filter((item) => getChecklistStatus(item, now) === 'overdue').length;
    const total = items.length;
    const percent = total ? Math.round((done / total) * 100) : 100;

    return {
      domain,
      label: readinessDomainLabels[domain],
      done,
      total,
      open: total - done,
      overdue,
      percent,
      status: overdue ? 'attention' : done === total ? 'ready' : 'pending'
    };
  });
}

export function getCategoryProgress(mission: Mission, category: ChecklistCategory, now = new Date()) {
  const items = mission.checklistItems.filter((item) => item.category === category);
  const done = items.filter((item) => getChecklistStatus(item, now) === 'done').length;
  return {
    done,
    total: items.length,
    percent: items.length ? Math.round((done / items.length) * 100) : 100
  };
}

export function getMinutesUntil(isoTime: string, now = new Date()): number {
  return Math.ceil((new Date(isoTime).getTime() - now.getTime()) / 60000);
}

export function formatClock(isoTime: string): string {
  return format(new Date(isoTime), 'HH:mm');
}

export function formatRelative(isoTime: string): string {
  return formatDistanceToNowStrict(new Date(isoTime), { addSuffix: true });
}

export function getElapsedLabel(mission: Mission, now = new Date()): string {
  const minutes = Math.max(0, differenceInMinutes(now, new Date(mission.startedAt)));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours}h ${remainder}m`;
}

export function getActiveProtocol(mission: Mission) {
  return mission.activeProtocolKind
    ? mission.protocols.find((protocol) => protocol.kind === mission.activeProtocolKind)
    : undefined;
}

export function getProtocolForKind(mission: Mission, kind: EmergencyKind) {
  return mission.protocols.find((protocol) => protocol.kind === kind);
}

export function getWowsaNextDueAt(mission: Mission): string {
  const latestPhoto = [...(mission.wowsaPhotos ?? [])].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())[0];
  return addMinutes(new Date(latestPhoto?.at ?? mission.startedAt), mission.wowsaPhotoIntervalMinutes ?? 30).toISOString();
}

export function getOperationalCadence(mission: Mission, now = new Date()): CadenceItem[] {
  const checklistCadence = mission.checklistItems
    .filter((item) => item.dueAt && getChecklistStatus(item, now) !== 'done')
    .map<CadenceItem>((item) => {
      const minutesUntil = getMinutesUntil(item.dueAt!, now);
      return {
        id: item.id,
        label: item.title,
        detail: getCrewLabel(mission, item.ownerId),
        dueAt: item.dueAt!,
        minutesUntil,
        severity: minutesUntil <= 0 ? 'critical' : minutesUntil <= 5 ? 'warning' : 'normal',
        action: item.id.includes('check') ? 'check-in' : item.id.includes('condition') ? 'condition' : 'checklist',
        checklistItemId: item.id
      };
    });

  const feedingMinutes = getMinutesUntil(mission.nextFeedingAt, now);
  const timelineCadence = (mission.operationalTimeline ?? [])
    .filter((item) => getOperationalTimelineStatus(item, now) !== 'done')
    .map<CadenceItem>((item) => {
      const minutesUntil = getMinutesUntil(item.at, now);
      return {
        id: `timeline-${item.id}`,
        label: item.label,
        detail: `${getCrewLabel(mission, item.ownerId)} · ${item.notes}`,
        dueAt: item.at,
        minutesUntil,
        severity: minutesUntil <= 0 ? 'critical' : minutesUntil <= 10 ? 'warning' : 'normal',
        action: 'timeline',
        timelineItemId: item.id
      };
    });
  const cadence: CadenceItem[] = [
    {
      id: 'cadence-feeding',
      label: 'Feeding window',
      detail: 'Kayak team confirms calories, hydration, electrolytes, and swimmer response.',
      dueAt: mission.nextFeedingAt,
      minutesUntil: feedingMinutes,
      severity: feedingMinutes <= 0 ? 'critical' : feedingMinutes <= 5 ? 'warning' : 'normal',
      action: 'feeding'
    },
    ...timelineCadence,
    ...checklistCadence
  ];

  return cadence.sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
}

export function getNextCriticalAction(mission: Mission, now = new Date()): CriticalAction {
  const activeAlerts = getActiveAlerts(mission);
  const criticalAlert = activeAlerts.find((alert) => alert.severity === 'critical');
  const cadenceItems = getOperationalCadence(mission, now);
  const wowsaDueAt = getWowsaNextDueAt(mission);
  const wowsaMinutes = getMinutesUntil(wowsaDueAt, now);

  if (!criticalAlert || !['medical', 'distress', 'abort'].includes(criticalAlert.kind)) {
    return {
      title: 'Take WOWSA GPS evidence photo',
      detail: 'Capture photo evidence with GPS, timestamp, and distance note.',
      severity: wowsaMinutes <= 0 ? 'critical' : wowsaMinutes <= 10 ? 'warning' : 'normal',
      dueAt: wowsaDueAt,
      actionLabel: 'Take WOWSA photo',
      intent: 'wowsa'
    };
  }

  if (criticalAlert) {
    return {
      title: criticalAlert.title,
      detail: criticalAlert.detail,
      severity: 'critical',
      dueAt: criticalAlert.createdAt,
      actionLabel:
        criticalAlert.kind === 'medical' || criticalAlert.kind === 'distress' || criticalAlert.kind === 'abort'
          ? `${emergencyLabels[criticalAlert.kind]} protocol`
          : 'Resolve alert',
      intent:
        criticalAlert.kind === 'medical' || criticalAlert.kind === 'distress' || criticalAlert.kind === 'abort'
          ? 'protocol'
          : 'alert',
      alertId: criticalAlert.id
    };
  }

  const criticalCadence = cadenceItems.find((item) => item.severity === 'critical');
  if (criticalCadence) {
    return {
      title:
        criticalCadence.action === 'feeding'
          ? 'Feeding overdue'
          : `${criticalCadence.label} overdue`,
      detail: criticalCadence.detail,
      severity: 'critical',
      dueAt: criticalCadence.dueAt,
      actionLabel: criticalCadence.action === 'feeding' ? 'Log feeding' : 'Complete',
      intent: criticalCadence.action === 'feeding' ? 'feeding' : criticalCadence.action === 'timeline' ? 'timeline' : 'checklist',
      checklistItemId: criticalCadence.checklistItemId
    };
  }

  const warningAlert = activeAlerts.find((alert) => alert.severity === 'warning');
  if (warningAlert) {
    return {
      title: warningAlert.title,
      detail: warningAlert.detail,
      severity: 'warning',
      dueAt: warningAlert.createdAt,
      actionLabel: 'Acknowledge',
      intent: 'alert',
      alertId: warningAlert.id
    };
  }

  const warningCadence = cadenceItems.find((item) => item.severity === 'warning');
  if (warningCadence) {
    return {
      title:
        warningCadence.action === 'feeding'
          ? `Feeding in ${warningCadence.minutesUntil} min`
          : warningCadence.label,
      detail: warningCadence.detail,
      severity: 'warning',
      dueAt: warningCadence.dueAt,
      actionLabel: warningCadence.action === 'feeding' ? 'Log feeding' : 'Complete',
      intent: warningCadence.action === 'feeding' ? 'feeding' : warningCadence.action === 'timeline' ? 'timeline' : 'checklist',
      checklistItemId: warningCadence.checklistItemId
    };
  }

  const overdueItem = getOverdueChecklistItems(mission, now)[0];
  if (overdueItem) {
    return {
      title: 'Checklist item overdue',
      detail: overdueItem.title,
      severity: 'warning',
      dueAt: overdueItem.dueAt,
      actionLabel: 'Complete item',
      intent: 'checklist',
      checklistItemId: overdueItem.id
    };
  }

  return {
    title: 'Mission stable',
    detail: `Next feeding is scheduled at ${formatClock(mission.nextFeedingAt)}.`,
    severity: 'normal',
    dueAt: mission.nextFeedingAt,
    actionLabel: 'Monitor',
    intent: 'monitor'
  };
}
