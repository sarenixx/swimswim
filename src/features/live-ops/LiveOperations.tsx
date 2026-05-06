import { Activity, Camera, CheckCircle2, Clock3, HeartPulse, MapPin, RadioTower, Utensils } from 'lucide-react';
import { useMemo, useState } from 'react';
import { getDevicePosition } from '../../lib/gps';
import { roleLabels } from '../../state/seed';
import { formatClock, getCrewLabel, getMinutesUntil, getOperationalCadence, type CadenceItem } from '../../state/selectors';
import type { SwimmerConditionLevel, TimelineEventType } from '../../state/types';
import { useMissionStore } from '../../state/useMissionStore';
import { useNow } from '../../lib/useNow';

const eventFilters: Array<TimelineEventType | 'all'> = [
  'all',
  'feeding',
  'condition',
  'shift',
  'weather',
  'course',
  'check-in',
  'gps',
  'emergency',
  'note'
];

const conditionLevels: Array<{ level: SwimmerConditionLevel; label: string }> = [
  { level: 'steady', label: 'Steady' },
  { level: 'watch', label: 'Watch' },
  { level: 'fatigue', label: 'Fatigue' },
  { level: 'distress', label: 'Distress' }
];

export function LiveOperations() {
  const now = useNow();
  const [filter, setFilter] = useState<TimelineEventType | 'all'>('all');
  const [conditionLevel, setConditionLevel] = useState<SwimmerConditionLevel>('steady');
  const [conditionNote, setConditionNote] = useState('Stroke cadence stable. Clear verbal response.');
  const [checkpointNote, setCheckpointNote] = useState('Route checkpoint logged from support crew device.');
  const [gpsStatus, setGpsStatus] = useState('');
  const mission = useMissionStore((state) => state.mission);
  const activeActorId = useMissionStore((state) => state.activeActorId);
  const logQuickAction = useMissionStore((state) => state.logQuickAction);
  const updateSwimmerCondition = useMissionStore((state) => state.updateSwimmerCondition);
  const completeChecklistItem = useMissionStore((state) => state.completeChecklistItem);
  const addWowsaPhoto = useMissionStore((state) => state.addWowsaPhoto);
  const addExpeditionCheckpoint = useMissionStore((state) => state.addExpeditionCheckpoint);

  const filteredTimeline = useMemo(() => {
    return [...mission.timeline]
      .filter((event) => filter === 'all' || event.type === filter)
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [filter, mission.timeline]);

  const minutesToFeeding = getMinutesUntil(mission.nextFeedingAt, now);
  const latestCondition = mission.swimmerConditions[0];
  const cadenceItems = getOperationalCadence(mission, now).slice(0, 6);

  const handleCadenceAction = (item: CadenceItem) => {
    if (item.action === 'feeding') {
      logQuickAction('feeding-completed', activeActorId);
      return;
    }

    if (item.action === 'wowsa') {
      addWowsaPhoto({
        gps: mission.position.label,
        distanceSwum: '',
        notes: 'Logged from Live Operations cadence.',
        hasPhoto: false,
        actorId: activeActorId
      });
      return;
    }

    if (item.action === 'check-in') {
      logQuickAction('check-in-confirmed', activeActorId);
    }

    if (item.checklistItemId) {
      completeChecklistItem(item.checklistItemId, activeActorId);
    }
  };

  const captureCheckpoint = async () => {
    setGpsStatus('Capturing GPS...');
    try {
      const position = await getDevicePosition();
      addExpeditionCheckpoint({
        lat: position.lat,
        lon: position.lon,
        gps: position.label,
        accuracyM: position.accuracyM,
        label: 'Expedition GPS checkpoint',
        note: checkpointNote,
        actorId: activeActorId
      });
      setGpsStatus(`GPS logged ${position.accuracyM ? `±${Math.round(position.accuracyM)}m` : ''}`);
    } catch (error) {
      setGpsStatus(error instanceof Error ? error.message : 'GPS capture failed.');
    }
  };
  const checkpoints = mission.expeditionCheckpoints ?? [];

  return (
    <div className="page-grid">
      <section className="panel span-12">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Expedition Track</h3>
            <p className="panel-subtitle">{checkpoints.length} GPS checkpoints captured.</p>
          </div>
          <MapPin aria-hidden="true" />
        </div>
        <div className="metric-grid">
          <div className="metric">
            <span className="metric-label">Current GPS</span>
            <span className="metric-value">{mission.position.label}</span>
            <span className="metric-note">Updated {formatClock(mission.position.updatedAt)}</span>
          </div>
          <div className="metric">
            <span className="metric-label">Start</span>
            <span className="metric-value">{mission.session.gpsStart || '-'}</span>
            <span className="metric-note">{mission.session.plannedStartTime}</span>
          </div>
          <div className="metric">
            <span className="metric-label">Target End</span>
            <span className="metric-value">{mission.session.gpsEnd || '-'}</span>
            <span className="metric-note">{mission.session.plannedDistance}</span>
          </div>
        </div>
        <label className="field-label" style={{ marginTop: 12 }}>
          Checkpoint note
          <input className="input" value={checkpointNote} onChange={(event) => setCheckpointNote(event.target.value)} />
        </label>
        <div className="row-actions" style={{ marginTop: 12 }}>
          <button className="button primary" type="button" onClick={captureCheckpoint}>
            <MapPin aria-hidden="true" />
            Capture GPS checkpoint
          </button>
          {gpsStatus ? <span className="row-meta">{gpsStatus}</span> : null}
        </div>
        {checkpoints.length ? (
          <ul className="timeline-list" style={{ marginTop: 16 }}>
            {checkpoints.slice(0, 4).map((checkpoint) => (
              <li className="timeline-item" key={checkpoint.id}>
                <span className="timeline-time">{formatClock(checkpoint.at)}</span>
                <div>
                  <div className="timeline-summary">{checkpoint.label}</div>
                  <div className="timeline-detail">
                    {checkpoint.gps} {checkpoint.accuracyM ? `· ±${Math.round(checkpoint.accuracyM)}m` : ''} · {checkpoint.note}
                  </div>
                </div>
                <span className="severity-pill info">gps</span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="panel span-12">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Operational Cadence</h3>
            <p className="panel-subtitle">Timed work from the command center, oldest due item first.</p>
          </div>
          <Clock3 aria-hidden="true" />
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
              <div className="row-actions">
                <span className={`severity-pill ${item.severity === 'normal' ? 'info' : item.severity}`}>{formatClock(item.dueAt)}</span>
                <button className="button" type="button" onClick={() => handleCadenceAction(item)}>
                  {item.action === 'wowsa' ? <Camera aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
                  {item.action === 'wowsa' ? 'Photo logged' : 'Complete'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel span-5">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Feeding Window</h3>
            <p className="panel-subtitle">Interval: {mission.feedingIntervalMinutes} minutes</p>
          </div>
          <Utensils aria-hidden="true" />
        </div>
        <div className="metric-grid">
          <div className="metric">
            <span className="metric-label">Next</span>
            <span className="metric-value">{minutesToFeeding <= 0 ? 'Due now' : `${minutesToFeeding} min`}</span>
            <span className="metric-note">{formatClock(mission.nextFeedingAt)}</span>
          </div>
          <div className="metric">
            <span className="metric-label">Last</span>
            <span className="metric-value">{formatClock(mission.lastFeedingAt)}</span>
            <span className="metric-note">Logged feeding event</span>
          </div>
        </div>
        <div className="row-actions" style={{ marginTop: 16 }}>
          <button className="button primary" type="button" onClick={() => logQuickAction('feeding-completed', activeActorId)}>
            <CheckCircle2 aria-hidden="true" />
            Feeding completed
          </button>
          <button className="button" type="button" onClick={() => logQuickAction('check-in-confirmed', activeActorId)}>
            <RadioTower aria-hidden="true" />
            Teams confirmed
          </button>
        </div>
      </section>

      <section className="panel span-7">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Swimmer Condition Update</h3>
            <p className="panel-subtitle">Latest: {latestCondition.level}</p>
          </div>
          <HeartPulse aria-hidden="true" />
        </div>
        <div className="condition-scale" role="radiogroup" aria-label="Condition level">
          {conditionLevels.map((item) => (
            <button
              className={conditionLevel === item.level ? 'segment active' : 'segment'}
              key={item.level}
              type="button"
              role="radio"
              aria-checked={conditionLevel === item.level}
              onClick={() => setConditionLevel(item.level)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <label className="field-label" style={{ marginTop: 12 }}>
          Condition note
          <textarea className="textarea" value={conditionNote} onChange={(event) => setConditionNote(event.target.value)} />
        </label>
        <button
          className="button primary"
          type="button"
          style={{ marginTop: 12 }}
          onClick={() => updateSwimmerCondition(conditionLevel, conditionNote, activeActorId)}
        >
          <Activity aria-hidden="true" />
          Log condition
        </button>
      </section>

      <section className="panel span-5">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Shift Rotation</h3>
            <p className="panel-subtitle">Current and upcoming role ownership.</p>
          </div>
          <Clock3 aria-hidden="true" />
        </div>
        <ul className="row-list">
          {[...mission.crew]
            .sort((a, b) => new Date(a.shiftStart).getTime() - new Date(b.shiftStart).getTime())
            .map((member) => {
              const active = new Date(member.shiftStart) <= now && now <= new Date(member.shiftEnd);
              return (
                <li className="list-row" key={member.id}>
                  <div className="split-row">
                    <span className="row-title">{member.name}</span>
                    <span className={active ? 'status-pill active' : 'status-pill pending'}>{active ? 'on duty' : 'next'}</span>
                  </div>
                  <span className="row-meta">
                    {roleLabels[member.role]} · {formatClock(member.shiftStart)} to {formatClock(member.shiftEnd)}
                  </span>
                </li>
              );
            })}
        </ul>
      </section>

      <section className="panel span-7">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Event Tracker</h3>
            <p className="panel-subtitle">{filteredTimeline.length} matching events</p>
          </div>
          <RadioTower aria-hidden="true" />
        </div>
        <div className="filter-row" aria-label="Timeline filters">
          {eventFilters.map((eventFilter) => (
            <button
              className={filter === eventFilter ? 'segment active' : 'segment'}
              key={eventFilter}
              type="button"
              onClick={() => setFilter(eventFilter)}
            >
              {eventFilter}
            </button>
          ))}
        </div>
        <ul className="timeline-list" style={{ marginTop: 16 }}>
          {filteredTimeline.map((event) => (
            <li className="timeline-item" key={event.id}>
              <span className="timeline-time">{formatClock(event.at)}</span>
              <div>
                <div className="timeline-summary">{event.summary}</div>
                <div className="timeline-detail">
                  {event.detail} · {getCrewLabel(mission, event.actorId)}
                  {event.lateByMinutes ? ` · ${event.lateByMinutes} min late` : ''}
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
