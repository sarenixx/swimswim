import {
  AlertTriangle,
  Ambulance,
  Ban,
  CheckCircle2,
  Clock3,
  Compass,
  Droplets,
  Flag,
  HeartPulse,
  Radio,
  Route,
  ShieldCheck,
  Siren,
  Thermometer,
  Utensils
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { roleLabels } from '../../state/seed';
import {
  formatClock,
  formatRelative,
  getActiveAlerts,
  getActiveCrew,
  getActiveProtocol,
  getCrewLabel,
  getElapsedLabel,
  getMinutesUntil,
  getNextCriticalAction,
  getOperationalCadence,
  getReadinessGroups,
  getRecentTimeline
} from '../../state/selectors';
import type { EmergencyKind, QuickLogKind } from '../../state/types';
import { useMissionStore } from '../../state/useMissionStore';
import { useNow } from '../../lib/useNow';

const quickActions: Array<{
  kind: QuickLogKind;
  label: string;
  icon: typeof Utensils;
  tone?: 'warning';
}> = [
  { kind: 'feeding-completed', label: 'Feeding completed', icon: Utensils },
  { kind: 'fatigue-observed', label: 'Fatigue observed', icon: HeartPulse, tone: 'warning' },
  { kind: 'course-adjustment', label: 'Course adjustment', icon: Route },
  { kind: 'weather-shift', label: 'Weather shift', icon: Thermometer, tone: 'warning' },
  { kind: 'shift-handover', label: 'Shift handover', icon: Flag },
  { kind: 'check-in-confirmed', label: 'Check-in confirmed', icon: CheckCircle2 }
];

const emergencyActions: Array<{
  kind: EmergencyKind;
  label: string;
  icon: typeof Siren;
  tone: 'medical' | 'distress' | 'abort';
}> = [
  { kind: 'medical', label: 'Medical', icon: Ambulance, tone: 'medical' },
  { kind: 'distress', label: 'Distress', icon: Siren, tone: 'distress' },
  { kind: 'abort', label: 'Abort', icon: Ban, tone: 'abort' }
];

export function MissionControl() {
  const now = useNow();
  const mission = useMissionStore((state) => state.mission);
  const activeActorId = useMissionStore((state) => state.activeActorId);
  const logQuickAction = useMissionStore((state) => state.logQuickAction);
  const triggerEmergency = useMissionStore((state) => state.triggerEmergency);
  const acknowledgeAlert = useMissionStore((state) => state.acknowledgeAlert);
  const resolveAlert = useMissionStore((state) => state.resolveAlert);
  const criticalAction = getNextCriticalAction(mission, now);
  const activeAlerts = getActiveAlerts(mission);
  const activeCrew = getActiveCrew(mission, now);
  const recentTimeline = getRecentTimeline(mission, 6);
  const activeProtocol = getActiveProtocol(mission);
  const minutesToFeeding = getMinutesUntil(mission.nextFeedingAt, now);
  const latestCondition = mission.swimmerConditions[0];
  const readinessGroups = getReadinessGroups(mission, now);
  const cadenceItems = getOperationalCadence(mission, now).slice(0, 4);
  const checkpoints = mission.expeditionCheckpoints ?? [];
  const wowsaPhotos = mission.wowsaPhotos ?? [];

  return (
    <div className="page-grid">
      <section className={`panel critical-action span-12 ${criticalAction.severity}`} aria-labelledby="critical-action-title">
        <div>
          <p className="page-kicker">Next Critical Action</p>
          <h3 className="critical-title" id="critical-action-title">
            {criticalAction.title}
          </h3>
        </div>
        <p className="critical-detail">{criticalAction.detail}</p>
        <div className="critical-meta">
          {criticalAction.dueAt ? <span className="sync-pill online">{formatClock(criticalAction.dueAt)}</span> : null}
          <span className={`severity-pill ${criticalAction.severity === 'normal' ? 'info' : criticalAction.severity}`}>
            {criticalAction.actionLabel}
          </span>
          {criticalAction.intent === 'feeding' ? (
            <button className="button primary" type="button" onClick={() => logQuickAction('feeding-completed', activeActorId)}>
              <Utensils aria-hidden="true" />
              Log feeding
            </button>
          ) : null}
          {criticalAction.intent === 'protocol' ? (
            <Link className="button danger" to="/safety">
              <ShieldCheck aria-hidden="true" />
              Open protocol
            </Link>
          ) : null}
          {criticalAction.intent === 'alert' && criticalAction.alertId ? (
            <button className="button primary" type="button" onClick={() => acknowledgeAlert(criticalAction.alertId!)}>
              <CheckCircle2 aria-hidden="true" />
              Acknowledge
            </button>
          ) : null}
          {criticalAction.intent === 'checklist' ? (
            <Link className="button primary" to="/checklists">
              <CheckCircle2 aria-hidden="true" />
              Open checks
            </Link>
          ) : null}
          {criticalAction.intent === 'wowsa' ? (
            <Link className="button primary" to="/wowsa">
              <CheckCircle2 aria-hidden="true" />
              Open WOWSA
            </Link>
          ) : null}
        </div>
      </section>

      <section className="mission-emergency-strip span-12" aria-labelledby="emergency-access-title">
        <div>
          <p className="page-kicker">Emergency Access</p>
          <h3 className="panel-title" id="emergency-access-title">
            Trigger protocol from here
          </h3>
        </div>
        <div className="mission-emergency-actions">
          {emergencyActions.map((action) => (
            <button
              className={`emergency-button compact ${action.tone}`}
              key={action.kind}
              type="button"
              onClick={() => triggerEmergency(action.kind, activeActorId)}
            >
              <action.icon aria-hidden="true" />
              {action.label}
            </button>
          ))}
        </div>
        <Link className="button ghost" to="/safety">
          <ShieldCheck aria-hidden="true" />
          Protocols
        </Link>
      </section>

      <section className="panel span-12" aria-labelledby="readiness-title">
        <div className="panel-header">
          <div>
            <h3 className="panel-title" id="readiness-title">
              Today’s Readiness
            </h3>
            <p className="panel-subtitle">
              {mission.session.swimmerName} · {mission.session.location} · {mission.session.plannedDistance}
            </p>
          </div>
          <Link className="button" to="/checklists">
            Open checks
          </Link>
        </div>
        <div className="readiness-grid">
          {readinessGroups.map((group) => (
            <article className={`readiness-card ${group.status}`} key={group.domain}>
              <div className="readiness-head">
                <strong>{group.label}</strong>
                <span className={group.status === 'ready' ? 'status-pill done' : group.status === 'attention' ? 'status-pill overdue' : 'status-pill pending'}>
                  {group.done}/{group.total}
                </span>
              </div>
              <div className="progress-track" aria-label={`${group.label} ${group.percent}% complete`}>
                <div className="progress-fill" style={{ width: `${group.percent}%` }} />
              </div>
              <span className="row-meta">
                {group.overdue ? `${group.overdue} overdue` : group.open ? `${group.open} open` : 'ready'}
              </span>
            </article>
          ))}
        </div>
      </section>

      <section className="panel span-8" aria-labelledby="mission-state-title">
        <div className="panel-header">
          <div>
            <h3 className="panel-title" id="mission-state-title">
              Swim Status
            </h3>
            <p className="panel-subtitle">{mission.position.label}</p>
          </div>
          <span className={`status-pill ${mission.status}`}>{mission.status}</span>
        </div>
        <div className="metric-grid">
          <div className="metric">
            <span className="metric-label">Elapsed</span>
            <span className="metric-value">{getElapsedLabel(mission, now)}</span>
            <span className="metric-note">Started {formatClock(mission.startedAt)}</span>
          </div>
          <div className="metric">
            <span className="metric-label">Next Feeding</span>
            <span className="metric-value">{minutesToFeeding <= 0 ? 'Due now' : `${minutesToFeeding} min`}</span>
            <span className="metric-note">Scheduled {formatClock(mission.nextFeedingAt)}</span>
          </div>
          <div className="metric">
            <span className="metric-label">Last Feeding</span>
            <span className="metric-value">{formatRelative(mission.lastFeedingAt)}</span>
            <span className="metric-note">{formatClock(mission.lastFeedingAt)}</span>
          </div>
          <div className="metric">
            <span className="metric-label">Swimmer</span>
            <span className="metric-value">{latestCondition.level}</span>
            <span className="metric-note">{latestCondition.note}</span>
          </div>
          <div className="metric">
            <span className="metric-label">GPS Track</span>
            <span className="metric-value">{checkpoints.length}</span>
            <span className="metric-note">route checkpoints</span>
          </div>
          <div className="metric">
            <span className="metric-label">WOWSA Evidence</span>
            <span className="metric-value">{wowsaPhotos.filter((photo) => photo.evidenceStatus === 'ready').length}/{wowsaPhotos.length}</span>
            <span className="metric-note">image + GPS records</span>
          </div>
        </div>
      </section>

      <section className="panel span-4" aria-labelledby="conditions-title">
        <div className="panel-header">
          <div>
            <h3 className="panel-title" id="conditions-title">
              Live Conditions
            </h3>
            <p className="panel-subtitle">{mission.conditions.summary}</p>
          </div>
          <Droplets aria-hidden="true" />
        </div>
        <div className="metric-grid">
          <div className="metric">
            <span className="metric-label">Water</span>
            <span className="metric-value">{mission.conditions.waterTempF} F</span>
          </div>
          <div className="metric">
            <span className="metric-label">Wind</span>
            <span className="metric-value">{mission.conditions.windKts} kt</span>
          </div>
          <div className="metric">
            <span className="metric-label">Current</span>
            <span className="metric-value">{mission.conditions.currentKts} kt</span>
          </div>
          <div className="metric">
            <span className="metric-label">Swell</span>
            <span className="metric-value">{mission.conditions.swellFt} ft</span>
          </div>
        </div>
      </section>

      <section className="panel span-12" aria-labelledby="cadence-title">
        <div className="panel-header">
          <div>
            <h3 className="panel-title" id="cadence-title">
              Operational Cadence
            </h3>
            <p className="panel-subtitle">Feeding, certification photos, check-ins, and condition scans.</p>
          </div>
          <Link className="button" to="/live-operations">
            Swim tracker
          </Link>
        </div>
        <ul className="cadence-list">
          {cadenceItems.map((item) => (
            <li className={`cadence-row ${item.severity}`} key={item.id}>
              <div>
                <div className="row-title">{item.label}</div>
                <div className="row-meta">
                  {item.detail} · {item.minutesUntil <= 0 ? `${Math.abs(item.minutesUntil)} min overdue` : `${item.minutesUntil} min`}
                </div>
              </div>
              <span className={`severity-pill ${item.severity === 'normal' ? 'info' : item.severity}`}>{formatClock(item.dueAt)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel span-7" aria-labelledby="quick-log-title">
        <div className="panel-header">
          <div>
            <h3 className="panel-title" id="quick-log-title">
              Quick Log
            </h3>
            <p className="panel-subtitle">Active actor: {getCrewLabel(mission, activeActorId)}</p>
          </div>
          <Clock3 aria-hidden="true" />
        </div>
        <div className="quick-grid">
          {quickActions.map((action) => (
            <button
              className={action.tone ? `quick-button ${action.tone}` : 'quick-button'}
              key={action.kind}
              type="button"
              onClick={() => logQuickAction(action.kind, activeActorId)}
            >
              <action.icon aria-hidden="true" />
              {action.label}
            </button>
          ))}
        </div>
      </section>

      <section className="panel span-5" aria-labelledby="alerts-title">
        <div className="panel-header">
          <div>
            <h3 className="panel-title" id="alerts-title">
              Active Alerts
            </h3>
            <p className="panel-subtitle">{activeAlerts.length ? `${activeAlerts.length} needs attention` : 'No active alerts'}</p>
          </div>
          <AlertTriangle aria-hidden="true" />
        </div>
        {activeAlerts.length ? (
          <ul className="alert-list">
            {activeAlerts.map((alert) => (
              <li className={`alert-row ${alert.severity}`} key={alert.id}>
                <div className="split-row">
                  <strong>{alert.title}</strong>
                  <span className={`severity-pill ${alert.severity}`}>{alert.severity}</span>
                </div>
                <span className="alert-detail">{alert.detail}</span>
                <div className="alert-actions">
                  <button className="button" type="button" onClick={() => acknowledgeAlert(alert.id)}>
                    Acknowledge
                  </button>
                  <button className="button ghost" type="button" onClick={() => resolveAlert(alert.id)}>
                    Resolve
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-state">All safety flags clear.</div>
        )}
      </section>

      {activeProtocol ? (
        <section className="panel span-12" aria-labelledby="pinned-protocol-title">
          <div className="panel-header">
            <div>
              <h3 className="panel-title" id="pinned-protocol-title">
                {activeProtocol.title}
              </h3>
              <p className="panel-subtitle">Pinned for the active emergency state.</p>
            </div>
            <ShieldCheck aria-hidden="true" />
          </div>
          <ol className="protocol-list">
            {activeProtocol.steps.map((step) => (
              <li className="protocol-step" key={step.id}>
                <span className="protocol-index">{step.order}</span>
                <div>
                  <div className="row-title">{step.label}</div>
                  <div className="protocol-owner">{roleLabels[step.ownerRole]}</div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <section className="panel span-5" aria-labelledby="crew-title">
        <div className="panel-header">
          <div>
            <h3 className="panel-title" id="crew-title">
              Team On Duty
            </h3>
            <p className="panel-subtitle">{activeCrew.length} roles currently active</p>
          </div>
          <Radio aria-hidden="true" />
        </div>
        <ul className="row-list">
          {activeCrew.map((member) => (
            <li className="list-row" key={member.id}>
              <div className="split-row">
                <span className="row-title">{member.name}</span>
                <span className="role-pill">{roleLabels[member.role]}</span>
              </div>
              <span className="row-meta">
                {formatClock(member.shiftStart)} to {formatClock(member.shiftEnd)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel span-7" aria-labelledby="timeline-title">
        <div className="panel-header">
          <div>
            <h3 className="panel-title" id="timeline-title">
              Recent Timeline
            </h3>
            <p className="panel-subtitle">Newest operational events first.</p>
          </div>
          <Compass aria-hidden="true" />
        </div>
        <ul className="timeline-list">
          {recentTimeline.map((event) => (
            <li className="timeline-item" key={event.id}>
              <span className="timeline-time">{formatClock(event.at)}</span>
              <div>
                <div className="timeline-summary">{event.summary}</div>
                <div className="timeline-detail">
                  {event.detail} · {getCrewLabel(mission, event.actorId)}
                </div>
              </div>
              <span className={`severity-pill ${event.severity ?? 'info'}`}>{event.type}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
