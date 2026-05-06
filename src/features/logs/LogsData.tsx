import { Copy, Database, FileDown, Filter, HeartPulse, Mail, Plus, Trash2, Waves } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  buildLogisticsReport,
  buildMedicalReport,
  buildWildlifeReport,
  buildWowsaReport,
  mailtoHref
} from '../../lib/reports';
import { formatClock, getCrewLabel } from '../../state/selectors';
import type { TimelineEventType } from '../../state/types';
import { useMissionStore } from '../../state/useMissionStore';

const filters: Array<TimelineEventType | 'all'> = [
  'all',
  'feeding',
  'condition',
  'shift',
  'weather',
  'course',
  'check-in',
  'emergency',
  'note'
];

const sessionFields = [
  ['swimmerName', 'Swimmer'],
  ['location', 'Location / Harbor'],
  ['plannedDistance', 'Planned Distance'],
  ['plannedStartTime', 'Planned Start Time'],
  ['gpsStart', 'GPS Start'],
  ['gpsEnd', 'GPS End'],
  ['primaryVessel', 'Primary Vessel'],
  ['supportVessels', 'Support Vessels'],
  ['leadCrew', 'Lead Crew'],
  ['completedBy', 'Completed By']
] as const;

const medicalFields = [
  ['heartRateBpm', 'Resting Heart Rate'],
  ['bodyTempF', 'Body Temp'],
  ['spo2', 'SpO2'],
  ['weightLbs', 'Weight'],
  ['sleepHours', 'Sleep Hours'],
  ['sleepQuality', 'Sleep Quality']
] as const;

const wellnessFields = [
  ['mood', 'Mood'],
  ['motivation', 'Motivation'],
  ['stress', 'Stress'],
  ['anxiety', 'Anxiety'],
  ['confidence', 'Confidence']
] as const;

function toCsv(rows: Array<Record<string, string | number | undefined>>) {
  const headers = ['at', 'type', 'actor', 'summary', 'detail', 'severity', 'lateByMinutes'];
  const escape = (value: string | number | undefined) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  return [headers.join(','), ...rows.map((row) => headers.map((header) => escape(row[header])).join(','))].join('\n');
}

export function LogsData() {
  const mission = useMissionStore((state) => state.mission);
  const offlineQueue = useMissionStore((state) => state.offlineQueue);
  const activeActorId = useMissionStore((state) => state.activeActorId);
  const updateSessionField = useMissionStore((state) => state.updateSessionField);
  const updateMedicalVitalsField = useMissionStore((state) => state.updateMedicalVitalsField);
  const updateWellnessRating = useMissionStore((state) => state.updateWellnessRating);
  const addWildlifeSighting = useMissionStore((state) => state.addWildlifeSighting);
  const removeWildlifeSighting = useMissionStore((state) => state.removeWildlifeSighting);
  const [filter, setFilter] = useState<TimelineEventType | 'all'>('all');
  const [copied, setCopied] = useState(false);
  const [wildlifeDraft, setWildlifeDraft] = useState({
    species: '',
    behavior: '',
    actionTaken: '',
    distanceFromSwimmer: '',
    count: '',
    notes: '',
    hasPhoto: false
  });

  const filteredTimeline = useMemo(
    () =>
      [...mission.timeline]
        .filter((event) => filter === 'all' || event.type === filter)
        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()),
    [filter, mission.timeline]
  );

  const exportRows = filteredTimeline.map((event) => ({
    at: event.at,
    type: event.type,
    actor: getCrewLabel(mission, event.actorId),
    summary: event.summary,
    detail: event.detail,
    severity: event.severity,
    lateByMinutes: event.lateByMinutes
  }));
  const jsonReport = JSON.stringify(
    {
      mission: {
        id: mission.id,
        name: mission.name,
        status: mission.status,
        startedAt: mission.startedAt,
        lastFeedingAt: mission.lastFeedingAt,
        nextFeedingAt: mission.nextFeedingAt
      },
      timeline: exportRows,
      alerts: mission.alerts,
      swimmerConditions: mission.swimmerConditions,
      checklistItems: mission.checklistItems
    },
    null,
    2
  );
  const csvReport = toCsv(exportRows);

  const copyJson = async () => {
    if ('clipboard' in navigator) {
      await navigator.clipboard.writeText(jsonReport);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    }
  };

  const jsonHref = `data:application/json;charset=utf-8,${encodeURIComponent(jsonReport)}`;
  const csvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(csvReport)}`;
  const reportDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const reportLocation = mission.session.location || mission.name;

  const submitWildlife = () => {
    if (!wildlifeDraft.species.trim()) {
      return;
    }

    addWildlifeSighting({
      ...wildlifeDraft,
      species: wildlifeDraft.species.trim(),
      gps: mission.position.label,
      actorId: activeActorId
    });
    setWildlifeDraft({
      species: '',
      behavior: '',
      actionTaken: '',
      distanceFromSwimmer: '',
      count: '',
      notes: '',
      hasPhoto: false
    });
  };

  return (
    <div className="page-grid">
      <section className="panel span-4">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Data Summary</h3>
            <p className="panel-subtitle">{mission.name}</p>
          </div>
          <Database aria-hidden="true" />
        </div>
        <div className="metric-grid">
          <div className="metric">
            <span className="metric-label">Events</span>
            <span className="metric-value">{mission.timeline.length}</span>
          </div>
          <div className="metric">
            <span className="metric-label">Alerts</span>
            <span className="metric-value">{mission.alerts.length}</span>
          </div>
          <div className="metric">
            <span className="metric-label">Offline Queue</span>
            <span className="metric-value">{offlineQueue.length}</span>
          </div>
        </div>
      </section>

      <section className="panel span-8">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Exports</h3>
            <p className="panel-subtitle">Report scope: {filter}</p>
          </div>
          <FileDown aria-hidden="true" />
        </div>
        <div className="row-actions">
          <a className="button primary" href={jsonHref} download="swim-california-report.json">
            <FileDown aria-hidden="true" />
            JSON
          </a>
          <a className="button" href={csvHref} download="swim-california-timeline.csv">
            <FileDown aria-hidden="true" />
            CSV
          </a>
          <button className="button" type="button" onClick={copyJson}>
            <Copy aria-hidden="true" />
            {copied ? 'Copied' : 'Copy JSON'}
          </button>
          <a
            className="button"
            href={mailtoHref(
              'swimcalifornia2026@gmail.com',
              `Swim California - Logistics Report - ${reportLocation} - ${reportDate}`,
              buildLogisticsReport(mission)
            )}
          >
            <Mail aria-hidden="true" />
            Logistics Email
          </a>
          <a
            className="button"
            href={mailtoHref(
              'swimcalifornia2026@gmail.com',
              `Swim California - Medical Report - ${reportLocation} - ${reportDate}`,
              buildMedicalReport(mission)
            )}
          >
            <HeartPulse aria-hidden="true" />
            Medical Email
          </a>
        </div>
      </section>

      <section className="panel span-6">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Daily Session</h3>
            <p className="panel-subtitle">Report metadata from the original daily ops flow.</p>
          </div>
          <Database aria-hidden="true" />
        </div>
        <div className="two-column-form">
          {sessionFields.map(([field, label]) => (
            <label className="field-label" key={field}>
              {label}
              <input
                className="input"
                value={mission.session[field]}
                onChange={(event) => updateSessionField(field, event.target.value)}
              />
            </label>
          ))}
        </div>
      </section>

      <section className="panel span-6">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Medical & Wellness</h3>
            <p className="panel-subtitle">Daily vitals and readiness ratings.</p>
          </div>
          <HeartPulse aria-hidden="true" />
        </div>
        <div className="two-column-form">
          {medicalFields.map(([field, label]) => (
            <label className="field-label" key={field}>
              {label}
              <input
                className="input"
                value={mission.medicalVitals[field]}
                onChange={(event) => updateMedicalVitalsField(field, event.target.value)}
              />
            </label>
          ))}
        </div>
        <div className="row-list" style={{ marginTop: 16 }}>
          {wellnessFields.map(([field, label]) => (
            <label className="scale-row" key={field}>
              <div className="scale-label">
                <span>{label}</span>
                <span className="scale-val">{mission.wellnessRatings[field]}</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={mission.wellnessRatings[field]}
                onChange={(event) => updateWellnessRating(field, Number(event.target.value))}
              />
            </label>
          ))}
        </div>
      </section>

      <section className="panel span-12">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Wildlife Log</h3>
            <p className="panel-subtitle">{mission.wildlifeSightings.length} sightings logged for research and safety review.</p>
          </div>
          <Waves aria-hidden="true" />
        </div>
        <div className="two-column-form">
          <label className="field-label">
            Species / animal
            <input
              className="input"
              value={wildlifeDraft.species}
              onChange={(event) => setWildlifeDraft((draft) => ({ ...draft, species: event.target.value }))}
              placeholder="White shark, common dolphin, kelp field"
            />
          </label>
          <label className="field-label">
            Distance from swimmer
            <input
              className="input"
              value={wildlifeDraft.distanceFromSwimmer}
              onChange={(event) => setWildlifeDraft((draft) => ({ ...draft, distanceFromSwimmer: event.target.value }))}
              placeholder="50 ft, 200 yards"
            />
          </label>
          <label className="field-label">
            Behavior
            <select
              className="select"
              value={wildlifeDraft.behavior}
              onChange={(event) => setWildlifeDraft((draft) => ({ ...draft, behavior: event.target.value }))}
            >
              <option value="">Select</option>
              <option>Passing, not interested</option>
              <option>Curious / investigating</option>
              <option>Approaching swimmer</option>
              <option>Feeding nearby</option>
              <option>Aggressive / threatening</option>
            </select>
          </label>
          <label className="field-label">
            Action taken
            <select
              className="select"
              value={wildlifeDraft.actionTaken}
              onChange={(event) => setWildlifeDraft((draft) => ({ ...draft, actionTaken: event.target.value }))}
            >
              <option value="">Select</option>
              <option>No action, continued swim</option>
              <option>Paused swim, monitored situation</option>
              <option>Altered route to increase distance</option>
              <option>Swimmer exited water as precaution</option>
              <option>Reported to NOAA / Coast Guard</option>
            </select>
          </label>
          <label className="field-label">
            Count
            <input
              className="input"
              value={wildlifeDraft.count}
              onChange={(event) => setWildlifeDraft((draft) => ({ ...draft, count: event.target.value }))}
              placeholder="1, pod, bloom"
            />
          </label>
          <label className="field-label">
            Photo taken
            <select
              className="select"
              value={wildlifeDraft.hasPhoto ? 'yes' : 'no'}
              onChange={(event) => setWildlifeDraft((draft) => ({ ...draft, hasPhoto: event.target.value === 'yes' }))}
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </label>
        </div>
        <label className="field-label" style={{ marginTop: 12 }}>
          Notes
          <textarea
            className="textarea"
            value={wildlifeDraft.notes}
            onChange={(event) => setWildlifeDraft((draft) => ({ ...draft, notes: event.target.value }))}
            placeholder="Size estimate, markings, crew response, photo file reminder"
          />
        </label>
        <div className="row-actions" style={{ marginTop: 12 }}>
          <button className="button primary" type="button" onClick={submitWildlife}>
            <Plus aria-hidden="true" />
            Log sighting
          </button>
          <a
            className="button"
            href={mailtoHref(
              'swimcalifornia2026@gmail.com',
              `Swim California - Wildlife Report - ${reportLocation} - ${reportDate}`,
              buildWildlifeReport(mission)
            )}
          >
            <Mail aria-hidden="true" />
            Wildlife Email
          </a>
        </div>
        {mission.wildlifeSightings.length ? (
          <ul className="row-list" style={{ marginTop: 16 }}>
            {mission.wildlifeSightings.map((sighting) => (
              <li className="list-row" key={sighting.id}>
                <div className="split-row">
                  <div>
                    <div className="row-title">{sighting.species}</div>
                    <div className="row-meta">
                      {formatClock(sighting.at)} · {sighting.distanceFromSwimmer || 'distance not set'} · {sighting.actionTaken || 'no action noted'}
                    </div>
                  </div>
                  <button className="button-icon" type="button" aria-label={`Remove ${sighting.species}`} onClick={() => removeWildlifeSighting(sighting.id)}>
                    <Trash2 aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="panel span-12">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Timeline Data</h3>
            <p className="panel-subtitle">{filteredTimeline.length} matching records</p>
          </div>
          <Filter aria-hidden="true" />
        </div>
        <div className="filter-row">
          {filters.map((item) => (
            <button className={filter === item ? 'segment active' : 'segment'} key={item} type="button" onClick={() => setFilter(item)}>
              {item}
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
