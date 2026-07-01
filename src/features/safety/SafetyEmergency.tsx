import {
  Ambulance,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileDown,
  HeartPulse,
  History,
  LineChart,
  Mail,
  Plus,
  ShieldAlert
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { buildDailyMedicalSummary, buildMedicalReport, mailtoHref, medicalReportRecipients } from '../../lib/reports';
import { backupMissionSnapshot, isRemoteSyncAvailable } from '../../lib/sync/supabaseClient';
import { useMissionSyncStatus } from '../../lib/sync/SyncStatusContext';
import type { MissionSyncStatus } from '../../lib/sync/useMissionSync';
import { formatClock } from '../../state/selectors';
import type {
  MedicalAdverseEvent,
  MedicalAdverseEventPhoto,
  MedicalAdverseEventResolutionStatus,
  MedicalAdverseEventSeverity,
  MedicalDailyChecklistRecord,
  MedicalDailyChecklistType,
  MedicalDailyRecord,
  MedicalDeviceMetrics,
  MedicalDeviceSource
} from '../../state/types';
import { useMissionStore } from '../../state/useMissionStore';

const medicalEmail = medicalReportRecipients.join(',');

type MedicalView = 'dashboard' | 'checklist' | 'adverse' | 'past' | 'trends' | 'data' | 'safety';
type FieldKind = 'text' | 'number' | 'textarea' | 'select' | 'scale';
type MedicalBackupState = 'idle' | 'saving' | 'success' | 'error';

interface DeviceSourceBinding {
  source: Extract<MedicalDeviceSource, 'oura' | 'garmin'>;
  metric: keyof MedicalDeviceMetrics;
}

interface ChecklistField {
  id: string;
  label: string;
  kind: FieldKind;
  options?: string[];
  min?: number;
  max?: number;
  placeholder?: string;
  source?: DeviceSourceBinding;
}

interface ChecklistDefinition {
  id: MedicalDailyChecklistType;
  title: string;
  role: 'athlete' | 'medic';
  timing: 'pre' | 'post' | 'recovery';
  purpose: string;
  fields: ChecklistField[];
}

interface TrendMetric {
  id: string;
  label: string;
  unit: string;
  fields: Array<{ checklistType: MedicalDailyChecklistType; fieldId: string }>;
  deviceMetrics?: Array<{ source: Extract<MedicalDeviceSource, 'oura' | 'garmin'>; metric: keyof MedicalDeviceMetrics }>;
}

interface TrendPoint {
  date: string;
  value: number;
  source: string;
}

const severityOptions: MedicalAdverseEventSeverity[] = ['watch', 'caution', 'urgent', 'emergency'];
const resolutionOptions: MedicalAdverseEventResolutionStatus[] = ['open', 'follow-up', 'resolved'];

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

const checklistDefinitions: Record<MedicalDailyChecklistType, ChecklistDefinition> = {
  'athlete-pre-swim': {
    id: 'athlete-pre-swim',
    title: 'Athlete Pre-Swim',
    role: 'athlete',
    timing: 'pre',
    purpose: 'Quick subjective wellness check before swimming.',
    fields: [
      { id: 'sleepDuration', label: 'Sleep duration', kind: 'number', placeholder: 'hours', source: { source: 'oura', metric: 'sleepHours' } },
      { id: 'sleepQuality', label: 'Sleep quality', kind: 'select', options: ['Excellent', 'Good', 'Fair', 'Poor'], source: { source: 'oura', metric: 'sleepQuality' } },
      { id: 'overallSoreness', label: 'Overall soreness', kind: 'scale', min: 1, max: 10 },
      { id: 'shoulderSoreness', label: 'Shoulder soreness', kind: 'scale', min: 1, max: 10 },
      { id: 'neckSoreness', label: 'Neck soreness', kind: 'scale', min: 1, max: 10 },
      { id: 'hipCoreSoreness', label: 'Hip/Core soreness', kind: 'scale', min: 1, max: 10 },
      { id: 'generalFatigue', label: 'General fatigue', kind: 'scale', min: 1, max: 10 },
      { id: 'recoveryStatus', label: 'Recovery status', kind: 'select', options: ['Ready', 'Mostly ready', 'Needs monitoring', 'Not ready'], source: { source: 'oura', metric: 'readinessScore' } },
      { id: 'giSymptoms', label: 'GI symptoms', kind: 'select', options: ['None', 'Mild', 'Moderate', 'Severe'] },
      { id: 'hydration', label: 'Hydration', kind: 'select', options: ['Good', 'Okay', 'Low', 'Concern'] },
      { id: 'generalComments', label: 'General comments', kind: 'textarea' }
    ]
  },
  'medic-pre-swim': {
    id: 'medic-pre-swim',
    title: 'Medic Pre-Swim',
    role: 'medic',
    timing: 'pre',
    purpose: 'Baseline objective check. Partial completion is okay.',
    fields: [
      { id: 'restingHeartRate', label: 'Resting heart rate', kind: 'number', placeholder: 'bpm', source: { source: 'oura', metric: 'restingHeartRateBpm' } },
      { id: 'bloodPressure', label: 'Blood pressure', kind: 'text', placeholder: '120/80' },
      { id: 'bodyTemperature', label: 'Body temperature', kind: 'number', placeholder: 'F', source: { source: 'oura', metric: 'bodyTemperatureTrendF' } },
      { id: 'spo2', label: 'SpO2', kind: 'number', placeholder: '%'},
      { id: 'morningWeight', label: 'Morning weight', kind: 'number', placeholder: 'lb' },
      { id: 'lungAssessment', label: 'Lung assessment', kind: 'select', options: ['Clear', 'Cough', 'Wheeze', 'Crackles', 'Concern'] },
      { id: 'skinWoundAssessment', label: 'Skin/wound assessment', kind: 'select', options: ['Clear', 'Chafing', 'Open area', 'Infection concern', 'Other'] },
      { id: 'hydrationAssessment', label: 'Hydration assessment', kind: 'select', options: ['Good', 'Okay', 'Low', 'Concern'] },
      { id: 'caloricIntakeAssessment', label: 'Caloric intake assessment', kind: 'select', options: ['Adequate', 'Borderline', 'Low', 'Concern'] },
      { id: 'medicalNotes', label: 'Medical notes', kind: 'textarea' }
    ]
  },
  'athlete-post-swim': {
    id: 'athlete-post-swim',
    title: 'Athlete Post-Swim',
    role: 'athlete',
    timing: 'post',
    purpose: 'Wellness and mental health check after training.',
    fields: [
      { id: 'overallMood', label: 'Overall mood', kind: 'scale', min: 1, max: 10 },
      { id: 'motivation', label: 'Motivation', kind: 'scale', min: 1, max: 10 },
      { id: 'stress', label: 'Stress', kind: 'scale', min: 1, max: 10 },
      { id: 'anxiety', label: 'Anxiety', kind: 'scale', min: 1, max: 10 },
      { id: 'confidence', label: 'Confidence', kind: 'scale', min: 1, max: 10 },
      { id: 'dailyReflection', label: 'Daily reflection', kind: 'textarea' },
      { id: 'gratitude', label: 'Gratitude', kind: 'textarea' },
      { id: 'supportNeeded', label: 'Support needed from the team', kind: 'textarea' }
    ]
  },
  'medic-post-swim': {
    id: 'medic-post-swim',
    title: 'Medic Post-Swim',
    role: 'medic',
    timing: 'post',
    purpose: 'Post-swim objective check and recovery notes.',
    fields: [
      { id: 'postSwimHeartRate', label: 'Post-swim heart rate', kind: 'number', placeholder: 'bpm', source: { source: 'garmin', metric: 'heartRateBpm' } },
      { id: 'coreTemperature', label: 'Core temperature', kind: 'number', placeholder: 'F' },
      { id: 'swimDuration', label: 'Swim duration', kind: 'text', placeholder: 'hh:mm', source: { source: 'garmin', metric: 'swimDuration' } },
      { id: 'distanceCompleted', label: 'Distance completed', kind: 'text', placeholder: 'miles or km', source: { source: 'garmin', metric: 'swimDistance' } },
      {
        id: 'urineDipstickResults',
        label: 'Urine dipstick results',
        kind: 'select',
        options: ['Normal', 'Trace blood', 'Positive blood', 'Protein positive', 'Ketones positive', 'Dark/cola-colored urine', 'Other abnormal']
      },
      { id: 'medicalObservations', label: 'Medical observations', kind: 'textarea' },
      { id: 'recoveryNotes', label: 'Recovery notes', kind: 'textarea' }
    ]
  },
  'athlete-recovery': {
    id: 'athlete-recovery',
    title: 'Athlete Recovery',
    role: 'athlete',
    timing: 'recovery',
    purpose: 'Recovery-day subjective check.',
    fields: [
      { id: 'sleep', label: 'Sleep', kind: 'text', source: { source: 'oura', metric: 'sleepHours' } },
      { id: 'recovery', label: 'Recovery', kind: 'select', options: ['Great', 'Good', 'Okay', 'Poor'], source: { source: 'oura', metric: 'recoveryScore' } },
      { id: 'mood', label: 'Mood', kind: 'scale', min: 1, max: 10 },
      { id: 'fatigue', label: 'Fatigue', kind: 'scale', min: 1, max: 10 },
      { id: 'soreness', label: 'Soreness', kind: 'scale', min: 1, max: 10 },
      { id: 'generalWellbeing', label: 'General wellbeing', kind: 'textarea' }
    ]
  },
  'medic-recovery': {
    id: 'medic-recovery',
    title: 'Medic Recovery',
    role: 'medic',
    timing: 'recovery',
    purpose: 'Recovery-day objective check.',
    fields: [
      { id: 'weight', label: 'Weight', kind: 'number', placeholder: 'lb' },
      { id: 'vitalSigns', label: 'Vital signs', kind: 'textarea', placeholder: 'HR, BP, temp, SpO2' },
      { id: 'medicalObservations', label: 'Medical observations', kind: 'textarea' },
      { id: 'recoveryNotes', label: 'Recovery notes', kind: 'textarea' }
    ]
  }
};

const swimDayChecklistIds: MedicalDailyChecklistType[] = [
  'athlete-pre-swim',
  'medic-pre-swim',
  'athlete-post-swim',
  'medic-post-swim'
];
const recoveryDayChecklistIds: MedicalDailyChecklistType[] = ['athlete-recovery', 'medic-recovery'];

const trendMetrics: TrendMetric[] = [
  {
    id: 'weight',
    label: 'Weight',
    unit: 'lb',
    fields: [
      { checklistType: 'medic-pre-swim', fieldId: 'morningWeight' },
      { checklistType: 'medic-recovery', fieldId: 'weight' }
    ]
  },
  {
    id: 'restingHeartRate',
    label: 'Resting heart rate',
    unit: 'bpm',
    fields: [{ checklistType: 'medic-pre-swim', fieldId: 'restingHeartRate' }],
    deviceMetrics: [{ source: 'oura', metric: 'restingHeartRateBpm' }]
  },
  {
    id: 'hrv',
    label: 'HRV',
    unit: 'ms',
    fields: [],
    deviceMetrics: [{ source: 'oura', metric: 'hrvMs' }]
  },
  {
    id: 'sleep',
    label: 'Sleep',
    unit: 'hr',
    fields: [
      { checklistType: 'athlete-pre-swim', fieldId: 'sleepDuration' },
      { checklistType: 'athlete-recovery', fieldId: 'sleep' }
    ],
    deviceMetrics: [{ source: 'oura', metric: 'sleepHours' }]
  },
  {
    id: 'bodyTemperature',
    label: 'Body temperature',
    unit: 'F',
    fields: [
      { checklistType: 'medic-pre-swim', fieldId: 'bodyTemperature' },
      { checklistType: 'medic-post-swim', fieldId: 'coreTemperature' }
    ],
    deviceMetrics: [{ source: 'oura', metric: 'bodyTemperatureTrendF' }]
  },
  {
    id: 'spo2',
    label: 'SpO2',
    unit: '%',
    fields: [{ checklistType: 'medic-pre-swim', fieldId: 'spo2' }]
  },
  {
    id: 'mood',
    label: 'Mood',
    unit: '/10',
    fields: [
      { checklistType: 'athlete-post-swim', fieldId: 'overallMood' },
      { checklistType: 'athlete-recovery', fieldId: 'mood' }
    ]
  },
  {
    id: 'fatigue',
    label: 'Fatigue',
    unit: '/10',
    fields: [
      { checklistType: 'athlete-pre-swim', fieldId: 'generalFatigue' },
      { checklistType: 'athlete-recovery', fieldId: 'fatigue' }
    ]
  },
  {
    id: 'soreness',
    label: 'Soreness',
    unit: '/10',
    fields: [
      { checklistType: 'athlete-pre-swim', fieldId: 'overallSoreness' },
      { checklistType: 'athlete-recovery', fieldId: 'soreness' }
    ]
  },
  {
    id: 'trainingLoad',
    label: 'Training load',
    unit: '',
    fields: [],
    deviceMetrics: [{ source: 'garmin', metric: 'trainingLoad' }]
  }
];

const trendMetricById = new Map(trendMetrics.map((metric) => [metric.id, metric]));

const parseMetricValue = (value: string | undefined) => {
  if (!value) {
    return undefined;
  }

  const match = value.match(/-?\d+(?:\.\d+)?/);
  if (!match) {
    return undefined;
  }

  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const checklistStatusLabel = (checklist?: MedicalDailyChecklistRecord) => {
  if (!checklist) {
    return 'not-started';
  }

  return checklist.status;
};

const checklistStatusClass = (checklist?: MedicalDailyChecklistRecord) => {
  if (checklist?.status === 'complete') {
    return 'done';
  }

  if (checklist?.status === 'in-progress') {
    return 'watch';
  }

  return 'pending';
};

const toDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(String(reader.result || '')));
    reader.addEventListener('error', () => reject(reader.error ?? new Error('Photo could not be read.')));
    reader.readAsDataURL(file);
  });

const downloadText = (filename: string, mimeType: string, body: string) => {
  const blob = new Blob([body], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const escapeCsv = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

const safeFilenamePart = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'medical';

const syncPillClass = (status: MissionSyncStatus) =>
  status.state === 'synced' || status.state === 'syncing' || status.state === 'loading' ? 'sync-pill online' : 'sync-pill offline';

const medicalSyncLabel = (status: MissionSyncStatus, offlineQueueCount: number) => {
  if (!status.enabled) {
    return 'Local only';
  }

  if (status.state === 'synced') {
    return 'Shared record saved';
  }

  if (status.state === 'syncing') {
    return 'Saving shared record';
  }

  if (status.state === 'loading') {
    return 'Loading shared record';
  }

  if (status.state === 'offline') {
    return offlineQueueCount ? `${offlineQueueCount} waiting to sync` : 'Offline - waiting to sync';
  }

  if (status.state === 'error') {
    return 'Shared sync error';
  }

  return status.label;
};

function SafetyEmergencyView() {
  const mission = useMissionStore((state) => state.mission);
  const online = useMissionStore((state) => state.online);
  const offlineQueue = useMissionStore((state) => state.offlineQueue);
  const syncStatus = useMissionSyncStatus();
  const setMedicalRecoveryDay = useMissionStore((state) => state.setMedicalRecoveryDay);
  const updateMedicalDailyChecklistField = useMissionStore((state) => state.updateMedicalDailyChecklistField);
  const completeMedicalDailyChecklist = useMissionStore((state) => state.completeMedicalDailyChecklist);
  const addMedicalAdverseEvent = useMissionStore((state) => state.addMedicalAdverseEvent);
  const resolveMedicalAdverseEvent = useMissionStore((state) => state.resolveMedicalAdverseEvent);
  const triggerEmergency = useMissionStore((state) => state.triggerEmergency);
  const [checklistDate, setChecklistDate] = useState(getDateInputValue);
  const [activeView, setActiveView] = useState<MedicalView>(() => (window.location.hash === '#medical-record' ? 'safety' : 'dashboard'));
  const [activeChecklistId, setActiveChecklistId] = useState<MedicalDailyChecklistType>('athlete-pre-swim');
  const [pastFilters, setPastFilters] = useState({
    date: '',
    checklistType: 'all' as 'all' | MedicalDailyChecklistType,
    recoveryOnly: false,
    adverseOnly: false
  });
  const [selectedMetricId, setSelectedMetricId] = useState('weight');
  const [selectedAdverseEventId, setSelectedAdverseEventId] = useState<string>();
  const [backupStatus, setBackupStatus] = useState<{ state: MedicalBackupState; detail: string }>(() => ({
    state: isRemoteSyncAvailable() ? 'idle' : 'error',
    detail: isRemoteSyncAvailable() ? 'Shared Supabase record is available.' : 'Supabase sync is not configured for this device.'
  }));
  const [adverseDraft, setAdverseDraft] = useState({
    eventAt: getDateTimeInputValue(),
    severity: 'watch' as MedicalAdverseEventSeverity,
    description: '',
    immediateActions: '',
    followUpRequired: '',
    resolutionStatus: 'open' as MedicalAdverseEventResolutionStatus,
    photos: [] as MedicalAdverseEventPhoto[]
  });

  useEffect(() => {
    if (window.location.hash === '#medical-record') {
      setActiveView('safety');
    }
  }, []);

  const selectedDailyRecord = useMemo(
    () => (mission.medicalDailyRecords ?? []).find((record) => record.date === checklistDate),
    [checklistDate, mission.medicalDailyRecords]
  );
  const selectedAdverseEvent = useMemo(
    () => (mission.medicalAdverseEvents ?? []).find((entry) => entry.id === selectedAdverseEventId),
    [mission.medicalAdverseEvents, selectedAdverseEventId]
  );
  const isRecoveryDay = selectedDailyRecord?.dayType === 'recovery';
  const currentChecklistIds = isRecoveryDay ? recoveryDayChecklistIds : swimDayChecklistIds;
  const activeChecklist = checklistDefinitions[activeChecklistId];
  const activeRecordChecklist = selectedDailyRecord?.checklists?.[activeChecklistId];
  const selectedMetric = trendMetricById.get(selectedMetricId) ?? trendMetrics[0];
  const medicalReportSubject = `${mission.name} - Medical Record - ${new Date().toLocaleDateString('en-US')}`;
  const dailyReportSubject = `${mission.name} - Daily Medical Summary - ${checklistDate}`;
  const dailyReportBody = buildDailyMedicalSummary(mission, checklistDate);
  const medicalReportBody = buildMedicalReport(mission);
  const dailyReportFilename = `${safeFilenamePart(mission.name)}-daily-medical-summary-${checklistDate}.txt`;
  const medicalRecordFilename = `${safeFilenamePart(mission.name)}-medical-record-${getDateInputValue()}.txt`;

  const latestReadingValue = (binding?: DeviceSourceBinding) => {
    if (!binding) {
      return undefined;
    }

    const matchingReadings = (mission.medicalDeviceReadings ?? [])
      .filter((reading) => reading.source === binding.source && reading.metrics[binding.metric])
      .sort((left, right) => right.capturedAt.localeCompare(left.capturedAt));

    const sameDay = matchingReadings.find((reading) => reading.capturedAt.slice(0, 10) === checklistDate);
    return sameDay?.metrics[binding.metric] ?? matchingReadings[0]?.metrics[binding.metric];
  };

  const getFieldValue = (field: ChecklistField) => {
    const savedValue = activeRecordChecklist?.fields[field.id]?.value;
    if (savedValue !== undefined) {
      return savedValue;
    }

    return latestReadingValue(field.source) ?? '';
  };

  const updateFieldValue = (field: ChecklistField, value: string) => {
    const importedValue = latestReadingValue(field.source);
    const source = field.source && value === importedValue ? field.source.source : 'manual';
    updateMedicalDailyChecklistField(checklistDate, activeChecklistId, field.id, value, source);
  };

  const openChecklist = (checklistId: MedicalDailyChecklistType) => {
    setActiveChecklistId(checklistId);
    setActiveView('checklist');
  };

  const handleRecoveryToggle = (checked: boolean) => {
    setMedicalRecoveryDay(checklistDate, checked);
    setActiveChecklistId(checked ? 'athlete-recovery' : 'athlete-pre-swim');
    setActiveView('dashboard');
  };

  const openPastDailyRecord = (record: MedicalDailyRecord, checklistType?: MedicalDailyChecklistType) => {
    const savedChecklistTypes = Object.keys(record.checklists ?? {}) as MedicalDailyChecklistType[];
    const filteredChecklist =
      pastFilters.checklistType !== 'all' && record.checklists?.[pastFilters.checklistType] ? pastFilters.checklistType : undefined;
    const nextChecklistType = checklistType ?? filteredChecklist ?? savedChecklistTypes[0];

    setChecklistDate(record.date);
    if (nextChecklistType) {
      setActiveChecklistId(nextChecklistType);
      setActiveView('checklist');
      return;
    }

    setActiveView('dashboard');
  };

  const openPastAdverseEvent = (entry: MedicalAdverseEvent) => {
    setSelectedAdverseEventId(entry.id);
    setActiveView('adverse');
  };

  const saveSharedSnapshot = async () => {
    setBackupStatus({ state: 'saving', detail: 'Saving the current mission record to Supabase.' });

    try {
      const result = await backupMissionSnapshot(mission);
      setBackupStatus({
        state: 'success',
        detail: `Shared Supabase snapshot saved at ${new Date(result.updatedAt).toLocaleTimeString()}.`
      });
    } catch (error) {
      setBackupStatus({
        state: 'error',
        detail: error instanceof Error ? error.message : 'Shared Supabase snapshot failed.'
      });
    }
  };

  const downloadDailySummary = () => {
    downloadText(dailyReportFilename, 'text/plain;charset=utf-8', dailyReportBody);
  };

  const downloadMedicalRecord = () => {
    downloadText(medicalRecordFilename, 'text/plain;charset=utf-8', medicalReportBody);
  };

  const handlePhotoUpload = async (files: FileList | null) => {
    const selectedFiles = Array.from(files ?? []);
    if (!selectedFiles.length) {
      return;
    }

    const capturedAt = new Date().toISOString();
    const photos = await Promise.all(
      selectedFiles.map(async (file) => ({
        id: `medical-photo-${capturedAt}-${file.name}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        dataUrl: await toDataUrl(file),
        capturedAt
      }))
    );

    setAdverseDraft((draft) => ({ ...draft, photos: [...draft.photos, ...photos] }));
  };

  const submitAdverseEvent = () => {
    if (!adverseDraft.description.trim()) {
      return;
    }

    addMedicalAdverseEvent({
      eventAt: toIsoFromInput(adverseDraft.eventAt),
      severity: adverseDraft.severity,
      description: adverseDraft.description.trim(),
      photos: adverseDraft.photos,
      immediateActions: adverseDraft.immediateActions.trim(),
      followUpRequired: adverseDraft.followUpRequired.trim(),
      resolutionStatus: adverseDraft.resolutionStatus
    });
    setAdverseDraft({
      eventAt: getDateTimeInputValue(),
      severity: 'watch',
      description: '',
      immediateActions: '',
      followUpRequired: '',
      resolutionStatus: 'open',
      photos: []
    });
  };

  const getTrendPoints = (metric: TrendMetric): TrendPoint[] => {
    const dailyPoints = (mission.medicalDailyRecords ?? []).flatMap((record) =>
      metric.fields.flatMap((field) => {
        const value = record.checklists?.[field.checklistType]?.fields[field.fieldId]?.value;
        const parsedValue = parseMetricValue(value);
        return parsedValue === undefined
          ? []
          : [
              {
                date: record.date,
                value: parsedValue,
                source: checklistDefinitions[field.checklistType].title
              }
            ];
      })
    );
    const devicePoints = (mission.medicalDeviceReadings ?? []).flatMap((reading) =>
      (metric.deviceMetrics ?? []).flatMap((deviceMetric) => {
        if (deviceMetric.source !== reading.source) {
          return [];
        }

        const parsedValue = parseMetricValue(reading.metrics[deviceMetric.metric]);
        return parsedValue === undefined
          ? []
          : [
              {
                date: reading.capturedAt.slice(0, 10),
                value: parsedValue,
                source: reading.source.toUpperCase()
              }
            ];
      })
    );

    return [...dailyPoints, ...devicePoints].sort((left, right) => left.date.localeCompare(right.date));
  };

  const allTrendRows = () =>
    trendMetrics.flatMap((metric) =>
      getTrendPoints(metric).map((point) => ({
        metric: metric.label,
        unit: metric.unit,
        ...point
      }))
    );

  const trendPoints = getTrendPoints(selectedMetric);
  const trendHighlights = useMemo(() => {
    const highlights: string[] = [];
    const firstLastDelta = (metricId: string) => {
      const metric = trendMetricById.get(metricId);
      if (!metric) {
        return undefined;
      }

      const points = getTrendPoints(metric);
      if (points.length < 2) {
        return undefined;
      }

      return points[points.length - 1].value - points[0].value;
    };
    const weightDelta = firstLastDelta('weight');
    const rhrDelta = firstLastDelta('restingHeartRate');
    const hrvDelta = firstLastDelta('hrv');
    const sorenessDelta = firstLastDelta('soreness');
    const fatigueDelta = firstLastDelta('fatigue');
    const sleepPoints = getTrendPoints(trendMetricById.get('sleep') ?? trendMetrics[3]).slice(-3);
    const abnormalUrineCount = (mission.medicalAdverseEvents ?? []).filter((event) => /abnormal urine|urine dipstick/i.test(event.description)).length;

    if (weightDelta !== undefined && weightDelta <= -3) {
      highlights.push(`Progressive weight loss: ${Math.abs(weightDelta).toFixed(1)} lb down.`);
    }

    if (rhrDelta !== undefined && rhrDelta >= 5) {
      highlights.push(`Resting heart rate rising: ${rhrDelta.toFixed(0)} bpm above first saved value.`);
    }

    if (hrvDelta !== undefined && hrvDelta <= -10) {
      highlights.push(`HRV declining: ${Math.abs(hrvDelta).toFixed(0)} ms down.`);
    }

    if (abnormalUrineCount >= 2) {
      highlights.push(`Repeated abnormal urine findings: ${abnormalUrineCount} events.`);
    }

    if (sorenessDelta !== undefined && sorenessDelta >= 2) {
      highlights.push(`Soreness increasing: ${sorenessDelta.toFixed(1)} points up.`);
    }

    if (fatigueDelta !== undefined && fatigueDelta >= 2) {
      highlights.push(`Fatigue increasing: ${fatigueDelta.toFixed(1)} points up.`);
    }

    if (sleepPoints.length >= 2 && sleepPoints.reduce((sum, point) => sum + point.value, 0) / sleepPoints.length < 6) {
      highlights.push('Poor sleep trend: recent saved sleep average is under 6 hours.');
    }

    if ((mission.medicalAdverseEvents ?? []).length >= 3) {
      highlights.push(`Repeated adverse events: ${(mission.medicalAdverseEvents ?? []).length} total logged.`);
    }

    return highlights;
  }, [mission.medicalAdverseEvents, mission.medicalDailyRecords, mission.medicalDeviceReadings]);

  const exportCsv = () => {
    const rows = allTrendRows();
    const csv = [
      ['Date', 'Metric', 'Value', 'Unit', 'Source'].map(escapeCsv).join(','),
      ...rows.map((row) => [row.date, row.metric, row.value, row.unit, row.source].map(escapeCsv).join(','))
    ].join('\n');
    downloadText(`medical-trends-${getDateInputValue()}.csv`, 'text/csv;charset=utf-8', csv);
  };

  const exportExcel = () => {
    const rows = allTrendRows();
    const tableRows = rows
      .map(
        (row) =>
          `<tr><td>${row.date}</td><td>${row.metric}</td><td>${row.value}</td><td>${row.unit}</td><td>${row.source}</td></tr>`
      )
      .join('');
    downloadText(
      `medical-trends-${getDateInputValue()}.xls`,
      'application/vnd.ms-excel;charset=utf-8',
      `<table><thead><tr><th>Date</th><th>Metric</th><th>Value</th><th>Unit</th><th>Source</th></tr></thead><tbody>${tableRows}</tbody></table>`
    );
  };

  const exportPdf = () => {
    const rows = allTrendRows();
    const report = window.open('', '_blank');
    if (!report) {
      return;
    }

    report.document.write(`
      <html>
        <head><title>Medical Trends</title></head>
        <body>
          <h1>Medical Trends</h1>
          <p>${mission.name}</p>
          <ul>${trendHighlights.map((highlight) => `<li>${highlight}</li>`).join('')}</ul>
          <table border="1" cellspacing="0" cellpadding="6">
            <thead><tr><th>Date</th><th>Metric</th><th>Value</th><th>Unit</th><th>Source</th></tr></thead>
            <tbody>${rows
              .map(
                (row) =>
                  `<tr><td>${row.date}</td><td>${row.metric}</td><td>${row.value}</td><td>${row.unit}</td><td>${row.source}</td></tr>`
              )
              .join('')}</tbody>
          </table>
        </body>
      </html>
    `);
    report.document.close();
    report.print();
  };

  const filteredDailyRecords = (mission.medicalDailyRecords ?? []).filter((record) => {
    if (pastFilters.date && record.date !== pastFilters.date) {
      return false;
    }

    if (pastFilters.recoveryOnly && record.dayType !== 'recovery') {
      return false;
    }

    if (pastFilters.checklistType !== 'all' && !record.checklists?.[pastFilters.checklistType]) {
      return false;
    }

    return !pastFilters.adverseOnly;
  });
  const filteredAdverseEvents = (mission.medicalAdverseEvents ?? []).filter((event) => {
    if (pastFilters.date && event.eventAt.slice(0, 10) !== pastFilters.date) {
      return false;
    }

    return pastFilters.checklistType === 'all';
  });

  const renderField = (field: ChecklistField) => {
    const value = getFieldValue(field);
    const importedValue = latestReadingValue(field.source);
    const fieldSource = activeRecordChecklist?.fields[field.id]?.source;
    const isImported = fieldSource && fieldSource !== 'manual';

    return (
      <label className={`field-label ${field.kind === 'textarea' ? 'span-fields' : ''}`} key={field.id}>
        {field.label}
        {field.kind === 'textarea' ? (
          <textarea
            className="textarea"
            value={value}
            onChange={(event) => updateFieldValue(field, event.target.value)}
            placeholder={field.placeholder}
          />
        ) : null}
        {field.kind === 'select' ? (
          <select className="select" value={value} onChange={(event) => updateFieldValue(field, event.target.value)}>
            <option value="">Select</option>
            {(field.options ?? []).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : null}
        {field.kind === 'scale' ? (
          <div className="medical-scale-row">
            <input
              aria-label={field.label}
              max={field.max ?? 10}
              min={field.min ?? 1}
              type="range"
              value={value || String(field.min ?? 1)}
              onChange={(event) => updateFieldValue(field, event.target.value)}
            />
            <output>{value || field.min || 1}</output>
          </div>
        ) : null}
        {field.kind === 'number' || field.kind === 'text' ? (
          <input
            className="input"
            type={field.kind === 'number' ? 'number' : 'text'}
            value={value}
            onChange={(event) => updateFieldValue(field, event.target.value)}
            placeholder={field.placeholder}
          />
        ) : null}
        {importedValue && !activeRecordChecklist?.fields[field.id] ? (
          <span className="row-meta">Prefilled from {field.source?.source.toUpperCase()}</span>
        ) : null}
        {isImported ? <span className="row-meta">Imported from {String(fieldSource).toUpperCase()}</span> : null}
      </label>
    );
  };

  const renderDashboard = () => (
    <section className="panel span-12 medical-dashboard" aria-label="Medical Monitoring dashboard">
      <div className="panel-header medical-dashboard-header">
        <div>
          <h3 className="panel-title">Medical Monitoring</h3>
          <p className="panel-subtitle">Today's required checklists</p>
        </div>
        <div className="medical-day-controls">
          <label className="field-label compact">
            Date
            <input className="input" type="date" value={checklistDate} onChange={(event) => setChecklistDate(event.target.value || getDateInputValue())} />
          </label>
          <label className="medical-toggle">
            <input type="checkbox" checked={isRecoveryDay} onChange={(event) => handleRecoveryToggle(event.target.checked)} />
            Recovery day
          </label>
          <span className={online ? 'sync-pill online' : 'sync-pill offline'}>
            {online ? 'Online' : `${offlineQueue.length} queued offline`}
          </span>
          <span className={syncPillClass(syncStatus)} title={syncStatus.detail}>
            {medicalSyncLabel(syncStatus, offlineQueue.length)}
          </span>
        </div>
      </div>

      <div className="medical-primary-tiles">
        {currentChecklistIds.map((checklistId) => {
          const definition = checklistDefinitions[checklistId];
          const checklist = selectedDailyRecord?.checklists?.[checklistId];

          return (
            <button className={`medical-task-tile ${checklistStatusClass(checklist)}`} key={checklistId} type="button" onClick={() => openChecklist(checklistId)}>
              <span className="medical-task-icon">{definition.role === 'medic' ? <HeartPulse aria-hidden="true" /> : <ClipboardCheck aria-hidden="true" />}</span>
              <span>
                <strong>{definition.title}</strong>
                <small>{checklistStatusLabel(checklist)}</small>
              </span>
            </button>
          );
        })}
        <button
          className="medical-task-tile adverse"
          type="button"
          onClick={() => {
            setSelectedAdverseEventId(undefined);
            setActiveView('adverse');
          }}
        >
          <span className="medical-task-icon">
            <Plus aria-hidden="true" />
          </span>
          <span>
            <strong>Log Adverse Event</strong>
            <small>always available</small>
          </span>
        </button>
      </div>

      <div className="medical-secondary-nav" aria-label="Medical secondary navigation">
        <button className="button" type="button" onClick={() => setActiveView('past')}>
          <History aria-hidden="true" />
          Past Logs
        </button>
        <button className="button" type="button" onClick={() => setActiveView('trends')}>
          <LineChart aria-hidden="true" />
          Trends
        </button>
        <button className="button" type="button" onClick={() => setActiveView('data')}>
          <Mail aria-hidden="true" />
          Email / Export
        </button>
        <button className="button" type="button" onClick={() => setActiveView('safety')}>
          <ShieldAlert aria-hidden="true" />
          Safety & Emergency
        </button>
      </div>
    </section>
  );

  const renderChecklist = () => (
    <section className="panel span-12">
      <div className="panel-header">
        <div>
          <h3 className="panel-title">{activeChecklist.title}</h3>
          <p className="panel-subtitle">{activeChecklist.purpose}</p>
        </div>
        <button className="button ghost" type="button" onClick={() => setActiveView('dashboard')}>
          Today
        </button>
      </div>
      <div className="medical-checklist-form">{activeChecklist.fields.map(renderField)}</div>
      <div className="row-actions medical-form-actions">
        <button className="button primary" type="button" onClick={() => completeMedicalDailyChecklist(checklistDate, activeChecklistId)}>
          <CheckCircle2 aria-hidden="true" />
          Mark Complete
        </button>
        <span className="row-meta">Auto-saved on every change.</span>
      </div>
    </section>
  );

  const renderAdverseEvent = () => (
    <section className="panel span-12">
      <div className="panel-header">
        <div>
          <h3 className="panel-title">Adverse Event Log</h3>
          <p className="panel-subtitle">Jellyfish stings, abnormal urine, injury, illness, GI symptoms, heat/cold exposure, unexpected fatigue, or abnormal observations</p>
        </div>
        <button className="button ghost" type="button" onClick={() => setActiveView('dashboard')}>
          Today
        </button>
      </div>
      {selectedAdverseEvent ? (
        <article className={`daily-checklist-row selected ${selectedAdverseEvent.resolutionStatus === 'resolved' ? 'done' : selectedAdverseEvent.severity === 'watch' ? 'watch' : 'escalated'}`}>
          <div className="split-row">
            <div>
              <div className="row-title">{selectedAdverseEvent.description}</div>
              <div className="row-meta">
                {formatClock(selectedAdverseEvent.eventAt)} - entered {formatClock(selectedAdverseEvent.enteredAt)} - {selectedAdverseEvent.severity}
              </div>
            </div>
            <span className={`severity-pill ${selectedAdverseEvent.severity === 'emergency' ? 'critical' : selectedAdverseEvent.severity === 'watch' ? 'info' : 'warning'}`}>
              {selectedAdverseEvent.resolutionStatus}
            </span>
          </div>
          <span className="alert-detail">{selectedAdverseEvent.immediateActions || 'No immediate actions recorded.'}</span>
          {selectedAdverseEvent.followUpRequired ? <span className="row-meta">{selectedAdverseEvent.followUpRequired}</span> : null}
          {selectedAdverseEvent.photos.length ? <span className="row-meta">{selectedAdverseEvent.photos.length} photo(s)</span> : null}
        </article>
      ) : null}
      <div className="medical-log-form">
        <label className="field-label">
          Event date and time
          <input className="input" type="datetime-local" value={adverseDraft.eventAt} onChange={(event) => setAdverseDraft((draft) => ({ ...draft, eventAt: event.target.value }))} />
        </label>
        <label className="field-label">
          Severity
          <select className="select" value={adverseDraft.severity} onChange={(event) => setAdverseDraft((draft) => ({ ...draft, severity: event.target.value as MedicalAdverseEventSeverity }))}>
            {severityOptions.map((severity) => (
              <option key={severity} value={severity}>
                {severity}
              </option>
            ))}
          </select>
        </label>
        <label className="field-label">
          Resolution status
          <select className="select" value={adverseDraft.resolutionStatus} onChange={(event) => setAdverseDraft((draft) => ({ ...draft, resolutionStatus: event.target.value as MedicalAdverseEventResolutionStatus }))}>
            {resolutionOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <label className="field-label">
          Photos
          <input className="input" multiple type="file" accept="image/*" onChange={(event) => handlePhotoUpload(event.target.files)} />
          {adverseDraft.photos.length ? <span className="row-meta">{adverseDraft.photos.length} photo(s) attached</span> : null}
        </label>
        <label className="field-label span-fields">
          Description
          <textarea className="textarea" value={adverseDraft.description} onChange={(event) => setAdverseDraft((draft) => ({ ...draft, description: event.target.value }))} />
        </label>
        <label className="field-label span-fields">
          Immediate actions taken
          <textarea className="textarea" value={adverseDraft.immediateActions} onChange={(event) => setAdverseDraft((draft) => ({ ...draft, immediateActions: event.target.value }))} />
        </label>
        <label className="field-label span-fields">
          Follow-up required
          <textarea className="textarea" value={adverseDraft.followUpRequired} onChange={(event) => setAdverseDraft((draft) => ({ ...draft, followUpRequired: event.target.value }))} />
        </label>
        <button className="button primary medical-submit" type="button" onClick={submitAdverseEvent} disabled={!adverseDraft.description.trim()}>
          <Plus aria-hidden="true" />
          Log Adverse Event
        </button>
      </div>

      <div className="daily-checklist-list medical-event-list">
        {(mission.medicalAdverseEvents ?? []).map((entry) => (
          <article className={`daily-checklist-row ${entry.resolutionStatus === 'resolved' ? 'done' : entry.severity === 'watch' ? 'watch' : 'escalated'}`} key={entry.id}>
            <div className="split-row">
              <div>
                <div className="row-title">{entry.description}</div>
                <div className="row-meta">
                  {formatClock(entry.eventAt)} - entered {formatClock(entry.enteredAt)} - {entry.severity}
                </div>
              </div>
              <span className={`severity-pill ${entry.severity === 'emergency' ? 'critical' : entry.severity === 'watch' ? 'info' : 'warning'}`}>
                {entry.resolutionStatus}
              </span>
            </div>
            <span className="alert-detail">{entry.immediateActions || 'No immediate actions recorded.'}</span>
            {entry.followUpRequired ? <span className="row-meta">{entry.followUpRequired}</span> : null}
            {entry.photos.length ? <span className="row-meta">{entry.photos.length} photo(s)</span> : null}
            {entry.resolutionStatus !== 'resolved' ? (
              <button className="button ghost" type="button" onClick={() => resolveMedicalAdverseEvent(entry.id)}>
                Resolve
              </button>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );

  const renderPastLogs = () => (
    <section className="panel span-12">
      <div className="panel-header">
        <div>
          <h3 className="panel-title">Past Logs</h3>
          <p className="panel-subtitle">Browse saved checklists and adverse events</p>
        </div>
        <button className="button ghost" type="button" onClick={() => setActiveView('dashboard')}>
          Today
        </button>
      </div>
      <div className="medical-filter-row">
        <label className="field-label">
          Date
          <input className="input" type="date" value={pastFilters.date} onChange={(event) => setPastFilters((filters) => ({ ...filters, date: event.target.value }))} />
        </label>
        <label className="field-label">
          Checklist type
          <select className="select" value={pastFilters.checklistType} onChange={(event) => setPastFilters((filters) => ({ ...filters, checklistType: event.target.value as 'all' | MedicalDailyChecklistType }))}>
            <option value="all">All</option>
            {Object.values(checklistDefinitions).map((definition) => (
              <option key={definition.id} value={definition.id}>
                {definition.title}
              </option>
            ))}
          </select>
        </label>
        <label className="medical-toggle">
          <input type="checkbox" checked={pastFilters.recoveryOnly} onChange={(event) => setPastFilters((filters) => ({ ...filters, recoveryOnly: event.target.checked }))} />
          Recovery days
        </label>
        <label className="medical-toggle">
          <input type="checkbox" checked={pastFilters.adverseOnly} onChange={(event) => setPastFilters((filters) => ({ ...filters, adverseOnly: event.target.checked }))} />
          Adverse events
        </label>
      </div>

      <div className="daily-checklist-list">
        {filteredDailyRecords.map((record) => (
          <article className="daily-checklist-row is-openable" key={record.id} onDoubleClick={() => openPastDailyRecord(record)}>
            <div className="split-row">
              <div>
                <div className="row-title">{record.date}</div>
                <div className="row-meta">{record.dayType ?? 'swim'} day</div>
              </div>
              <span className="severity-pill info">{Object.values(record.checklists ?? {}).length} checklist(s)</span>
            </div>
            {Object.values(record.checklists ?? {}).map((checklist) => (
              <button className="row-meta medical-log-open-line" key={checklist.checklistType} type="button" onClick={() => openPastDailyRecord(record, checklist.checklistType)}>
                {medicalChecklistTitle(checklist.checklistType)} - {checklist.status}
              </button>
            ))}
          </article>
        ))}
        {filteredAdverseEvents.map((entry) => (
          <article className="daily-checklist-row escalated is-openable" key={entry.id} onDoubleClick={() => openPastAdverseEvent(entry)}>
            <button className="row-title medical-log-open-line title" type="button" onClick={() => openPastAdverseEvent(entry)}>
              {entry.description}
            </button>
            <div className="row-meta">
              {entry.eventAt.slice(0, 10)} - {entry.severity} - {entry.resolutionStatus}
            </div>
          </article>
        ))}
        {!filteredDailyRecords.length && !filteredAdverseEvents.length ? <div className="empty-state">No past logs match these filters.</div> : null}
      </div>
    </section>
  );

  const renderTrendChart = () => {
    if (!trendPoints.length) {
      return <div className="empty-state">No trend data saved for this metric yet.</div>;
    }

    const width = 680;
    const height = 240;
    const padding = 28;
    const values = trendPoints.map((point) => point.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const pointString = trendPoints
      .map((point, index) => {
        const x = padding + (index / Math.max(1, trendPoints.length - 1)) * (width - padding * 2);
        const y = height - padding - ((point.value - min) / range) * (height - padding * 2);
        return `${x},${y}`;
      })
      .join(' ');

    return (
      <div className="medical-chart-wrap">
        <svg className="medical-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${selectedMetric.label} trend chart`}>
          <polyline points={pointString} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          {trendPoints.map((point, index) => {
            const x = padding + (index / Math.max(1, trendPoints.length - 1)) * (width - padding * 2);
            const y = height - padding - ((point.value - min) / range) * (height - padding * 2);
            return (
              <g key={`${point.date}-${point.source}-${index}`}>
                <circle cx={x} cy={y} r="5" />
                <title>{`${point.date}: ${point.value} ${selectedMetric.unit} (${point.source})`}</title>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  const renderTrends = () => (
    <section className="panel span-12">
      <div className="panel-header">
        <div>
          <h3 className="panel-title">Trends</h3>
        </div>
        <button className="button ghost" type="button" onClick={() => setActiveView('dashboard')}>
          Today
        </button>
      </div>
      <div className="medical-filter-row">
        <label className="field-label">
          Metric
          <select className="select" value={selectedMetricId} onChange={(event) => setSelectedMetricId(event.target.value)}>
            {trendMetrics.map((metric) => (
              <option key={metric.id} value={metric.id}>
                {metric.label}
              </option>
            ))}
          </select>
        </label>
        <div className="row-actions medical-export-actions">
          <button className="button" type="button" onClick={exportExcel}>
            Excel
          </button>
          <button className="button" type="button" onClick={exportCsv}>
            CSV
          </button>
          <button className="button" type="button" onClick={exportPdf}>
            PDF
          </button>
        </div>
      </div>
      {renderTrendChart()}
      <div className="medical-highlight-list">
        {trendHighlights.length ? (
          trendHighlights.map((highlight) => (
            <span className="medical-highlight" key={highlight}>
              {highlight}
            </span>
          ))
        ) : (
          <span className="row-meta">No meaningful longitudinal changes flagged yet.</span>
        )}
      </div>
    </section>
  );

  const renderDataExport = () => (
    <section className="panel span-12">
      <div className="panel-header">
        <div>
          <h3 className="panel-title">Email / Export</h3>
          <p className="panel-subtitle">Open email drafts, download copies, and check shared save status</p>
        </div>
        <button className="button ghost" type="button" onClick={() => setActiveView('dashboard')}>
          Today
        </button>
      </div>

      <div className="medical-data-grid">
        <article className="daily-checklist-row span-fields">
          <div className="row-title">Email Medical Reports</div>
          <div className="medical-recipient-list">
            {medicalReportRecipients.map((recipient) => (
              <span className="medical-recipient" key={recipient}>
                {recipient}
              </span>
            ))}
          </div>
          <div className="row-actions medical-export-actions">
            <a className="button primary" href={mailtoHref(medicalEmail, dailyReportSubject, dailyReportBody)}>
              <Mail aria-hidden="true" />
              Open Daily Summary Email
            </a>
            <a className="button" href={mailtoHref(medicalEmail, medicalReportSubject, medicalReportBody)}>
              <Mail aria-hidden="true" />
              Open Full Medical Record Email
            </a>
          </div>
          <span className="alert-detail">
            Email opens your mail app with a copy of the report. Review recipients and content before sending.
          </span>
        </article>

        <article className="daily-checklist-row">
          <div className="row-title">Download Medical Copies</div>
          <div className="row-actions medical-export-actions">
            <button className="button primary" type="button" onClick={downloadDailySummary}>
              <FileDown aria-hidden="true" />
              Download Daily Summary
            </button>
            <button className="button" type="button" onClick={downloadMedicalRecord}>
              <FileDown aria-hidden="true" />
              Download Full Medical Record
            </button>
          </div>
          <span className="alert-detail">
            Downloads stay on this device and are not the system of record.
          </span>
        </article>

        <article className="daily-checklist-row">
          <div className="split-row">
            <div>
              <div className="row-title">Shared Save Status</div>
              <div className="row-meta">{syncStatus.detail}</div>
            </div>
            <span className={syncPillClass(syncStatus)}>{medicalSyncLabel(syncStatus, offlineQueue.length)}</span>
          </div>
          <span className="alert-detail">
            Supabase is the shared mission record when sync is enabled. This device also keeps a local offline copy.
          </span>
          <button className="button" type="button" onClick={saveSharedSnapshot} disabled={!isRemoteSyncAvailable() || backupStatus.state === 'saving'}>
            <Database aria-hidden="true" />
            {backupStatus.state === 'saving' ? 'Saving Shared Snapshot' : 'Save Shared Snapshot'}
          </button>
          <span className={`row-meta backup-status ${backupStatus.state}`}>{backupStatus.detail}</span>
        </article>
      </div>
    </section>
  );

  const renderSafety = () => (
    <section className="panel span-12" id="medical-record">
      <div className="panel-header">
        <div>
          <h3 className="panel-title">Safety & Emergency</h3>
          <p className="panel-subtitle">Medical, distress, and abort response</p>
        </div>
        <div className="row-actions">
          <button className="button ghost" type="button" onClick={() => setActiveView('dashboard')}>
            Today
          </button>
        </div>
      </div>
      <div className="mission-emergency-actions">
        <button className="emergency-button medical compact" type="button" onClick={() => triggerEmergency('medical')}>
          <Ambulance aria-hidden="true" />
          Medical
        </button>
        <button className="emergency-button compact" type="button" onClick={() => triggerEmergency('distress')}>
          <ShieldAlert aria-hidden="true" />
          Distress
        </button>
        <button className="emergency-button abort compact" type="button" onClick={() => triggerEmergency('abort')}>
          <ShieldAlert aria-hidden="true" />
          Abort
        </button>
      </div>
      <div className="medical-safety-grid">
        <article className="daily-checklist-row">
          <h4 className="row-title">Medical contacts</h4>
          {mission.contacts
            .filter((contact) => /medical|physician|emergency/i.test(`${contact.role} ${contact.channel}`))
            .map((contact) => (
              <span className="row-meta" key={contact.id}>
                {contact.name} - {contact.role} - {contact.phone || contact.channel}
              </span>
            ))}
        </article>
        {mission.protocols
          .filter((protocol) => ['medical', 'distress', 'abort'].includes(protocol.kind))
          .map((protocol) => (
            <article className="daily-checklist-row" key={protocol.kind}>
              <h4 className="row-title">{protocol.title}</h4>
              {protocol.steps.map((step) => (
                <span className="row-meta" key={step.id}>
                  {step.order}. {step.label} ({step.ownerRole})
                </span>
              ))}
            </article>
          ))}
      </div>
    </section>
  );

  return (
    <div className="page-grid medical-page">
      {renderDashboard()}
      {activeView === 'checklist' ? renderChecklist() : null}
      {activeView === 'adverse' ? renderAdverseEvent() : null}
      {activeView === 'past' ? renderPastLogs() : null}
      {activeView === 'trends' ? renderTrends() : null}
      {activeView === 'data' ? renderDataExport() : null}
      {activeView === 'safety' ? renderSafety() : null}
    </div>
  );
}

function medicalChecklistTitle(checklistType: MedicalDailyChecklistType) {
  return checklistDefinitions[checklistType].title;
}

export function SafetyEmergency() {
  return <SafetyEmergencyView />;
}
