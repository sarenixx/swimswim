import { Ambulance, CheckCircle2, ClipboardCheck, Clock3, Mail, PhoneCall, Plus, ShieldAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { buildMedicalReport, mailtoHref } from '../../lib/reports';
import { roleLabels } from '../../state/seed';
import { formatClock, getActiveAlerts, getCrewLabel, getProtocolForKind } from '../../state/selectors';
import type {
  EmergencyKind,
  MedicalChecklistStatus,
  MedicalProtocolArea,
  MedicalSymptomSeverity,
  MedicalSymptomTrend
} from '../../state/types';
import { useMissionStore } from '../../state/useMissionStore';

const protocolLabels: Record<EmergencyKind, string> = {
  medical: 'Medical',
  distress: 'Distress',
  abort: 'Abort'
};

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

const symptomSeverities: MedicalSymptomSeverity[] = ['watch', 'caution', 'urgent', 'emergency'];
const symptomTrends: MedicalSymptomTrend[] = ['new', 'worse', 'same', 'improving', 'resolved'];
const dailyReviewStatuses: MedicalChecklistStatus[] = ['watch', 'escalated'];

const getDateInputValue = (date = new Date()) => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
};

const getDateTimeInputValue = (date = new Date()) => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
};

const formatRecordDate = (date: string) =>
  new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${date}T00:00:00`));

const toIsoFromInput = (value: string) => {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

export function SafetyEmergency() {
  const location = useLocation();
  const mission = useMissionStore((state) => state.mission);
  const activeActorId = useMissionStore((state) => state.activeActorId);
  const resolveAlert = useMissionStore((state) => state.resolveAlert);
  const updateMedicalDailyChecklistItem = useMissionStore((state) => state.updateMedicalDailyChecklistItem);
  const addMedicalSymptomEntry = useMissionStore((state) => state.addMedicalSymptomEntry);
  const resolveMedicalSymptomEntry = useMissionStore((state) => state.resolveMedicalSymptomEntry);
  const [selectedKind, setSelectedKind] = useState<EmergencyKind>(mission.activeProtocolKind ?? 'distress');
  const [dailyChecklistDate, setDailyChecklistDate] = useState(getDateInputValue);
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
  const selectedProtocol = getProtocolForKind(mission, selectedKind);
  const activeAlerts = getActiveAlerts(mission);
  const medicalConcerns = mission.riskPlan?.medicalConcerns ?? [];
  const mitigationNotes = mission.riskPlan?.mitigationNotes ?? [];
  const medicalChecklist = mission.medicalChecklist ?? [];
  const medicalDailyRecords = mission.medicalDailyRecords ?? [];
  const medicalSymptomLog = mission.medicalSymptomLog ?? [];
  const selectedDailyRecord = medicalDailyRecords.find((record) => record.date === dailyChecklistDate);
  const completedDailyCount =
    selectedDailyRecord?.items.filter((item) => item.status === 'done' || item.status === 'watch' || item.status === 'escalated').length ?? 0;
  const escalatedDailyCount = selectedDailyRecord?.items.filter((item) => item.status === 'escalated').length ?? 0;
  const medicalRecordEmail = 'swimcalifornia2026@gmail.com';
  const medicalReportSubject = `${mission.name} - Medical Living Record - ${new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })}`;

  useEffect(() => {
    setCheckDrafts({});
  }, [dailyChecklistDate]);

  useEffect(() => {
    if (location.hash === '#medical-record') {
      document.getElementById('medical-record')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    }
  }, [location.hash]);

  const getDailyRecordItem = (itemId: string) => selectedDailyRecord?.items.find((recordItem) => recordItem.itemId === itemId);

  const getDailyNote = (itemId: string) => checkDrafts[itemId] ?? getDailyRecordItem(itemId)?.note ?? '';

  const updateCheckDraft = (itemId: string, note: string) => {
    setCheckDrafts((current) => ({
      ...current,
      [itemId]: note
    }));
  };

  const submitDailyChecklistUpdate = (itemId: string, status: MedicalChecklistStatus) => {
    updateMedicalDailyChecklistItem(dailyChecklistDate, itemId, {
      status,
      note: getDailyNote(itemId)
    });
  };

  const buildSymptomEmailHref = (input: {
    observedAt: string;
    protocolArea: MedicalProtocolArea;
    symptom: string;
    severity: MedicalSymptomSeverity;
    trend: MedicalSymptomTrend;
    actionTaken: string;
    notes: string;
  }) => {
    const observedAt = toIsoFromInput(input.observedAt) ?? new Date().toISOString();
    const subject = `${mission.name} - Medical symptom/change - ${formatRecordDate(observedAt.slice(0, 10))}`;
    const body = `Medical symptom/change logged

Mission: ${mission.name}
Observed at: ${formatClock(observedAt)}
Logged by: ${getCrewLabel(mission, activeActorId)}
Protocol area: ${protocolAreaLabels[input.protocolArea]}
Severity: ${input.severity}
Trend: ${input.trend}

Symptom / change:
${input.symptom}

Action taken:
${input.actionTaken || 'No action recorded.'}

Notes:
${input.notes || '-'}`;

    return mailtoHref(medicalRecordEmail, subject, body);
  };

  const submitSymptom = () => {
    const symptom = symptomDraft.symptom.trim();
    const actionTaken = symptomDraft.actionTaken.trim();
    const notes = symptomDraft.notes.trim();
    if (!symptom) {
      return;
    }
    const observedAt = toIsoFromInput(symptomDraft.observedAt) ?? new Date().toISOString();
    const emailHref = buildSymptomEmailHref({
      observedAt: symptomDraft.observedAt,
      protocolArea: symptomDraft.protocolArea,
      symptom,
      severity: symptomDraft.severity,
      trend: symptomDraft.trend,
      actionTaken,
      notes
    });

    addMedicalSymptomEntry({
      at: observedAt,
      protocolArea: symptomDraft.protocolArea,
      symptom,
      severity: symptomDraft.severity,
      trend: symptomDraft.trend,
      actionTaken,
      notes,
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

    if (import.meta.env.MODE !== 'test') {
      window.location.href = emailHref;
    }
  };

  return (
    <div className="page-grid">
      <section className="panel span-12">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Protocol Scenarios</h3>
            <p className="panel-subtitle">Review what to do for medical, distress, and abort scenarios.</p>
          </div>
          <ShieldAlert aria-hidden="true" />
        </div>
        <a className="protocol-button large protocol-button-single" href="#scenario-protocol">
          Protocol
        </a>
      </section>

      <section className="panel span-7" id="scenario-protocol">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">{selectedProtocol?.title ?? 'Emergency Protocol'}</h3>
            <p className="panel-subtitle">Step order and role ownership stay visible during response.</p>
          </div>
          <label className="field-label scenario-picker">
            Scenario
            <select className="select" value={selectedKind} onChange={(event) => setSelectedKind(event.target.value as EmergencyKind)}>
              {mission.protocols.map((protocol) => (
                <option key={protocol.kind} value={protocol.kind}>
                  {protocolLabels[protocol.kind]}
                </option>
              ))}
            </select>
          </label>
        </div>
        {selectedProtocol ? (
          <ol className="protocol-list">
            {selectedProtocol.steps.map((step) => (
              <li className="protocol-step" key={step.id}>
                <span className="protocol-index">{step.order}</span>
                <div>
                  <div className="row-title">{step.label}</div>
                  <div className="protocol-owner">{roleLabels[step.ownerRole]}</div>
                </div>
              </li>
            ))}
          </ol>
        ) : null}
      </section>

      <section className="panel span-5">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Critical Contacts</h3>
            <p className="panel-subtitle">Primary response channels.</p>
          </div>
          <PhoneCall aria-hidden="true" />
        </div>
        <div className="contact-grid">
          {mission.contacts.map((contact) => (
            <article className="contact-card" key={contact.id}>
              <div>
                <div className="row-title">{contact.name}</div>
                <div className="row-meta">{contact.role}</div>
              </div>
              <div className="split-row">
                <a className="button primary" href={`tel:${contact.phone}`}>
                  <PhoneCall aria-hidden="true" />
                  Call
                </a>
                <span className="role-pill">{contact.channel}</span>
              </div>
              <span className="row-meta">{contact.phone}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="panel span-12" id="medical-record">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Medical Living Record</h3>
            <p className="panel-subtitle">Document symptoms, status changes, interventions, and observations by date.</p>
          </div>
          <div className="row-actions">
            <a className="button" href={mailtoHref(medicalRecordEmail, medicalReportSubject, buildMedicalReport(mission))}>
              <Mail aria-hidden="true" />
              Email medical record
            </a>
            <ClipboardCheck aria-hidden="true" />
          </div>
        </div>
        <div className="medical-record-grid">
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
                placeholder="New cough, cola-colored urine, shoulder pain, shivering"
              />
            </label>
            <label className="field-label span-fields">
              Action taken
              <textarea
                className="textarea"
                value={symptomDraft.actionTaken}
                onChange={(event) => setSymptomDraft((draft) => ({ ...draft, actionTaken: event.target.value }))}
                placeholder="Vitals repeated, Medical Director contacted, rest day recommended"
              />
            </label>
            <label className="field-label span-fields">
              Notes
              <textarea
                className="textarea"
                value={symptomDraft.notes}
                onChange={(event) => setSymptomDraft((draft) => ({ ...draft, notes: event.target.value }))}
                placeholder="Context, measurements, crew observations"
              />
            </label>
            <button className="button primary medical-submit" type="button" onClick={submitSymptom} disabled={!symptomDraft.symptom.trim()}>
              <Plus aria-hidden="true" />
              Log and email change
            </button>
          </div>

          <div>
            <h4 className="source-list-heading">Symptom / Change Log</h4>
            {medicalSymptomLog.length ? (
              <ul className="row-list">
                {medicalSymptomLog.map((entry) => (
                  <li className="list-row" key={entry.id}>
                    <div className="split-row">
                      <div>
                        <div className="row-title">{entry.symptom}</div>
                        <div className="row-meta">
                          {formatClock(entry.at)} · {protocolAreaLabels[entry.protocolArea]} · {entry.trend}
                        </div>
                      </div>
                      <span className={`severity-pill ${entry.severity === 'emergency' ? 'critical' : entry.severity === 'watch' ? 'info' : 'warning'}`}>
                        {entry.severity}
                      </span>
                    </div>
                    <span className="alert-detail">{entry.actionTaken || 'No action recorded.'}</span>
                    {entry.notes ? <span className="row-meta">{entry.notes}</span> : null}
                    {entry.nextReviewAt ? (
                      <span className="row-meta">
                        <Clock3 aria-hidden="true" /> Follow-up {formatClock(entry.nextReviewAt)}
                      </span>
                    ) : null}
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
              <div className="empty-state">No symptom changes logged.</div>
            )}
          </div>
        </div>
      </section>

      <section className="panel span-12">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Daily Medical Checklist</h3>
            <p className="panel-subtitle">Pick the day once; protocol checks are pre-populated and saved by date.</p>
          </div>
          <CheckCircle2 aria-hidden="true" />
        </div>
        <div className="daily-checklist-toolbar">
          <label className="field-label">
            Checklist date
            <input
              className="input"
              type="date"
              value={dailyChecklistDate}
              onChange={(event) => setDailyChecklistDate(event.target.value || getDateInputValue())}
            />
          </label>
          <div className="daily-checklist-summary" aria-label="Daily checklist summary">
            <span className="stat-value">
              {completedDailyCount}/{medicalChecklist.length}
            </span>
            <span className="row-meta">saved checks</span>
            {escalatedDailyCount ? <span className="severity-pill critical">{escalatedDailyCount} escalated</span> : null}
          </div>
        </div>
        <div className="daily-checklist-list">
          {medicalChecklist.map((item) => {
            const recordItem = getDailyRecordItem(item.id);
            const status = recordItem?.status ?? 'pending';
            const note = getDailyNote(item.id);
            return (
              <article className={`daily-checklist-row ${status}`} key={item.id}>
                <label className="daily-check-toggle">
                  <input
                    aria-label={`Complete ${item.title} for ${dailyChecklistDate}`}
                    checked={status === 'done'}
                    type="checkbox"
                    onChange={(event) => submitDailyChecklistUpdate(item.id, event.target.checked ? 'done' : 'pending')}
                  />
                  <div>
                    <div className="row-title">{item.title}</div>
                    <div className="row-meta">
                      {protocolAreaLabels[item.protocolArea]} · {item.cadence} · {roleLabels[mission.crew.find((member) => member.id === item.ownerId)?.role ?? 'medical']}
                    </div>
                  </div>
                  <span className={`severity-pill ${status === 'escalated' ? 'critical' : status === 'watch' ? 'warning' : status === 'done' ? 'info' : 'normal'}`}>
                    {status}
                  </span>
                </label>
                <p className="medical-check-instructions">{item.instructions}</p>
                {recordItem?.completedAt ? <span className="row-meta">Saved: {formatClock(recordItem.completedAt)}</span> : null}
                <div className="row-actions">
                  <input
                    className="input daily-check-note"
                    aria-label={`Daily note for ${item.title}`}
                    value={note}
                    onChange={(event) => updateCheckDraft(item.id, event.target.value)}
                    onBlur={() => submitDailyChecklistUpdate(item.id, status)}
                    placeholder="Observation or note"
                  />
                  {dailyReviewStatuses.map((reviewStatus) => (
                    <button
                      className={reviewStatus === 'escalated' ? 'button danger' : 'button'}
                      key={reviewStatus}
                      type="button"
                      aria-label={`${reviewStatus} ${item.title} for ${dailyChecklistDate}`}
                      onClick={() => submitDailyChecklistUpdate(item.id, reviewStatus)}
                    >
                      {reviewStatus}
                    </button>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
        <div className="daily-checklist-history">
          <h4 className="source-list-heading">Saved Daily Records</h4>
          {medicalDailyRecords.length ? (
            <div className="history-chip-row">
              {medicalDailyRecords.slice(0, 8).map((record) => {
                const completeCount = record.items.filter((item) => item.status !== 'pending').length;
                return (
                  <button
                    className={record.date === dailyChecklistDate ? 'history-chip active' : 'history-chip'}
                    key={record.id}
                    type="button"
                    onClick={() => setDailyChecklistDate(record.date)}
                  >
                    {formatRecordDate(record.date)}
                    <span>{completeCount}/{medicalChecklist.length}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="empty-state compact">No daily medical records saved yet.</div>
          )}
        </div>
      </section>

      <section className="panel span-12">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Medical Source of Truth</h3>
            <p className="panel-subtitle">SWIM CALIFORNIA MEDICAL PROTOCOL.docx</p>
          </div>
          <Ambulance aria-hidden="true" />
        </div>
        <div className="medical-source-grid">
          <div>
            <h4 className="source-list-heading">Watch Conditions</h4>
            <ul className="row-list">
              {medicalConcerns.map((concern) => (
                <li className="list-row" key={concern}>
                  <span className="row-title">{concern}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="source-list-heading">Control Notes</h4>
            <ul className="row-list">
              {mitigationNotes.map((note) => (
                <li className="list-row" key={note}>
                  <span className="row-title">{note}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="panel span-12">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Safety Alerts</h3>
            <p className="panel-subtitle">Active, acknowledged, and resolved emergency flags.</p>
          </div>
          <ShieldAlert aria-hidden="true" />
        </div>
        {activeAlerts.length ? (
          <ul className="alert-list">
            {activeAlerts.map((alert) => (
              <li className={`alert-row ${alert.severity}`} key={alert.id}>
                <div className="split-row">
                  <div>
                    <div className="row-title">{alert.title}</div>
                    <div className="alert-detail">
                      {alert.detail} · {formatClock(alert.createdAt)}
                    </div>
                  </div>
                  <span className={`severity-pill ${alert.severity}`}>{alert.severity}</span>
                </div>
                <div className="alert-actions">
                  <button className="button ghost" type="button" onClick={() => resolveAlert(alert.id)}>
                    Resolve
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-state">No active safety alerts.</div>
        )}
      </section>
    </div>
  );
}
