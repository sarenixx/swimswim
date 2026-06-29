import { Ambulance, CheckCircle2, ClipboardCheck, HeartPulse, Mail, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { buildMedicalReport, mailtoHref } from '../../lib/reports';
import { formatClock, getCrewLabel } from '../../state/selectors';
import type {
  MedicalChecklistItem,
  MedicalChecklistStatus,
  MedicalProtocolArea,
  MedicalSymptomSeverity,
  MedicalSymptomTrend
} from '../../state/types';
import { useMissionStore } from '../../state/useMissionStore';

const medicalEmail = 'swimcalifornia2026@gmail.com';

const protocolAreaLabels: Record<MedicalProtocolArea, string> = {
  'daily-monitoring': 'Daily monitoring',
  rhabdomyolysis: 'Rhabdomyolysis',
  hypothermia: 'Hypothermia',
  'weight-loss': 'Weight / fueling',
  sipe: 'Pulmonary edema',
  'skin-soft-tissue': 'Skin / soft tissue',
  'water-illness': 'Water illness',
  'bites-stings': 'Bites / stings',
  'mental-health': 'Mental health',
  other: 'Other'
};

const checklistGroups: Array<{
  id: string;
  title: string;
  subtitle: string;
  match: (item: MedicalChecklistItem) => boolean;
}> = [
  {
    id: 'pre-swim',
    title: 'Pre-Swim Checklist',
    subtitle: 'Baseline readiness before swimmer entry',
    match: (item) => item.cadence === 'pre-swim'
  },
  {
    id: 'in-swim',
    title: 'In-Swim Watch Checklist',
    subtitle: 'Condition changes that matter while the swim is live',
    match: (item) => ['hypothermia', 'sipe', 'bites-stings', 'water-illness'].includes(item.protocolArea)
  },
  {
    id: 'post-swim',
    title: 'Post-Swim Checklist',
    subtitle: 'Immediate assessment after exit or pause',
    match: (item) => item.cadence === 'post-swim'
  },
  {
    id: 'treatment',
    title: 'Medication / Treatment Checklist',
    subtitle: 'Medication, symptom, and escalation tracking',
    match: (item) => item.id.includes('prescription') || item.protocolArea === 'weight-loss'
  },
  {
    id: 'recovery',
    title: 'Recovery-Day Checklist',
    subtitle: 'Daily recovery, sleep, soft tissue, and follow-up review',
    match: (item) => item.id.includes('recovery') || item.id.includes('sleep') || item.cadence === 'daily' || item.cadence === 'weekly'
  }
];

const symptomSeverities: MedicalSymptomSeverity[] = ['watch', 'caution', 'urgent', 'emergency'];
const symptomTrends: MedicalSymptomTrend[] = ['new', 'worse', 'same', 'improving', 'resolved'];
const reviewStatuses: MedicalChecklistStatus[] = ['watch', 'escalated'];

const getDateInputValue = (date = new Date()) => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
};

const getDateTimeInputValue = (date = new Date()) => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
};

const toIsoFromInput = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

export function SafetyEmergency() {
  const mission = useMissionStore((state) => state.mission);
  const activeActorId = useMissionStore((state) => state.activeActorId);
  const updateMedicalDailyChecklistItem = useMissionStore((state) => state.updateMedicalDailyChecklistItem);
  const addMedicalSymptomEntry = useMissionStore((state) => state.addMedicalSymptomEntry);
  const resolveMedicalSymptomEntry = useMissionStore((state) => state.resolveMedicalSymptomEntry);
  const [checklistDate, setChecklistDate] = useState(getDateInputValue);
  const [checkDrafts, setCheckDrafts] = useState<Record<string, string>>({});
  const [symptomDraft, setSymptomDraft] = useState({
    protocolArea: 'daily-monitoring' as MedicalProtocolArea,
    symptom: '',
    severity: 'watch' as MedicalSymptomSeverity,
    trend: 'new' as MedicalSymptomTrend,
    actionTaken: '',
    notes: '',
    observedAt: getDateTimeInputValue()
  });

  const medicalChecklist = mission.medicalChecklist ?? [];
  const medicalDailyRecords = mission.medicalDailyRecords ?? [];
  const medicalSymptomLog = mission.medicalSymptomLog ?? [];
  const selectedDailyRecord = medicalDailyRecords.find((record) => record.date === checklistDate);
  const groupedItems = useMemo(
    () =>
      checklistGroups.map((group) => ({
        ...group,
        items: medicalChecklist.filter(group.match)
      })),
    [medicalChecklist]
  );
  const savedCount = selectedDailyRecord?.items.filter((item) => item.status !== 'pending').length ?? 0;

  useEffect(() => {
    setCheckDrafts({});
  }, [checklistDate]);

  const getDailyRecordItem = (itemId: string) => selectedDailyRecord?.items.find((recordItem) => recordItem.itemId === itemId);
  const getDailyNote = (itemId: string) => checkDrafts[itemId] ?? getDailyRecordItem(itemId)?.note ?? '';
  const updateCheckDraft = (itemId: string, note: string) => {
    setCheckDrafts((current) => ({ ...current, [itemId]: note }));
  };
  const submitChecklistUpdate = (itemId: string, status: MedicalChecklistStatus) => {
    updateMedicalDailyChecklistItem(checklistDate, itemId, {
      status,
      note: getDailyNote(itemId)
    });
  };

  const submitSymptom = () => {
    const symptom = symptomDraft.symptom.trim();
    if (!symptom) {
      return;
    }

    addMedicalSymptomEntry({
      at: toIsoFromInput(symptomDraft.observedAt),
      protocolArea: symptomDraft.protocolArea,
      symptom,
      severity: symptomDraft.severity,
      trend: symptomDraft.trend,
      actionTaken: symptomDraft.actionTaken.trim(),
      notes: symptomDraft.notes.trim(),
      status: symptomDraft.trend === 'resolved' ? 'resolved' : 'open'
    });
    setSymptomDraft({
      protocolArea: symptomDraft.protocolArea,
      symptom: '',
      severity: 'watch',
      trend: 'new',
      actionTaken: '',
      notes: '',
      observedAt: getDateTimeInputValue()
    });
  };

  const medicalReportSubject = `${mission.name} - Medical Record - ${new Date().toLocaleDateString('en-US')}`;

  return (
    <div className="page-grid medical-page">
      <section className="panel span-12">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Medical</h3>
            <p className="panel-subtitle">Independent medical checklists and symptom record</p>
          </div>
          <div className="row-actions">
            <a className="button" href={mailtoHref(medicalEmail, medicalReportSubject, buildMedicalReport(mission))}>
              <Mail aria-hidden="true" />
              Email Medical Record
            </a>
            <Ambulance aria-hidden="true" />
          </div>
        </div>
        <div className="daily-checklist-toolbar">
          <label className="field-label">
            Checklist date
            <input className="input" type="date" value={checklistDate} onChange={(event) => setChecklistDate(event.target.value || getDateInputValue())} />
          </label>
          <div className="daily-checklist-summary">
            <span className="stat-value">{savedCount}</span>
            <span className="row-meta">saved medical checks</span>
          </div>
        </div>
      </section>

      {groupedItems.map((group) => (
        <section className="panel span-12" key={group.id}>
          <div className="panel-header">
            <div>
              <h3 className="panel-title">{group.title}</h3>
              <p className="panel-subtitle">{group.subtitle}</p>
            </div>
            <ClipboardCheck aria-hidden="true" />
          </div>
          <div className="daily-checklist-list">
            {group.items.map((item) => {
              const recordItem = getDailyRecordItem(item.id);
              const status = recordItem?.status ?? 'pending';
              const note = getDailyNote(item.id);

              return (
                <article className={`daily-checklist-row ${status}`} key={item.id}>
                  <label className="daily-check-toggle">
                    <input
                      aria-label={`Complete ${item.title}`}
                      checked={status === 'done'}
                      type="checkbox"
                      onChange={(event) => submitChecklistUpdate(item.id, event.target.checked ? 'done' : 'pending')}
                    />
                    <div>
                      <div className="row-title">{item.title}</div>
                      <div className="row-meta">
                        {protocolAreaLabels[item.protocolArea]} - {item.cadence} - {getCrewLabel(mission, item.ownerId)}
                      </div>
                    </div>
                    <span className={`severity-pill ${status === 'escalated' ? 'critical' : status === 'watch' ? 'warning' : status === 'done' ? 'info' : 'normal'}`}>
                      {status}
                    </span>
                  </label>
                  <p className="medical-check-instructions">{item.instructions}</p>
                  <div className="row-actions">
                    <input
                      className="input daily-check-note"
                      aria-label={`Daily note for ${item.title}`}
                      value={note}
                      onChange={(event) => updateCheckDraft(item.id, event.target.value)}
                      onBlur={() => submitChecklistUpdate(item.id, status)}
                      placeholder="Medical note"
                    />
                    {reviewStatuses.map((reviewStatus) => (
                      <button
                        className={reviewStatus === 'escalated' ? 'button danger' : 'button'}
                        key={reviewStatus}
                        type="button"
                        onClick={() => submitChecklistUpdate(item.id, reviewStatus)}
                      >
                        {reviewStatus}
                      </button>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}

      <section className="panel span-12">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Symptom / Change Log</h3>
            <p className="panel-subtitle">Medical entries stay separate from observer logging</p>
          </div>
          <HeartPulse aria-hidden="true" />
        </div>
        <div className="medical-log-form">
          <label className="field-label">
            Protocol area
            <select
              className="select"
              value={symptomDraft.protocolArea}
              onChange={(event) => setSymptomDraft((draft) => ({ ...draft, protocolArea: event.target.value as MedicalProtocolArea }))}
            >
              {Object.entries(protocolAreaLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="field-label">
            Severity
            <select
              className="select"
              value={symptomDraft.severity}
              onChange={(event) => setSymptomDraft((draft) => ({ ...draft, severity: event.target.value as MedicalSymptomSeverity }))}
            >
              {symptomSeverities.map((severity) => (
                <option key={severity} value={severity}>
                  {severity}
                </option>
              ))}
            </select>
          </label>
          <label className="field-label">
            Trend
            <select
              className="select"
              value={symptomDraft.trend}
              onChange={(event) => setSymptomDraft((draft) => ({ ...draft, trend: event.target.value as MedicalSymptomTrend }))}
            >
              {symptomTrends.map((trend) => (
                <option key={trend} value={trend}>
                  {trend}
                </option>
              ))}
            </select>
          </label>
          <label className="field-label">
            Observed at
            <input
              className="input"
              type="datetime-local"
              value={symptomDraft.observedAt}
              onChange={(event) => setSymptomDraft((draft) => ({ ...draft, observedAt: event.target.value }))}
            />
          </label>
          <label className="field-label span-fields">
            Symptom / change
            <input
              className="input"
              value={symptomDraft.symptom}
              onChange={(event) => setSymptomDraft((draft) => ({ ...draft, symptom: event.target.value }))}
              placeholder="Shivering, shoulder pain, cough, nausea"
            />
          </label>
          <label className="field-label span-fields">
            Action taken
            <textarea
              className="textarea"
              value={symptomDraft.actionTaken}
              onChange={(event) => setSymptomDraft((draft) => ({ ...draft, actionTaken: event.target.value }))}
              placeholder="Vitals repeated, warming started, physician contacted"
            />
          </label>
          <label className="field-label span-fields">
            Notes
            <textarea
              className="textarea"
              value={symptomDraft.notes}
              onChange={(event) => setSymptomDraft((draft) => ({ ...draft, notes: event.target.value }))}
              placeholder="Measurements, context, trend"
            />
          </label>
          <button className="button primary medical-submit" type="button" onClick={submitSymptom} disabled={!symptomDraft.symptom.trim()}>
            <Plus aria-hidden="true" />
            Log Medical Change
          </button>
        </div>

        {medicalSymptomLog.length ? (
          <ul className="row-list" style={{ marginTop: 16 }}>
            {medicalSymptomLog.map((entry) => (
              <li className="list-row" key={entry.id}>
                <div className="split-row">
                  <div>
                    <div className="row-title">{entry.symptom}</div>
                    <div className="row-meta">
                      {formatClock(entry.at)} - {protocolAreaLabels[entry.protocolArea]} - {entry.trend}
                    </div>
                  </div>
                  <span className={`severity-pill ${entry.severity === 'emergency' ? 'critical' : entry.severity === 'watch' ? 'info' : 'warning'}`}>
                    {entry.severity}
                  </span>
                </div>
                <span className="alert-detail">{entry.actionTaken || 'No action recorded.'}</span>
                {entry.notes ? <span className="row-meta">{entry.notes}</span> : null}
                {entry.status !== 'resolved' ? (
                  <button className="button ghost" type="button" onClick={() => resolveMedicalSymptomEntry(entry.id)}>
                    Resolve
                  </button>
                ) : (
                  <span className="role-pill">resolved</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-state" style={{ marginTop: 16 }}>No medical changes logged.</div>
        )}
      </section>
    </div>
  );
}
