import {
  AlertTriangle,
  Ban,
  CalendarClock,
  Camera,
  ChevronDown,
  Clock3,
  ContactRound,
  HeartPulse,
  Pencil,
  Plus,
  Radio,
  RotateCcw,
  Save,
  ShieldAlert,
  Utensils,
  X
} from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { getMissionPath } from '../../app/missionNavigation';
import { roleLabels } from '../../state/seed';
import {
  formatClock,
  getActiveAlerts,
  getActiveCrew,
  getCrewLabel,
  getElapsedLabel,
  getMinutesUntil,
  getNextCriticalAction,
  getOperationalCadence,
  getRecentTimeline
} from '../../state/selectors';
import type { CrewRole, EmergencyKind, Mission, MissionStatus, QuickLogKind } from '../../state/types';
import { useMissionStore } from '../../state/useMissionStore';
import { useNow } from '../../lib/useNow';

type EditableSection = 'overview' | 'timeline' | 'crew' | 'feeding' | 'safety';

interface OverviewDraft {
  name: string;
  swimmerName: string;
  location: string;
  plannedDistance: string;
  plannedStartTime: string;
  status: MissionStatus;
}

interface TimelineDraft {
  id: string;
  label: string;
  at: string;
  ownerId: string;
  notes: string;
}

interface CrewDraft {
  id: string;
  name: string;
  role: CrewRole;
  phone: string;
  responsibilityText: string;
  backupPlan: string;
}

interface FeedDraft {
  id: string;
  label: string;
  calories: string;
  hydrationOz: string;
  electrolytesMg: string;
  notes: string;
  backup: boolean;
}

interface SafetyDraft {
  emergencyContactName: string;
  emergencyContactRole: string;
  emergencyContactPhone: string;
  emergencyContactChannel: string;
  tideWindow: string;
  weatherSource: string;
  abortConditionsText: string;
  medicalConcernsText: string;
}

const quickActions: Array<{
  kind: QuickLogKind;
  label: string;
}> = [
  { kind: 'feeding-completed', label: 'Feeding completed' },
  { kind: 'fatigue-observed', label: 'Fatigue observed' },
  { kind: 'weather-shift', label: 'Weather shift' },
  { kind: 'check-in-confirmed', label: 'Check-in confirmed' }
];

const emergencyActions: Array<{
  kind: EmergencyKind;
  label: string;
}> = [
  { kind: 'medical', label: 'Medical' },
  { kind: 'distress', label: 'Distress' },
  { kind: 'abort', label: 'Abort' }
];

const missionStatuses: MissionStatus[] = ['preparing', 'active', 'paused', 'completed', 'aborted'];
const crewRoles: CrewRole[] = ['captain', 'safety', 'medical', 'kayak-1', 'kayak-2', 'boat', 'media'];

const toDateTimeLocal = (isoTime: string) => {
  const date = new Date(isoTime);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

const fromDateTimeLocal = (value: string) => {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

const numberFromDraft = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const overviewDraftFromMission = (mission: Mission): OverviewDraft => ({
  name: mission.name,
  swimmerName: mission.session.swimmerName,
  location: mission.session.location,
  plannedDistance: mission.session.plannedDistance,
  plannedStartTime: mission.session.plannedStartTime,
  status: mission.status
});

const timelineDraftFromMission = (mission: Mission): TimelineDraft[] =>
  [...(mission.operationalTimeline ?? [])]
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
    .map((item) => ({
      id: item.id,
      label: item.label,
      at: toDateTimeLocal(item.at),
      ownerId: item.ownerId,
      notes: item.notes
    }));

const crewDraftFromMission = (mission: Mission): CrewDraft[] =>
  mission.crew.map((member) => ({
    id: member.id,
    name: member.name,
    role: member.role,
    phone: member.phone,
    responsibilityText: member.responsibilities.join('\n'),
    backupPlan: member.backupPlan ?? ''
  }));

const feedDraftFromMission = (mission: Mission): FeedDraft[] =>
  (mission.feedingPlan ?? []).map((item) => ({
    id: item.id,
    label: item.label,
    calories: String(item.calories),
    hydrationOz: String(item.hydrationOz),
    electrolytesMg: String(item.electrolytesMg),
    notes: item.notes,
    backup: item.backup
  }));

const safetyDraftFromMission = (mission: Mission): SafetyDraft => {
  const primaryContact = mission.contacts[0];
  return {
    emergencyContactName: primaryContact?.name ?? '',
    emergencyContactRole: primaryContact?.role ?? '',
    emergencyContactPhone: primaryContact?.phone ?? '',
    emergencyContactChannel: primaryContact?.channel ?? '',
    tideWindow: mission.riskPlan?.tideWindow ?? '',
    weatherSource: mission.riskPlan?.weatherSource ?? '',
    abortConditionsText: (mission.riskPlan?.abortConditions ?? []).join('\n'),
    medicalConcernsText: (mission.riskPlan?.medicalConcerns ?? []).join('\n')
  };
};

function formatUpdateTime(isoTime?: string) {
  return isoTime ? `Updated ${formatClock(isoTime)}` : 'Not edited this session';
}

export function MissionControl() {
  const now = useNow();
  const mission = useMissionStore((state) => state.mission);
  const activeActorId = useMissionStore((state) => state.activeActorId);
  const logQuickAction = useMissionStore((state) => state.logQuickAction);
  const openEmergencyProtocol = useMissionStore((state) => state.openEmergencyProtocol);
  const updateMissionOverview = useMissionStore((state) => state.updateMissionOverview);
  const resetMissionOverview = useMissionStore((state) => state.resetMissionOverview);
  const updateOperationalTimelineItemDetails = useMissionStore((state) => state.updateOperationalTimelineItemDetails);
  const resetOperationalTimeline = useMissionStore((state) => state.resetOperationalTimeline);
  const updateCrewMemberDetails = useMissionStore((state) => state.updateCrewMemberDetails);
  const resetCrew = useMissionStore((state) => state.resetCrew);
  const updateFeedingPlanItemDetails = useMissionStore((state) => state.updateFeedingPlanItemDetails);
  const updateFeedingInterval = useMissionStore((state) => state.updateFeedingInterval);
  const resetFeedingPlan = useMissionStore((state) => state.resetFeedingPlan);
  const updateSafetyPlan = useMissionStore((state) => state.updateSafetyPlan);
  const resetSafetyPlan = useMissionStore((state) => state.resetSafetyPlan);
  const criticalAction = getNextCriticalAction(mission, now);
  const activeCrew = getActiveCrew(mission, now);
  const activeAlerts = getActiveAlerts(mission);
  const recentTimeline = getRecentTimeline(mission, 5);
  const cadenceItems = getOperationalCadence(mission, now).slice(0, 5);
  const minutesToFeeding = getMinutesUntil(mission.nextFeedingAt, now);
  const nextTimelineItems = [...(mission.operationalTimeline ?? [])]
    .filter((item) => item.status !== 'done')
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
    .slice(0, 4);
  const primaryFeed = (mission.feedingPlan ?? []).find((item) => !item.backup) ?? mission.feedingPlan?.[0];
  const primaryContact = mission.contacts[0];
  const primaryAbortCriteria = mission.riskPlan?.abortConditions?.slice(0, 3) ?? [];

  const [editing, setEditing] = useState<EditableSection | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Partial<Record<EditableSection, string>>>({});
  const [overviewDraft, setOverviewDraft] = useState<OverviewDraft>(() => overviewDraftFromMission(mission));
  const [timelineDraft, setTimelineDraft] = useState<TimelineDraft[]>(() => timelineDraftFromMission(mission));
  const [crewDraft, setCrewDraft] = useState<CrewDraft[]>(() => crewDraftFromMission(mission));
  const [feedIntervalDraft, setFeedIntervalDraft] = useState(String(mission.feedingIntervalMinutes));
  const [feedDraft, setFeedDraft] = useState<FeedDraft[]>(() => feedDraftFromMission(mission));
  const [safetyDraft, setSafetyDraft] = useState<SafetyDraft>(() => safetyDraftFromMission(mission));

  const touch = (section: EditableSection) => {
    setLastUpdated((current) => ({ ...current, [section]: new Date().toISOString() }));
  };

  const beginEdit = (section: EditableSection) => {
    if (section === 'overview') {
      setOverviewDraft(overviewDraftFromMission(mission));
    }

    if (section === 'timeline') {
      setTimelineDraft(timelineDraftFromMission(mission));
    }

    if (section === 'crew') {
      setCrewDraft(crewDraftFromMission(mission));
    }

    if (section === 'feeding') {
      setFeedIntervalDraft(String(mission.feedingIntervalMinutes));
      setFeedDraft(feedDraftFromMission(mission));
    }

    if (section === 'safety') {
      setSafetyDraft(safetyDraftFromMission(mission));
    }

    setEditing(section);
  };

  const cancelEdit = () => setEditing(null);

  const saveOverview = () => {
    updateMissionOverview(overviewDraft);
    touch('overview');
    setEditing(null);
  };

  const saveTimeline = () => {
    timelineDraft.forEach((item) =>
      updateOperationalTimelineItemDetails(item.id, {
        label: item.label,
        at: fromDateTimeLocal(item.at),
        ownerId: item.ownerId,
        notes: item.notes
      })
    );
    touch('timeline');
    setEditing(null);
  };

  const saveCrew = () => {
    crewDraft.forEach((member) =>
      updateCrewMemberDetails(member.id, {
        name: member.name,
        phone: member.phone,
        role: member.role,
        responsibilityText: member.responsibilityText,
        backupPlan: member.backupPlan
      })
    );
    touch('crew');
    setEditing(null);
  };

  const saveFeeding = () => {
    updateFeedingInterval(numberFromDraft(feedIntervalDraft));
    feedDraft.forEach((item) =>
      updateFeedingPlanItemDetails(item.id, {
        label: item.label,
        calories: numberFromDraft(item.calories),
        hydrationOz: numberFromDraft(item.hydrationOz),
        electrolytesMg: numberFromDraft(item.electrolytesMg),
        notes: item.notes,
        backup: item.backup
      })
    );
    touch('feeding');
    setEditing(null);
  };

  const saveSafety = () => {
    updateSafetyPlan(safetyDraft);
    touch('safety');
    setEditing(null);
  };

  const resetSection = (section: EditableSection) => {
    if (section === 'overview') {
      resetMissionOverview();
    }

    if (section === 'timeline') {
      resetOperationalTimeline();
    }

    if (section === 'crew') {
      resetCrew();
    }

    if (section === 'feeding') {
      resetFeedingPlan();
    }

    if (section === 'safety') {
      resetSafetyPlan();
    }

    touch(section);
    setEditing(null);
  };

  const addCrewDraft = () => {
    setCrewDraft((current) => [
      ...current,
      {
        id: `crew-custom-${Date.now()}`,
        name: 'New crew member',
        role: 'safety',
        phone: '',
        responsibilityText: 'Confirm responsibility',
        backupPlan: 'Confirm backup owner during planning session.'
      }
    ]);
  };

  const addFeedDraft = () => {
    setFeedDraft((current) => [
      ...current,
      {
        id: `feed-custom-${Date.now()}`,
        label: 'New feed option',
        calories: '0',
        hydrationOz: '0',
        electrolytesMg: '0',
        notes: 'Add prep and handoff notes.',
        backup: true
      }
    ]);
  };

  return (
    <div className="page-grid mvp-dashboard">
      <section className={`panel critical-action span-12 ${criticalAction.severity}`} aria-labelledby="critical-action-title">
        <div>
          <p className="page-kicker">Right Now</p>
          <h3 className="critical-title" id="critical-action-title">
            {criticalAction.title}
          </h3>
        </div>
        <p className="critical-detail">{criticalAction.detail}</p>
        <div className="critical-meta">
          {criticalAction.dueAt ? <span className="sync-pill online">{formatClock(criticalAction.dueAt)}</span> : null}
          {criticalAction.intent === 'feeding' ? (
            <button className="button primary" type="button" onClick={() => logQuickAction('feeding-completed', activeActorId)}>
              <Utensils aria-hidden="true" />
              Log feeding
            </button>
          ) : null}
          {criticalAction.intent === 'timeline' ? (
            <Link className="button primary" to={getMissionPath(mission.mode, 'live-operations')}>
              <Clock3 aria-hidden="true" />
              Timeline
            </Link>
          ) : null}
          {criticalAction.intent === 'wowsa' ? (
            <Link className="button primary" to={getMissionPath(mission.mode, 'wowsa')}>
              <Camera aria-hidden="true" />
              Capture GPS photo
            </Link>
          ) : null}
          {criticalAction.intent === 'protocol' ? (
            <Link className="button danger" to={getMissionPath(mission.mode, 'safety')}>
              <ShieldAlert aria-hidden="true" />
              Protocol
            </Link>
          ) : null}
        </div>
      </section>

      {mission.mode === 'template' ? (
        <section className="panel span-12 template-onboarding" aria-labelledby="template-onboarding-title">
          <div className="panel-header">
            <div>
              <h3 className="panel-title" id="template-onboarding-title">
                Template Onboarding
              </h3>
              <p className="panel-subtitle">
                Replace every bracketed placeholder, assign real contacts, then duplicate into a live swim.
              </p>
            </div>
            <ShieldAlert aria-hidden="true" />
          </div>
        </section>
      ) : null}

      <EditableCard
        section="overview"
        title="Swim Overview"
        subtitle={`${mission.session.swimmerName} - ${mission.session.location}`}
        icon={<CalendarClock aria-hidden="true" />}
        editing={editing}
        lastUpdated={lastUpdated.overview}
        onEdit={() => beginEdit('overview')}
        onCancel={cancelEdit}
        onReset={() => resetSection('overview')}
        onSave={saveOverview}
      >
        {editing === 'overview' ? (
          <div className="edit-form-grid">
            <label className="field-label">
              Mission name
              <input className="input" value={overviewDraft.name} onChange={(event) => setOverviewDraft({ ...overviewDraft, name: event.target.value })} />
            </label>
            <label className="field-label">
              Swimmer
              <input className="input" value={overviewDraft.swimmerName} onChange={(event) => setOverviewDraft({ ...overviewDraft, swimmerName: event.target.value })} />
            </label>
            <label className="field-label">
              Location
              <input className="input" value={overviewDraft.location} onChange={(event) => setOverviewDraft({ ...overviewDraft, location: event.target.value })} />
            </label>
            <label className="field-label">
              Goal
              <input className="input" value={overviewDraft.plannedDistance} onChange={(event) => setOverviewDraft({ ...overviewDraft, plannedDistance: event.target.value })} />
            </label>
            <label className="field-label">
              Start
              <input className="input" value={overviewDraft.plannedStartTime} onChange={(event) => setOverviewDraft({ ...overviewDraft, plannedStartTime: event.target.value })} />
            </label>
            <label className="field-label">
              Status
              <select className="select" value={overviewDraft.status} onChange={(event) => setOverviewDraft({ ...overviewDraft, status: event.target.value as MissionStatus })}>
                {missionStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : (
          <div className="mvp-card-content">
            <MvpFact label="Date / time" value={mission.session.plannedStartTime} note={mission.name} />
            <MvpFact label="Location" value={mission.session.location} note={mission.position.label} />
            <MvpFact label="Goal" value={mission.session.plannedDistance} note={`Status: ${mission.status}`} />
            <MvpFact label="Now" value={getElapsedLabel(mission, now)} note={criticalAction.title} />
          </div>
        )}
      </EditableCard>

      <EditableCard
        section="timeline"
        title="Timeline"
        subtitle={`${nextTimelineItems.length} upcoming items`}
        icon={<Clock3 aria-hidden="true" />}
        editing={editing}
        lastUpdated={lastUpdated.timeline}
        onEdit={() => beginEdit('timeline')}
        onCancel={cancelEdit}
        onReset={() => resetSection('timeline')}
        onSave={saveTimeline}
      >
        {editing === 'timeline' ? (
          <div className="editable-list">
            {timelineDraft.map((item, index) => (
              <article className="edit-row-card" key={item.id}>
                <label className="field-label">
                  Item
                  <input
                    className="input"
                    value={item.label}
                    onChange={(event) =>
                      setTimelineDraft((current) => current.map((candidate, currentIndex) => (currentIndex === index ? { ...candidate, label: event.target.value } : candidate)))
                    }
                  />
                </label>
                <label className="field-label">
                  Time
                  <input
                    className="input"
                    type="datetime-local"
                    value={item.at}
                    onChange={(event) =>
                      setTimelineDraft((current) => current.map((candidate, currentIndex) => (currentIndex === index ? { ...candidate, at: event.target.value } : candidate)))
                    }
                  />
                </label>
                <label className="field-label">
                  Owner
                  <select
                    className="select"
                    value={item.ownerId}
                    onChange={(event) =>
                      setTimelineDraft((current) => current.map((candidate, currentIndex) => (currentIndex === index ? { ...candidate, ownerId: event.target.value } : candidate)))
                    }
                  >
                    {mission.crew.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-label span-fields">
                  Notes
                  <textarea
                    className="textarea"
                    value={item.notes}
                    onChange={(event) =>
                      setTimelineDraft((current) => current.map((candidate, currentIndex) => (currentIndex === index ? { ...candidate, notes: event.target.value } : candidate)))
                    }
                  />
                </label>
              </article>
            ))}
          </div>
        ) : (
          <ul className="mvp-list">
            {nextTimelineItems.length ? (
              nextTimelineItems.map((item) => (
                <li key={item.id}>
                  <span>{formatClock(item.at)}</span>
                  <strong>{item.label}</strong>
                  <small>{getCrewLabel(mission, item.ownerId)}</small>
                </li>
              ))
            ) : (
              <li>
                <span>Done</span>
                <strong>No upcoming timeline items</strong>
                <small>Ready for the next update</small>
              </li>
            )}
          </ul>
        )}
      </EditableCard>

      <EditableCard
        section="crew"
        title="Crew"
        subtitle={`${mission.crew.length} people - ${activeCrew.length} on duty`}
        icon={<ContactRound aria-hidden="true" />}
        editing={editing}
        lastUpdated={lastUpdated.crew}
        onEdit={() => beginEdit('crew')}
        onCancel={cancelEdit}
        onReset={() => resetSection('crew')}
        onSave={saveCrew}
      >
        {editing === 'crew' ? (
          <div className="editable-list">
            {crewDraft.map((member, index) => (
              <article className="edit-row-card" key={member.id}>
                <label className="field-label">
                  Name
                  <input
                    className="input"
                    value={member.name}
                    onChange={(event) =>
                      setCrewDraft((current) => current.map((candidate, currentIndex) => (currentIndex === index ? { ...candidate, name: event.target.value } : candidate)))
                    }
                  />
                </label>
                <label className="field-label">
                  Role
                  <select
                    className="select"
                    value={member.role}
                    onChange={(event) =>
                      setCrewDraft((current) => current.map((candidate, currentIndex) => (currentIndex === index ? { ...candidate, role: event.target.value as CrewRole } : candidate)))
                    }
                  >
                    {crewRoles.map((role) => (
                      <option key={role} value={role}>
                        {roleLabels[role]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-label">
                  Phone
                  <input
                    className="input"
                    value={member.phone}
                    onChange={(event) =>
                      setCrewDraft((current) => current.map((candidate, currentIndex) => (currentIndex === index ? { ...candidate, phone: event.target.value } : candidate)))
                    }
                  />
                </label>
                <label className="field-label">
                  Backup plan
                  <input
                    className="input"
                    value={member.backupPlan}
                    onChange={(event) =>
                      setCrewDraft((current) => current.map((candidate, currentIndex) => (currentIndex === index ? { ...candidate, backupPlan: event.target.value } : candidate)))
                    }
                  />
                </label>
                <label className="field-label span-fields">
                  Notes
                  <textarea
                    className="textarea"
                    value={member.responsibilityText}
                    onChange={(event) =>
                      setCrewDraft((current) => current.map((candidate, currentIndex) => (currentIndex === index ? { ...candidate, responsibilityText: event.target.value } : candidate)))
                    }
                  />
                </label>
              </article>
            ))}
            <button className="button" type="button" onClick={addCrewDraft}>
              <Plus aria-hidden="true" />
              Add crew
            </button>
          </div>
        ) : (
          <ul className="mvp-list">
            {mission.crew.slice(0, 5).map((member) => (
              <li key={member.id}>
                <span>{roleLabels[member.role]}</span>
                <strong>{member.name}</strong>
                <small>{member.phone || 'Phone pending'}</small>
              </li>
            ))}
          </ul>
        )}
      </EditableCard>

      <EditableCard
        section="feeding"
        title="Feed Plan"
        subtitle={`Every ${mission.feedingIntervalMinutes} min`}
        icon={<Utensils aria-hidden="true" />}
        editing={editing}
        lastUpdated={lastUpdated.feeding}
        onEdit={() => beginEdit('feeding')}
        onCancel={cancelEdit}
        onReset={() => resetSection('feeding')}
        onSave={saveFeeding}
      >
        {editing === 'feeding' ? (
          <div className="editable-list">
            <label className="field-label">
              Interval minutes
              <input className="input" type="number" min="5" max="180" value={feedIntervalDraft} onChange={(event) => setFeedIntervalDraft(event.target.value)} />
            </label>
            {feedDraft.map((item, index) => (
              <article className="edit-row-card" key={item.id}>
                <label className="field-label">
                  Item
                  <input
                    className="input"
                    value={item.label}
                    onChange={(event) =>
                      setFeedDraft((current) => current.map((candidate, currentIndex) => (currentIndex === index ? { ...candidate, label: event.target.value } : candidate)))
                    }
                  />
                </label>
                <label className="field-label">
                  Calories
                  <input
                    className="input"
                    type="number"
                    value={item.calories}
                    onChange={(event) =>
                      setFeedDraft((current) => current.map((candidate, currentIndex) => (currentIndex === index ? { ...candidate, calories: event.target.value } : candidate)))
                    }
                  />
                </label>
                <label className="field-label">
                  Hydration oz
                  <input
                    className="input"
                    type="number"
                    value={item.hydrationOz}
                    onChange={(event) =>
                      setFeedDraft((current) => current.map((candidate, currentIndex) => (currentIndex === index ? { ...candidate, hydrationOz: event.target.value } : candidate)))
                    }
                  />
                </label>
                <label className="field-label">
                  Sodium mg
                  <input
                    className="input"
                    type="number"
                    value={item.electrolytesMg}
                    onChange={(event) =>
                      setFeedDraft((current) => current.map((candidate, currentIndex) => (currentIndex === index ? { ...candidate, electrolytesMg: event.target.value } : candidate)))
                    }
                  />
                </label>
                <label className="checkbox-row span-fields">
                  <input
                    type="checkbox"
                    checked={item.backup}
                    onChange={(event) =>
                      setFeedDraft((current) => current.map((candidate, currentIndex) => (currentIndex === index ? { ...candidate, backup: event.target.checked } : candidate)))
                    }
                  />
                  Backup option
                </label>
                <label className="field-label span-fields">
                  Notes
                  <textarea
                    className="textarea"
                    value={item.notes}
                    onChange={(event) =>
                      setFeedDraft((current) => current.map((candidate, currentIndex) => (currentIndex === index ? { ...candidate, notes: event.target.value } : candidate)))
                    }
                  />
                </label>
              </article>
            ))}
            <button className="button" type="button" onClick={addFeedDraft}>
              <Plus aria-hidden="true" />
              Add feed
            </button>
          </div>
        ) : (
          <div className="mvp-card-content">
            <MvpFact label="Next feed" value={minutesToFeeding <= 0 ? 'Due now' : `${minutesToFeeding} min`} note={formatClock(mission.nextFeedingAt)} />
            <MvpFact label="Primary" value={primaryFeed?.label ?? 'Pending'} note={primaryFeed ? `${primaryFeed.calories} cal / ${primaryFeed.hydrationOz} oz` : 'Add feed item'} />
            <MvpFact label="Backups" value={`${(mission.feedingPlan ?? []).filter((item) => item.backup).length}`} note="Available alternates" />
          </div>
        )}
      </EditableCard>

      <EditableCard
        section="safety"
        title="Safety Plan"
        subtitle={primaryContact?.phone ?? 'Emergency contact pending'}
        icon={<ShieldAlert aria-hidden="true" />}
        editing={editing}
        lastUpdated={lastUpdated.safety}
        onEdit={() => beginEdit('safety')}
        onCancel={cancelEdit}
        onReset={() => resetSection('safety')}
        onSave={saveSafety}
      >
        {editing === 'safety' ? (
          <div className="edit-form-grid">
            <label className="field-label">
              Contact name
              <input className="input" value={safetyDraft.emergencyContactName} onChange={(event) => setSafetyDraft({ ...safetyDraft, emergencyContactName: event.target.value })} />
            </label>
            <label className="field-label">
              Contact role
              <input className="input" value={safetyDraft.emergencyContactRole} onChange={(event) => setSafetyDraft({ ...safetyDraft, emergencyContactRole: event.target.value })} />
            </label>
            <label className="field-label">
              Phone
              <input className="input" value={safetyDraft.emergencyContactPhone} onChange={(event) => setSafetyDraft({ ...safetyDraft, emergencyContactPhone: event.target.value })} />
            </label>
            <label className="field-label">
              Channel
              <input className="input" value={safetyDraft.emergencyContactChannel} onChange={(event) => setSafetyDraft({ ...safetyDraft, emergencyContactChannel: event.target.value })} />
            </label>
            <label className="field-label span-fields">
              Weather / tide
              <input className="input" value={safetyDraft.tideWindow} onChange={(event) => setSafetyDraft({ ...safetyDraft, tideWindow: event.target.value })} />
            </label>
            <label className="field-label span-fields">
              Weather source
              <input className="input" value={safetyDraft.weatherSource} onChange={(event) => setSafetyDraft({ ...safetyDraft, weatherSource: event.target.value })} />
            </label>
            <label className="field-label span-fields">
              Stop criteria
              <textarea className="textarea" value={safetyDraft.abortConditionsText} onChange={(event) => setSafetyDraft({ ...safetyDraft, abortConditionsText: event.target.value })} />
            </label>
            <label className="field-label span-fields">
              Risks
              <textarea className="textarea" value={safetyDraft.medicalConcernsText} onChange={(event) => setSafetyDraft({ ...safetyDraft, medicalConcernsText: event.target.value })} />
            </label>
          </div>
        ) : (
          <div className="mvp-card-content">
            <MvpFact label="Emergency" value={primaryContact?.name ?? 'Pending'} note={primaryContact ? `${primaryContact.phone} / ${primaryContact.channel}` : 'Add contact'} />
            <MvpFact label="Weather" value={mission.conditions.summary} note={mission.riskPlan?.tideWindow ?? 'Pending'} />
            <ul className="mvp-mini-list">
              {primaryAbortCriteria.map((condition) => (
                <li key={condition}>
                  <Ban aria-hidden="true" />
                  {condition}
                </li>
              ))}
            </ul>
            <div className="protocol-access">
              <div className="protocol-access-copy">
                <strong>Emergency Access</strong>
                <span>Trigger protocol from here</span>
              </div>
              <div className="protocol-button-grid">
              {emergencyActions.map((action) => (
                <Link className="protocol-button" key={action.kind} to={getMissionPath(mission.mode, 'safety')} onClick={() => openEmergencyProtocol(action.kind)}>
                  {action.label}
                </Link>
              ))}
              </div>
            </div>
          </div>
        )}
      </EditableCard>

      <details className="more-planning-details span-12">
        <summary>
          <span>More Planning Details</span>
          <ChevronDown aria-hidden="true" />
        </summary>
        <div className="more-planning-grid">
          <section className="panel compact">
            <div className="panel-header">
              <div>
                <h3 className="panel-title">Operational Cadence</h3>
                <p className="panel-subtitle">Next timed work.</p>
              </div>
              <Clock3 aria-hidden="true" />
            </div>
            <ul className="cadence-list">
              {cadenceItems.map((item) => (
                <li className={`cadence-row ${item.severity}`} key={item.id}>
                  <div>
                    <div className="row-title">{item.label}</div>
                    <div className="row-meta">{item.minutesUntil <= 0 ? `${Math.abs(item.minutesUntil)} min overdue` : `${item.minutesUntil} min`}</div>
                  </div>
                  <span className={`severity-pill ${item.severity === 'normal' ? 'info' : item.severity}`}>{formatClock(item.dueAt)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="panel compact">
            <div className="panel-header">
              <div>
                <h3 className="panel-title">Quick Notes</h3>
                <p className="panel-subtitle">Active actor: {getCrewLabel(mission, activeActorId)}</p>
              </div>
              <Radio aria-hidden="true" />
            </div>
            <div className="quick-grid">
              {quickActions.map((action) => (
                <button className="quick-button" key={action.kind} type="button" onClick={() => logQuickAction(action.kind, activeActorId)}>
                  {action.label}
                </button>
              ))}
            </div>
          </section>

          <section className="panel compact">
            <div className="panel-header">
              <div>
                <h3 className="panel-title">Active Alerts</h3>
                <p className="panel-subtitle">{activeAlerts.length ? `${activeAlerts.length} open` : 'Clear'}</p>
              </div>
              <AlertTriangle aria-hidden="true" />
            </div>
            {activeAlerts.length ? (
              <ul className="alert-list">
                {activeAlerts.map((alert) => (
                  <li className={`alert-row ${alert.severity}`} key={alert.id}>
                    <div className="row-title">{alert.title}</div>
                    <span className="alert-detail">{alert.detail}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state">No active alerts.</div>
            )}
          </section>

          <section className="panel compact">
            <div className="panel-header">
              <div>
                <h3 className="panel-title">Recent Updates</h3>
                <p className="panel-subtitle">Latest logged events.</p>
              </div>
              <HeartPulse aria-hidden="true" />
            </div>
            <ul className="timeline-list">
              {recentTimeline.map((event) => (
                <li className="timeline-item" key={event.id}>
                  <span className="timeline-time">{formatClock(event.at)}</span>
                  <div>
                    <div className="timeline-summary">{event.summary}</div>
                    <div className="timeline-detail">{event.detail}</div>
                  </div>
                  <span className={`severity-pill ${event.severity ?? 'info'}`}>{event.type}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </details>
    </div>
  );
}

interface EditableCardProps {
  section: EditableSection;
  title: string;
  subtitle: string;
  icon: ReactNode;
  editing: EditableSection | null;
  lastUpdated?: string;
  onEdit: () => void;
  onCancel: () => void;
  onReset: () => void;
  onSave: () => void;
  children: ReactNode;
}

function EditableCard({ section, title, subtitle, icon, editing, lastUpdated, onEdit, onCancel, onReset, onSave, children }: EditableCardProps) {
  const isEditing = editing === section;
  const disabled = editing !== null && !isEditing;

  return (
    <section className={`panel mvp-edit-card ${section === 'overview' ? 'span-12' : 'span-6'}`} aria-labelledby={`${section}-card-title`}>
      <div className="panel-header mvp-card-header">
        <div>
          <h3 className="panel-title" id={`${section}-card-title`}>
            {title}
          </h3>
          <p className="panel-subtitle">{subtitle}</p>
          <span className="row-meta">{formatUpdateTime(lastUpdated)}</span>
        </div>
        <div className="mvp-card-tools">
          {icon}
          {isEditing ? (
            <>
              <button className="button primary" type="button" onClick={onSave}>
                <Save aria-hidden="true" />
                Save
              </button>
              <button className="button" type="button" onClick={onCancel}>
                <X aria-hidden="true" />
                Cancel
              </button>
              <button className="button ghost" type="button" onClick={onReset}>
                <RotateCcw aria-hidden="true" />
                Reset
              </button>
            </>
          ) : (
            <button className="button" type="button" onClick={onEdit} disabled={disabled}>
              <Pencil aria-hidden="true" />
              Edit
            </button>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

function MvpFact({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="mvp-fact">
      <span className="metric-label">{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}
