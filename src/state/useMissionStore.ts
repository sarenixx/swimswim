import { createContext, createElement, useContext, type ReactNode } from 'react';
import { addHours, addMinutes } from 'date-fns';
import { create, type StoreApi, type UseBoundStore } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createOfflineQueueEntry, type OfflineQueueEntry } from '../lib/storage/offlineQueue';
import { buildLiveSeedMission, buildTemplateSeedMission, emergencyLabels, legacyLiveMissionName, liveMissionName } from './seed';
import type {
  Alert,
  ChecklistItem,
  CommunicationMessage,
  CrewMember,
  CrewRole,
  DailySessionInfo,
  EmergencyKind,
  EnvironmentalConditions,
  ExpeditionCheckpoint,
  MedicalAdverseEvent,
  MedicalChecklistItem,
  MedicalChecklistStatus,
  MedicalDailyChecklistType,
  MedicalDailyChecklistItemRecord,
  MedicalDailyRecord,
  MedicalDeviceSource,
  MedicalSymptomEntry,
  FeedingPlanItem,
  MedicalVitals,
  Mission,
  MissionSetupInput,
  OperationalTimelineItem,
  QuickLogKind,
  SwimmerConditionLevel,
  TimelineEvent,
  WellnessRatings,
  WildlifeSighting,
  WowsaPhotoEntry
} from './types';

export interface MissionOverviewEdit {
  name: string;
  swimmerName: string;
  swimmers?: string[];
  location: string;
  plannedDistance: string;
  plannedStartTime: string;
  status: Mission['status'];
}

export interface SafetyPlanEdit {
  emergencyContactName: string;
  emergencyContactRole: string;
  emergencyContactPhone: string;
  emergencyContactChannel: string;
  tideWindow: string;
  weatherSource: string;
  abortConditionsText: string;
  medicalConcernsText: string;
}

export interface MissionStore {
  mission: Mission;
  activeActorId: string;
  selectedRole: CrewRole;
  online: boolean;
  offlineQueue: OfflineQueueEntry[];
  loadSeedMission: () => void;
  resetMission: () => void;
  replaceMissionFromSync: (mission: Mission) => void;
  setActiveActor: (actorId: string) => void;
  setSelectedRole: (role: CrewRole) => void;
  startObservationSession: (input: {
    at?: string;
    gps: string;
    lat?: number;
    lon?: number;
    gpsAccuracyM?: number;
    weatherSummary?: string;
    airTempF?: number;
    waterTempF?: number;
    windKts?: number;
    windDirection?: string;
    actorId?: string;
  }) => void;
  completeObservationSession: (actorId?: string) => void;
  startMissionFromSetup: (input: MissionSetupInput) => void;
  updateMissionOverview: (input: MissionOverviewEdit) => void;
  resetMissionOverview: () => void;
  updateOperationalTimelineItemDetails: (itemId: string, input: Pick<OperationalTimelineItem, 'label' | 'at' | 'ownerId' | 'notes'>) => void;
  resetOperationalTimeline: () => void;
  updateCrewMemberDetails: (memberId: string, input: Pick<CrewMember, 'name' | 'phone' | 'role' | 'backupPlan'> & { responsibilityText: string }) => void;
  addCrewMember: () => void;
  resetCrew: () => void;
  updateFeedingPlanItemDetails: (itemId: string, input: Pick<FeedingPlanItem, 'label' | 'calories' | 'hydrationOz' | 'electrolytesMg' | 'notes' | 'backup'>) => void;
  addFeedingPlanItem: () => void;
  updateFeedingInterval: (minutes: number) => void;
  resetFeedingPlan: () => void;
  updateSafetyPlan: (input: SafetyPlanEdit) => void;
  resetSafetyPlan: () => void;
  completeChecklistItem: (itemId: string, actorId?: string) => void;
  completeOperationalTimelineItem: (itemId: string, actorId?: string) => void;
  setChecklistOwner: (itemId: string, ownerId: string) => void;
  logEvent: (event: Omit<TimelineEvent, 'id' | 'at'> & { at?: string }) => void;
  removeTimelineEvent: (eventId: string) => void;
  logQuickAction: (kind: QuickLogKind, actorId?: string) => void;
  triggerEmergency: (kind: EmergencyKind, actorId?: string) => void;
  scheduleNextFeeding: (fromIsoTime?: string) => void;
  updateSwimmerCondition: (level: SwimmerConditionLevel, note: string, actorId?: string) => void;
  sendMessage: (message: Omit<CommunicationMessage, 'id' | 'at'> & { at?: string }) => void;
  updateSessionField: <K extends keyof DailySessionInfo>(field: K, value: DailySessionInfo[K]) => void;
  updateMedicalVitalsField: <K extends keyof MedicalVitals>(field: K, value: MedicalVitals[K]) => void;
  updateWellnessRating: <K extends keyof WellnessRatings>(field: K, value: WellnessRatings[K]) => void;
  updateMedicalChecklistItem: (
    itemId: string,
    input: { status: MedicalChecklistStatus; note?: string; nextReviewAt?: string },
    actorId?: string
  ) => void;
  updateMedicalDailyChecklistItem: (
    date: string,
    itemId: string,
    input: { status: MedicalChecklistStatus; note?: string },
    actorId?: string
  ) => void;
  setMedicalRecoveryDay: (date: string, isRecoveryDay: boolean, actorId?: string) => void;
  updateMedicalDailyChecklistField: (
    date: string,
    checklistType: MedicalDailyChecklistType,
    fieldId: string,
    value: string,
    source?: MedicalDeviceSource,
    actorId?: string
  ) => void;
  completeMedicalDailyChecklist: (
    date: string,
    checklistType: MedicalDailyChecklistType,
    actorId?: string
  ) => void;
  addMedicalAdverseEvent: (
    entry: Omit<MedicalAdverseEvent, 'id' | 'enteredAt' | 'enteredBy'> & {
      enteredAt?: string;
      enteredBy?: string;
    }
  ) => void;
  resolveMedicalAdverseEvent: (entryId: string, actorId?: string) => void;
  addMedicalSymptomEntry: (
    entry: Omit<MedicalSymptomEntry, 'id' | 'at' | 'actorId' | 'status' | 'resolvedAt' | 'resolvedBy'> & {
      at?: string;
      actorId?: string;
      status?: MedicalSymptomEntry['status'];
    }
  ) => void;
  resolveMedicalSymptomEntry: (entryId: string, actorId?: string) => void;
  addWildlifeSighting: (
    sighting: Omit<WildlifeSighting, 'id' | 'at' | 'actorId'> & { at?: string; actorId?: string }
  ) => void;
  removeWildlifeSighting: (sightingId: string) => void;
  addWowsaPhoto: (
    photo: Omit<WowsaPhotoEntry, 'id' | 'number' | 'at' | 'actorId' | 'evidenceStatus'> & { at?: string; actorId?: string }
  ) => void;
  removeWowsaPhoto: (photoId: string) => void;
  addExpeditionCheckpoint: (
    checkpoint: Omit<ExpeditionCheckpoint, 'id' | 'at' | 'actorId'> & { at?: string; actorId?: string }
  ) => void;
  acknowledgeAlert: (alertId: string) => void;
  resolveAlert: (alertId: string) => void;
  setOnlineStatus: (isOnline: boolean) => void;
  completePartnerTask: (taskId: string) => void;
}

const makeId = (prefix: string, at: string) => `${prefix}-${at}-${Math.random().toString(36).slice(2, 8)}`;

const getDefaultOnlineStatus = () => (typeof navigator === 'undefined' ? true : navigator.onLine);

const clampInterval = (value: number, fallback: number) => {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(5, Math.min(180, Math.round(value)));
};

const parseGpsCoordinates = (label: string) => {
  const matches = [...label.matchAll(/(-?\d+(?:\.\d+)?)\s*°?\s*([NSEW])?/gi)];
  if (matches.length < 2) {
    return undefined;
  }

  const [latMatch, lonMatch] = matches;
  const signed = (match: RegExpMatchArray) => {
    const value = Number(match[1]);
    const hemisphere = match[2]?.toUpperCase();
    return hemisphere === 'S' || hemisphere === 'W' ? -Math.abs(value) : value;
  };

  const lat = signed(latMatch);
  const lon = signed(lonMatch);

  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : undefined;
};

const resetChecklistForStart = (items: ChecklistItem[], startAt: string): ChecklistItem[] => {
  const start = new Date(startAt);
  const dueOffsets: Record<string, number> = {
    'in-feeding-readiness': 5,
    'in-condition-scan': 15,
    'in-kayak-check': 20,
    'mental-captain-load': 60,
    'mental-team-rotation': 120,
    'mental-swimmer-supported': 180,
    'mental-concerns-communicated': 240
  };

  return items.map((item) => ({
    ...item,
    completedAt: undefined,
    completedBy: undefined,
    status: 'pending',
    dueAt: dueOffsets[item.id] !== undefined ? addMinutes(start, dueOffsets[item.id]).toISOString() : undefined
  }));
};

const resetOperationalTimelineForStart = (items: OperationalTimelineItem[], startAt: string, feedingIntervalMinutes: number): OperationalTimelineItem[] => {
  const start = new Date(startAt);
  const offsets: Record<string, number> = {
    'op-arrival': -150,
    'op-loadout': -105,
    'op-observer-brief': -75,
    'op-warmup': -45,
    'op-boat-launch': -30,
    'op-swim-start': 0,
    'op-next-feed': feedingIntervalMinutes,
    'op-observer-sync': 45,
    'op-risk-window': 60,
    'op-recovery-standby': 240
  };
  const alreadyDone = new Set(['op-arrival', 'op-loadout', 'op-observer-brief', 'op-warmup', 'op-boat-launch', 'op-swim-start']);

  return items.map((item) => {
    const at = addMinutes(start, offsets[item.id] ?? 0).toISOString();
    const done = alreadyDone.has(item.id);
    return {
      ...item,
      at,
      status: done ? 'done' : 'pending',
      completedAt: done ? at : undefined,
      completedBy: done ? item.ownerId : undefined
    };
  });
};

const lateByMinutes = (dueAt: string | undefined, completedAt: string) => {
  if (!dueAt) {
    return undefined;
  }

  const lateMs = new Date(completedAt).getTime() - new Date(dueAt).getTime();
  return lateMs > 0 ? Math.ceil(lateMs / 60000) : undefined;
};

const quickLogEvents: Record<QuickLogKind, Omit<TimelineEvent, 'id' | 'at' | 'actorId'>> = {
  'feeding-completed': {
    type: 'feeding',
    summary: 'Feeding completed',
    detail: 'Nutrition handoff logged and next feeding scheduled.',
    severity: 'info'
  },
  'fatigue-observed': {
    type: 'condition',
    summary: 'Swimmer showing fatigue',
    detail: 'Monitor stroke cadence, breathing pattern, and response clarity.',
    severity: 'warning'
  },
  'course-adjustment': {
    type: 'course',
    summary: 'Course adjustment',
    detail: 'Boat team adjusted bearing to hold target track.',
    severity: 'info'
  },
  'weather-shift': {
    type: 'weather',
    summary: 'Weather shift incoming',
    detail: 'Safety lead should verify threshold risk and next check-in time.',
    severity: 'warning'
  },
  'shift-handover': {
    type: 'shift',
    summary: 'Shift handover',
    detail: 'Active crew ownership transferred and acknowledged.',
    severity: 'info'
  },
  'check-in-confirmed': {
    type: 'check-in',
    summary: 'Team check-in confirmed',
    detail: 'All required teams confirmed status.',
    severity: 'info'
  }
};

const emergencyDetails: Record<EmergencyKind, Pick<Alert, 'kind' | 'title' | 'detail' | 'severity'>> = {
  medical: {
    kind: 'medical',
    title: 'Medical issue active',
    detail: 'Medic takes command of clinical assessment. Captain confirms swim status.',
    severity: 'critical'
  },
  distress: {
    kind: 'distress',
    title: 'Swimmer distress active',
    detail: 'All teams shift to distress protocol. Maintain eyes on swimmer and prepare extraction.',
    severity: 'critical'
  },
  abort: {
    kind: 'abort',
    title: 'Abort swim active',
    detail: 'Captain has initiated abort workflow. Execute extraction and recovery protocol.',
    severity: 'critical'
  }
};

const appendTimeline = (mission: Mission, event: TimelineEvent): Mission => {
  const timeline = [event, ...mission.timeline].slice(0, 250);
  let nextFeedingAt = mission.nextFeedingAt;
  let lastFeedingAt = mission.lastFeedingAt;

  if (event.type === 'feeding') {
    lastFeedingAt = event.at;
    nextFeedingAt = addMinutes(new Date(event.at), mission.feedingIntervalMinutes).toISOString();
  }

  return {
    ...mission,
    lastFeedingAt,
    nextFeedingAt,
    timeline
  };
};

const queueIfOffline = (
  online: boolean,
  offlineQueue: OfflineQueueEntry[],
  action: string,
  payload: unknown,
  at: string
) => (online ? offlineQueue : [...offlineQueue, createOfflineQueueEntry(action, payload, at)]);

const getMedicalDailyRecord = (
  records: MedicalDailyRecord[],
  date: string,
  at: string,
  actorId: string
): MedicalDailyRecord => {
  const existing = records.find((record) => record.date === date);

  return {
    id: existing?.id ?? `medical-daily-record-${date}`,
    date,
    dayType: existing?.dayType ?? 'swim',
    updatedAt: at,
    updatedBy: actorId,
    items: existing?.items ?? [],
    checklists: existing?.checklists ?? {}
  };
};

const upsertMedicalDailyRecord = (records: MedicalDailyRecord[], updatedRecord: MedicalDailyRecord) =>
  [updatedRecord, ...records.filter((record) => record.date !== updatedRecord.date)].sort((left, right) =>
    right.date.localeCompare(left.date)
  );

const isAbnormalUrineResult = (value: string) => {
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized === 'normal' || normalized === 'negative' || normalized === 'clear') {
    return false;
  }

  return /abnormal|trace|positive|blood|protein|ketone|nitrite|leukocyte|dark|cola|high/i.test(normalized);
};

const linesToList = (value: string) =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

export function createLiveStateFromTemplate(templateMission: Mission, now = new Date()) {
  const startedAt = now.toISOString();
  const captain = getCaptain(templateMission);
  const activeActorId = captain?.id ?? templateMission.crew[0]?.id ?? 'crew-captain';
  const selectedRole = captain?.role ?? templateMission.crew[0]?.role ?? 'captain';
  const startGpsLabel = templateMission.session.gpsStart.trim() || templateMission.position.label || 'Start GPS pending';
  const parsedGps = parseGpsCoordinates(startGpsLabel);

  const startCheckpoint = parsedGps
    ? [
        {
          id: makeId('checkpoint-start', startedAt),
          at: startedAt,
          lat: parsedGps.lat,
          lon: parsedGps.lon,
          gps: startGpsLabel,
          label: 'Start checkpoint',
          note: 'Live project duplicated from reusable template.',
          actorId: activeActorId
        }
      ]
    : [];

  const mission: Mission = {
    ...templateMission,
    id: makeId('mission-live', startedAt),
    mode: 'live',
    status: 'preparing',
    startedAt,
    lastFeedingAt: startedAt,
    nextFeedingAt: addMinutes(now, templateMission.feedingIntervalMinutes).toISOString(),
    checklistItems: resetChecklistForStart(templateMission.checklistItems, startedAt),
    operationalTimeline: resetOperationalTimelineForStart(
      templateMission.operationalTimeline ?? [],
      startedAt,
      templateMission.feedingIntervalMinutes
    ),
    timeline: [
      {
        id: makeId('event-template-duplicate', startedAt),
        type: 'note',
        at: startedAt,
        actorId: activeActorId,
        summary: 'Template duplicated to live project',
        detail: 'Review Mission Setup, confirm team details, and start expedition when ready.',
        severity: 'info'
      }
    ],
    alerts: [],
    swimmerConditions: [
      {
        id: makeId('condition-live-start', startedAt),
        at: startedAt,
        actorId: activeActorId,
        level: 'steady',
        note: 'Baseline condition ready. Log first structured scan after launch.'
      }
    ],
    communications: [
      {
        id: makeId('message-live-start', startedAt),
        channel: 'broadcast',
        at: startedAt,
        actorId: activeActorId,
        body: 'Live mission created from reusable template. Confirm roles and cadence before launch.',
        requiresConfirmation: true
      }
    ],
    partnerTasks: templateMission.partnerTasks.map((task) => ({ ...task, status: 'pending' })),
    wildlifeSightings: [],
    wowsaPhotos: [],
    expeditionCheckpoints: startCheckpoint,
    position: parsedGps
      ? { lat: parsedGps.lat, lon: parsedGps.lon, label: startGpsLabel, updatedAt: startedAt }
      : { ...templateMission.position, label: startGpsLabel, updatedAt: startedAt },
    activeProtocolKind: undefined,
    conditions: {
      ...templateMission.conditions,
      observedAt: startedAt
    }
  };

  return {
    mission,
    activeActorId,
    selectedRole,
    online: getDefaultOnlineStatus(),
    offlineQueue: [] as OfflineQueueEntry[]
  };
}

type MissionStoreHook = UseBoundStore<StoreApi<MissionStore>>;

const getCaptain = (mission: Mission) => mission.crew.find((member) => member.role === 'captain') ?? mission.crew[0];

const buildInitialState = (seedBuilder: () => Mission) => {
  const mission = seedBuilder();
  const captain = getCaptain(mission);

  return {
    mission,
    activeActorId: captain?.id ?? '',
    selectedRole: captain?.role ?? 'captain',
    online: getDefaultOnlineStatus(),
    offlineQueue: [] as OfflineQueueEntry[]
  };
};

type PersistedMissionState = Pick<MissionStore, 'mission' | 'activeActorId' | 'selectedRole' | 'online' | 'offlineQueue'>;

const mergeById = <T extends { id: string }>(persistedItems: T[], seededItems: T[]): T[] => {
  const persistedById = new Map(persistedItems.map((item) => [item.id, item]));
  const seededIds = new Set(seededItems.map((item) => item.id));

  return [
    ...seededItems.map((seededItem) => persistedById.get(seededItem.id) ?? seededItem),
    ...persistedItems.filter((item) => !seededIds.has(item.id))
  ];
};

const mergeUniqueStrings = (persistedItems: string[], seededItems: string[]): string[] => [
  ...persistedItems,
  ...seededItems.filter((item) => !persistedItems.includes(item))
];

const mergePersistedMissionState = (persistedState: unknown, currentState: MissionStore): MissionStore => {
  const persisted = persistedState as Partial<PersistedMissionState> | undefined;
  let merged: MissionStore = {
    ...currentState,
    ...persisted
  };

  if (merged.mission?.name === legacyLiveMissionName) {
    merged = {
      ...merged,
      mission: {
        ...merged.mission,
        name: liveMissionName
      }
    };
  }

  const medicalChecklist =
    Array.isArray(merged.mission.medicalChecklist) && merged.mission.medicalChecklist.length
      ? mergeById(merged.mission.medicalChecklist, currentState.mission.medicalChecklist)
      : currentState.mission.medicalChecklist;
  const medicalSymptomLog = Array.isArray(merged.mission.medicalSymptomLog)
    ? merged.mission.medicalSymptomLog
    : currentState.mission.medicalSymptomLog;
  const legacyAdverseEvents: MedicalAdverseEvent[] = medicalSymptomLog.map((entry) => ({
    id: `adverse-${entry.id}`,
    eventAt: entry.at,
    enteredAt: entry.enteredAt ?? entry.at,
    enteredBy: entry.actorId,
    severity: entry.severity,
    description: entry.symptom,
    photos: [],
    immediateActions: entry.actionTaken,
    followUpRequired: entry.nextReviewAt ?? '',
    resolutionStatus: entry.status === 'resolved' ? 'resolved' : entry.status === 'monitoring' ? 'follow-up' : 'open',
    source: 'legacy medical change log',
    resolvedAt: entry.resolvedAt,
    resolvedBy: entry.resolvedBy
  }));
  const medicalAdverseEvents = Array.isArray(merged.mission.medicalAdverseEvents)
    ? merged.mission.medicalAdverseEvents
    : legacyAdverseEvents;
  const medicalDeviceReadings = Array.isArray(merged.mission.medicalDeviceReadings)
    ? merged.mission.medicalDeviceReadings
    : currentState.mission.medicalDeviceReadings;
  const medicalDailyRecords = Array.isArray(merged.mission.medicalDailyRecords)
    ? merged.mission.medicalDailyRecords
    : currentState.mission.medicalDailyRecords;
  const contacts = mergeById(merged.mission.contacts, currentState.mission.contacts);
  const checklistItems = mergeById(merged.mission.checklistItems, currentState.mission.checklistItems);
  const hasMedicalSymptomLog = Array.isArray(merged.mission.medicalSymptomLog);
  const hasMedicalDailyRecords = Array.isArray(merged.mission.medicalDailyRecords);
  const hasMedicalAdverseEvents = Array.isArray(merged.mission.medicalAdverseEvents);
  const hasMedicalDeviceReadings = Array.isArray(merged.mission.medicalDeviceReadings);
  const medicalChecklistLength = Array.isArray(merged.mission.medicalChecklist) ? merged.mission.medicalChecklist.length : 0;

  if (merged.mission.mode !== 'live') {
    if (
      hasMedicalSymptomLog &&
      hasMedicalDailyRecords &&
      hasMedicalAdverseEvents &&
      hasMedicalDeviceReadings &&
      checklistItems.length === merged.mission.checklistItems.length &&
      medicalChecklist.length === medicalChecklistLength
    ) {
      return merged;
    }

    return {
      ...merged,
      mission: {
        ...merged.mission,
        checklistItems,
        medicalChecklist,
        medicalDailyRecords,
        medicalSymptomLog,
        medicalAdverseEvents,
        medicalDeviceReadings
      }
    };
  }

  const seededMedicalProtocol = currentState.mission.protocols.find((protocol) => protocol.kind === 'medical');

  return {
    ...merged,
    mission: {
      ...merged.mission,
      contacts,
      checklistItems,
      medicalChecklist,
      medicalDailyRecords,
      medicalSymptomLog,
      medicalAdverseEvents,
      medicalDeviceReadings,
      riskPlan: {
        ...merged.mission.riskPlan,
        abortConditions: mergeUniqueStrings(merged.mission.riskPlan.abortConditions, currentState.mission.riskPlan.abortConditions),
        medicalConcerns: mergeUniqueStrings(merged.mission.riskPlan.medicalConcerns, currentState.mission.riskPlan.medicalConcerns),
        mitigationNotes: mergeUniqueStrings(merged.mission.riskPlan.mitigationNotes, currentState.mission.riskPlan.mitigationNotes)
      },
      protocols: merged.mission.protocols.map((protocol) =>
        protocol.kind === 'medical' && seededMedicalProtocol ? seededMedicalProtocol : protocol
      )
    }
  };
};

const createMissionStore = (storageName: string, seedBuilder: () => Mission): MissionStoreHook =>
  create<MissionStore>()(
    persist(
      (set, get) => ({
        ...buildInitialState(seedBuilder),

        loadSeedMission: () => {
          set(buildInitialState(seedBuilder));
        },

        resetMission: () => {
          get().loadSeedMission();
        },

        replaceMissionFromSync: (mission) => {
          set((state) => {
            const currentActorExists = mission.crew.some((member) => member.id === state.activeActorId);
            const currentRoleExists = mission.crew.some((member) => member.role === state.selectedRole);
            const captain = getCaptain(mission);

            return {
              ...state,
              mission,
              activeActorId: currentActorExists ? state.activeActorId : captain?.id ?? state.activeActorId,
              selectedRole: currentRoleExists ? state.selectedRole : captain?.role ?? state.selectedRole
            };
          });
        },

        setActiveActor: (actorId) => set({ activeActorId: actorId }),

        setSelectedRole: (role) => set({ selectedRole: role }),

        startObservationSession: (input) => {
          const at = input.at ?? new Date().toISOString();
          const activeActorId = input.actorId ?? get().activeActorId;

          set((state) => {
            const currentWaterTemp = input.waterTempF ?? state.mission.conditions.waterTempF;
            const conditions: EnvironmentalConditions = {
              ...state.mission.conditions,
              observedAt: at,
              summary: input.weatherSummary ?? state.mission.conditions.summary,
              airTempF: input.airTempF ?? state.mission.conditions.airTempF,
              waterTempF: currentWaterTemp,
              windKts: input.windKts ?? state.mission.conditions.windKts
            };
            const photoNumber = (state.mission.wowsaPhotos ?? []).length + 1;
            const firstObservation: WowsaPhotoEntry = {
              id: makeId('wowsa-observation', at),
              number: photoNumber,
              at,
              actorId: activeActorId,
              gps: input.gps,
              lat: input.lat,
              lon: input.lon,
              gpsAccuracyM: input.gpsAccuracyM,
              distanceSwum: '',
              notes: 'Session started; swimmer photo pending.',
              weatherSummary: conditions.summary,
              airTempF: conditions.airTempF,
              waterTempF: conditions.waterTempF,
              windKts: conditions.windKts,
              windDirection: input.windDirection,
              feedCompleted: false,
              eventTag: 'session-start',
              hasPhoto: false,
              evidenceStatus: input.gps ? 'needs-image' : 'needs-gps'
            };
            const event: TimelineEvent = {
              id: makeId('event-observation-start', at),
              type: 'note',
              at,
              actorId: activeActorId,
              summary: 'Observation session started',
              detail: 'First 30-minute observation entry created automatically.',
              gps: input.gps,
              lat: input.lat,
              lon: input.lon,
              gpsAccuracyM: input.gpsAccuracyM,
              weatherSummary: conditions.summary,
              airTempF: conditions.airTempF,
              waterTempF: conditions.waterTempF,
              windKts: conditions.windKts,
              windDirection: input.windDirection,
              severity: 'info'
            };

            return {
              ...state,
              mission: appendTimeline(
                {
                  ...state.mission,
                  status: 'active',
                  startedAt: at,
                  lastFeedingAt: at,
                  nextFeedingAt: addMinutes(new Date(at), state.mission.feedingIntervalMinutes).toISOString(),
                  wowsaPhotoIntervalMinutes: 30,
                  conditions,
                  position:
                    input.lat !== undefined && input.lon !== undefined
                      ? {
                          lat: input.lat,
                          lon: input.lon,
                          label: input.gps,
                          updatedAt: at
                        }
                      : state.mission.position,
                  wowsaPhotos: [firstObservation, ...(state.mission.wowsaPhotos ?? [])],
                  expeditionCheckpoints:
                    input.lat !== undefined && input.lon !== undefined
                      ? [
                          {
                            id: makeId('checkpoint-observation-start', at),
                            at,
                            actorId: activeActorId,
                            lat: input.lat,
                            lon: input.lon,
                            gps: input.gps,
                            accuracyM: input.gpsAccuracyM,
                            label: 'Observation session start',
                            note: conditions.summary
                          },
                          ...(state.mission.expeditionCheckpoints ?? [])
                        ]
                      : state.mission.expeditionCheckpoints
                },
                event
              ),
              offlineQueue: queueIfOffline(state.online, state.offlineQueue, 'observation-session-start', firstObservation, at)
            };
          });
        },

        completeObservationSession: (actorId) => {
          const at = new Date().toISOString();
          const activeActorId = actorId ?? get().activeActorId;
          const event: TimelineEvent = {
            id: makeId('event-observation-complete', at),
            type: 'note',
            at,
            actorId: activeActorId,
            summary: 'Observation session completed',
            detail: 'Official observation record closed for export and backup.',
            severity: 'info'
          };

          set((state) => ({
            ...state,
            mission: appendTimeline(
              {
                ...state.mission,
                status: 'completed'
              },
              event
            ),
            offlineQueue: queueIfOffline(state.online, state.offlineQueue, 'observation-session-complete', event, at)
          }));
        },

        startMissionFromSetup: (input) => {
          const requestedStart = new Date(input.startAt);
          const start = Number.isNaN(requestedStart.getTime()) ? new Date() : requestedStart;
          const startedAt = start.toISOString();
          const feedingIntervalMinutes = clampInterval(input.feedingIntervalMinutes, 30);
          const wowsaPhotoIntervalMinutes = clampInterval(input.wowsaPhotoIntervalMinutes, 30);
          const startGps = input.gpsStart.trim();
          const parsedGps = parseGpsCoordinates(startGps);

          set((state) => {
            const crew = state.mission.crew.map((member) => {
              const assignment = input.crew.find((candidate) => candidate.id === member.id);
              const shiftHours = member.role === 'medical' || member.role === 'boat' ? 6 : 4;

              return {
                ...member,
                name: assignment?.name.trim() || member.name,
                phone: assignment?.phone.trim() || member.phone,
                shiftStart: startedAt,
                shiftEnd: addHours(start, shiftHours).toISOString()
              };
            });
            const captain = crew.find((member) => member.role === 'captain') ?? crew[0];
            if (!captain) {
              return state;
            }

            const medic = crew.find((member) => member.role === 'medical');
            const position = parsedGps
              ? { lat: parsedGps.lat, lon: parsedGps.lon, label: startGps, updatedAt: startedAt }
              : {
                  ...state.mission.position,
                  label: startGps || 'Start GPS pending',
                  updatedAt: startedAt
                };
            const startCheckpoint = parsedGps
              ? [
                  {
                    id: makeId('checkpoint-start', startedAt),
                    at: startedAt,
                    lat: parsedGps.lat,
                    lon: parsedGps.lon,
                    gps: startGps,
                    label: 'Start checkpoint',
                    note: 'Expedition start GPS recorded from mission setup.',
                    actorId: captain.id
                  }
                ]
              : [];
            const startEvent: TimelineEvent = {
              id: makeId('event-start', startedAt),
              type: 'note',
              at: startedAt,
              actorId: captain.id,
              summary: 'Expedition started',
              detail: `Feeding every ${feedingIntervalMinutes} min. WOWSA photo every ${wowsaPhotoIntervalMinutes} min.`,
              severity: 'info'
            };
            const startMessage: CommunicationMessage = {
              id: makeId('message-start', startedAt),
              channel: 'broadcast',
              at: startedAt,
              actorId: captain.id,
              body: 'Expedition started. All teams hold assigned roles and confirm first cadence windows.',
              requiresConfirmation: true
            };
            const firstCondition = {
              id: makeId('condition-start', startedAt),
              at: startedAt,
              actorId: medic?.id ?? captain.id,
              level: 'steady' as const,
              note: 'Initial swim condition awaiting first structured scan.'
            };

            return {
              ...state,
              activeActorId: captain.id,
              selectedRole: captain.role,
              mission: {
                ...state.mission,
                id: makeId('mission', startedAt),
                name: input.name.trim() || state.mission.name,
                status: 'active',
                startedAt,
                feedingIntervalMinutes,
                wowsaPhotoIntervalMinutes,
                lastFeedingAt: startedAt,
                nextFeedingAt: addMinutes(start, feedingIntervalMinutes).toISOString(),
                crew,
                checklistItems: resetChecklistForStart(state.mission.checklistItems, startedAt),
                operationalTimeline: resetOperationalTimelineForStart(
                  state.mission.operationalTimeline ?? [],
                  startedAt,
                  feedingIntervalMinutes
                ),
                timeline: [startEvent],
                alerts: [],
                conditions: {
                  ...state.mission.conditions,
                  observedAt: startedAt
                },
                swimmerConditions: [firstCondition],
                contacts: state.mission.contacts.map((contact) =>
                  contact.id === 'contact-leadership'
                    ? { ...contact, name: captain.name, phone: captain.phone }
                    : contact.id === 'contact-doctor' && medic
                      ? { ...contact, name: medic.name, phone: medic.phone }
                      : contact
                ),
                communications: [startMessage],
                session: {
                  ...state.mission.session,
                  swimmerName: input.swimmerName.trim(),
                  location: input.location.trim(),
                  plannedDistance: input.plannedDistance.trim(),
                  plannedStartTime: start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  gpsStart: startGps,
                  gpsEnd: input.gpsEnd.trim(),
                  primaryVessel: input.primaryVessel.trim(),
                  supportVessels: input.supportVessels.trim(),
                  leadCrew: input.leadCrew.trim(),
                  completedBy: input.completedBy.trim() || captain.name,
                  operationsEmail: input.operationsEmail.trim() || state.mission.session.operationsEmail
                },
                wildlifeSightings: [],
                wowsaPhotos: [],
                expeditionCheckpoints: startCheckpoint,
                position,
                activeProtocolKind: undefined
              },
              offlineQueue: queueIfOffline(state.online, state.offlineQueue, 'start-mission-from-setup', input, startedAt)
            };
          });
        },

        updateMissionOverview: (input) => {
          set((state) => ({
            ...state,
            mission: {
              ...state.mission,
              name: input.name.trim() || state.mission.name,
              status: input.status,
              session: {
                ...state.mission.session,
                swimmerName: input.swimmerName.trim(),
                swimmers: input.swimmers?.map((swimmer) => swimmer.trim()).filter(Boolean) ?? [input.swimmerName.trim()].filter(Boolean),
                location: input.location.trim(),
                plannedDistance: input.plannedDistance.trim(),
                plannedStartTime: input.plannedStartTime.trim()
              }
            }
          }));
        },

        resetMissionOverview: () => {
          const seed = seedBuilder();
          set((state) => ({
            ...state,
            mission: {
              ...state.mission,
              name: seed.name,
              status: seed.status,
              session: seed.session,
              position: seed.position
            }
          }));
        },

        updateOperationalTimelineItemDetails: (itemId, input) => {
          set((state) => ({
            ...state,
            mission: {
              ...state.mission,
              operationalTimeline: (state.mission.operationalTimeline ?? []).map((item) =>
                item.id === itemId
                  ? {
                      ...item,
                      label: input.label.trim() || item.label,
                      at: input.at,
                      ownerId: input.ownerId,
                      notes: input.notes.trim()
                    }
                  : item
              )
            }
          }));
        },

        resetOperationalTimeline: () => {
          const seed = seedBuilder();
          set((state) => ({
            ...state,
            mission: {
              ...state.mission,
              operationalTimeline: seed.operationalTimeline
            }
          }));
        },

        updateCrewMemberDetails: (memberId, input) => {
          set((state) => ({
            ...state,
            mission: {
              ...state.mission,
              crew: state.mission.crew.some((member) => member.id === memberId)
                ? state.mission.crew.map((member) =>
                    member.id === memberId
                      ? {
                          ...member,
                          name: input.name.trim() || member.name,
                          phone: input.phone.trim(),
                          role: input.role,
                          responsibilities: linesToList(input.responsibilityText),
                          backupPlan: input.backupPlan?.trim() ?? ''
                        }
                      : member
                  )
                : [
                    ...state.mission.crew,
                    {
                      id: memberId,
                      name: input.name.trim() || 'New crew member',
                      phone: input.phone.trim(),
                      role: input.role,
                      shiftStart: state.mission.startedAt,
                      shiftEnd: addHours(new Date(state.mission.startedAt), 4).toISOString(),
                      responsibilities: linesToList(input.responsibilityText),
                      backupPlan: input.backupPlan?.trim() ?? ''
                    }
                  ]
            }
          }));
        },

        addCrewMember: () => {
          const at = new Date().toISOString();
          set((state) => ({
            ...state,
            mission: {
              ...state.mission,
              crew: [
                ...state.mission.crew,
                {
                  id: makeId('crew-custom', at),
                  name: 'New crew member',
                  role: 'safety',
                  phone: '',
                  shiftStart: state.mission.startedAt,
                  shiftEnd: addHours(new Date(state.mission.startedAt), 4).toISOString(),
                  responsibilities: ['Confirm responsibility'],
                  backupPlan: 'Confirm backup owner during planning session.'
                }
              ]
            }
          }));
        },

        resetCrew: () => {
          const seed = seedBuilder();
          const captain = getCaptain(seed);
          set((state) => ({
            ...state,
            activeActorId: captain?.id ?? state.activeActorId,
            selectedRole: captain?.role ?? state.selectedRole,
            mission: {
              ...state.mission,
              crew: seed.crew,
              contacts: seed.contacts
            }
          }));
        },

        updateFeedingPlanItemDetails: (itemId, input) => {
          set((state) => ({
            ...state,
            mission: {
              ...state.mission,
              feedingPlan: (state.mission.feedingPlan ?? []).some((item) => item.id === itemId)
                ? (state.mission.feedingPlan ?? []).map((item) =>
                    item.id === itemId
                      ? {
                          ...item,
                          label: input.label.trim() || item.label,
                          calories: input.calories,
                          hydrationOz: input.hydrationOz,
                          electrolytesMg: input.electrolytesMg,
                          notes: input.notes.trim(),
                          backup: input.backup
                        }
                      : item
                  )
                : [
                    ...(state.mission.feedingPlan ?? []),
                    {
                      id: itemId,
                      label: input.label.trim() || 'New feed option',
                      intervalMinutes: state.mission.feedingIntervalMinutes,
                      calories: input.calories,
                      hydrationOz: input.hydrationOz,
                      electrolytesMg: input.electrolytesMg,
                      notes: input.notes.trim(),
                      backup: input.backup
                    }
                  ]
            }
          }));
        },

        addFeedingPlanItem: () => {
          const at = new Date().toISOString();
          set((state) => ({
            ...state,
            mission: {
              ...state.mission,
              feedingPlan: [
                ...(state.mission.feedingPlan ?? []),
                {
                  id: makeId('feed-custom', at),
                  label: 'New feed option',
                  intervalMinutes: state.mission.feedingIntervalMinutes,
                  calories: 0,
                  hydrationOz: 0,
                  electrolytesMg: 0,
                  notes: 'Add prep and handoff notes.',
                  backup: true
                }
              ]
            }
          }));
        },

        updateFeedingInterval: (minutes) => {
          const interval = clampInterval(minutes, get().mission.feedingIntervalMinutes);
          set((state) => ({
            ...state,
            mission: {
              ...state.mission,
              feedingIntervalMinutes: interval,
              nextFeedingAt: addMinutes(new Date(state.mission.lastFeedingAt), interval).toISOString(),
              feedingPlan: (state.mission.feedingPlan ?? []).map((item) => ({ ...item, intervalMinutes: item.backup ? item.intervalMinutes : interval }))
            }
          }));
        },

        resetFeedingPlan: () => {
          const seed = seedBuilder();
          set((state) => ({
            ...state,
            mission: {
              ...state.mission,
              feedingIntervalMinutes: seed.feedingIntervalMinutes,
              lastFeedingAt: seed.lastFeedingAt,
              nextFeedingAt: seed.nextFeedingAt,
              feedingPlan: seed.feedingPlan
            }
          }));
        },

        updateSafetyPlan: (input) => {
          const at = new Date().toISOString();
          const activeActorId = get().activeActorId;

          set((state) => {
            const [primaryContact, ...restContacts] = state.mission.contacts;
            const event: TimelineEvent = {
              id: makeId('event-safety-plan', at),
              type: 'weather',
              at,
              actorId: activeActorId,
              summary: 'Safety/risk plan updated',
              detail: 'Weather window, source, stop criteria, and medical concerns reviewed.',
              severity: 'info'
            };

            return {
              ...state,
              mission: appendTimeline(
                {
                  ...state.mission,
                  contacts: [
                    {
                      ...(primaryContact ?? {
                        id: 'contact-primary',
                        name: '',
                        role: '',
                        phone: '',
                        channel: ''
                      }),
                      name: input.emergencyContactName.trim(),
                      role: input.emergencyContactRole.trim(),
                      phone: input.emergencyContactPhone.trim(),
                      channel: input.emergencyContactChannel.trim()
                    },
                    ...restContacts
                  ],
                  riskPlan: {
                    ...state.mission.riskPlan,
                    tideWindow: input.tideWindow.trim(),
                    weatherSource: input.weatherSource.trim(),
                    abortConditions: linesToList(input.abortConditionsText),
                    medicalConcerns: linesToList(input.medicalConcernsText)
                  }
                },
                event
              ),
              offlineQueue: queueIfOffline(state.online, state.offlineQueue, 'safety-plan-update', input, at)
            };
          });
        },

        resetSafetyPlan: () => {
          const seed = seedBuilder();
          set((state) => ({
            ...state,
            mission: {
              ...state.mission,
              contacts: seed.contacts,
              riskPlan: seed.riskPlan,
              conditions: seed.conditions
            }
          }));
        },

        completeChecklistItem: (itemId, actorId) => {
          const completedAt = new Date().toISOString();
          const activeActorId = actorId ?? get().activeActorId;

          set((state) => {
            const item = state.mission.checklistItems.find((candidate) => candidate.id === itemId);
            if (!item || item.status === 'done') {
              return state;
            }

            const lateMinutes = lateByMinutes(item.dueAt, completedAt);
            const updatedItem: ChecklistItem = {
              ...item,
              status: 'done',
              completedAt,
              completedBy: activeActorId
            };
            const event: TimelineEvent = {
              id: makeId('event-checklist', completedAt),
              type: 'note',
              at: completedAt,
              actorId: activeActorId,
              summary: 'Checklist item completed',
              detail: item.title,
              lateByMinutes: lateMinutes,
              severity: lateMinutes ? 'warning' : 'info'
            };

            return {
              ...state,
              mission: appendTimeline(
                {
                  ...state.mission,
                  checklistItems: state.mission.checklistItems.map((candidate) =>
                    candidate.id === itemId ? updatedItem : candidate
                  )
                },
                event
              ),
              offlineQueue: queueIfOffline(state.online, state.offlineQueue, 'complete-checklist-item', updatedItem, completedAt)
            };
          });
        },

        completeOperationalTimelineItem: (itemId, actorId) => {
          const completedAt = new Date().toISOString();
          const activeActorId = actorId ?? get().activeActorId;

          set((state) => {
            const item = (state.mission.operationalTimeline ?? []).find((candidate) => candidate.id === itemId);
            if (!item || item.status === 'done') {
              return state;
            }

            const lateMinutes = lateByMinutes(item.at, completedAt);
            const updatedItem: OperationalTimelineItem = {
              ...item,
              status: 'done',
              completedAt,
              completedBy: activeActorId
            };
            const event: TimelineEvent = {
              id: makeId('event-op-timeline', completedAt),
              type: item.category === 'feeding' ? 'feeding' : item.category === 'risk' ? 'weather' : 'note',
              at: completedAt,
              actorId: activeActorId,
              summary: 'Planned timeline item completed',
              detail: item.label,
              lateByMinutes: lateMinutes,
              severity: lateMinutes ? 'warning' : 'info'
            };

            return {
              ...state,
              mission: appendTimeline(
                {
                  ...state.mission,
                  operationalTimeline: (state.mission.operationalTimeline ?? []).map((candidate) =>
                    candidate.id === itemId ? updatedItem : candidate
                  )
                },
                event
              ),
              offlineQueue: queueIfOffline(state.online, state.offlineQueue, 'complete-operational-timeline-item', updatedItem, completedAt)
            };
          });
        },

        setChecklistOwner: (itemId, ownerId) => {
          set((state) => ({
            ...state,
            mission: {
              ...state.mission,
              checklistItems: state.mission.checklistItems.map((item) =>
                item.id === itemId ? { ...item, ownerId } : item
              )
            }
          }));
        },

        logEvent: (input) => {
          const at = input.at ?? new Date().toISOString();
          const { at: _ignoredAt, ...rest } = input;
          const event: TimelineEvent = {
            id: makeId('event', at),
            at,
            severity: rest.severity ?? 'info',
            ...rest
          };

          set((state) => ({
            ...state,
            mission: appendTimeline(state.mission, event),
            offlineQueue: queueIfOffline(state.online, state.offlineQueue, 'log-event', event, at)
          }));
        },

        removeTimelineEvent: (eventId) => {
          const at = new Date().toISOString();

          set((state) => ({
            ...state,
            mission: {
              ...state.mission,
              timeline: state.mission.timeline.filter((event) => event.id !== eventId)
            },
            offlineQueue: queueIfOffline(state.online, state.offlineQueue, 'remove-timeline-event', { eventId }, at)
          }));
        },

        logQuickAction: (kind, actorId) => {
          const activeActorId = actorId ?? get().activeActorId;
          const template = quickLogEvents[kind];
          const at = new Date().toISOString();
          const event: TimelineEvent = {
            ...template,
            id: makeId('event-quick', at),
            at,
            actorId: activeActorId
          };

          set((state) => {
            const alerts =
              kind === 'fatigue-observed'
                ? [
                    {
                      id: makeId('alert-fatigue', at),
                      kind: 'fatigue' as const,
                      title: 'Fatigue watch active',
                      detail: 'Fatigue has been observed. Medical and kayak teams should confirm condition at next interval.',
                      createdAt: at,
                      status: 'active' as const,
                      severity: 'warning' as const
                    },
                    ...state.mission.alerts
                  ]
                : kind === 'weather-shift'
                  ? [
                      {
                        id: makeId('alert-weather', at),
                        kind: 'weather-threshold' as const,
                        title: 'Weather watch active',
                        detail: 'Weather shift reported. Safety lead should verify threshold risk.',
                        createdAt: at,
                        status: 'active' as const,
                        severity: 'warning' as const
                      },
                      ...state.mission.alerts
                    ]
                  : state.mission.alerts;

            return {
              ...state,
              mission: appendTimeline({ ...state.mission, alerts }, event),
              offlineQueue: queueIfOffline(state.online, state.offlineQueue, 'quick-log', { kind, event }, at)
            };
          });
        },

        triggerEmergency: (kind, actorId) => {
          const activeActorId = actorId ?? get().activeActorId;
          const at = new Date().toISOString();
          const alertTemplate = emergencyDetails[kind];
          const alert: Alert = {
            ...alertTemplate,
            id: makeId(`alert-${kind}`, at),
            createdAt: at,
            status: 'active'
          };
          const event: TimelineEvent = {
            id: makeId(`event-${kind}`, at),
            type: 'emergency',
            at,
            actorId: activeActorId,
            summary: `${emergencyLabels[kind]} triggered`,
            detail: alert.detail,
            severity: 'critical'
          };
          const message: CommunicationMessage = {
            id: makeId('message-broadcast', at),
            channel: 'broadcast',
            at,
            actorId: activeActorId,
            body: `${emergencyLabels[kind]} active. All teams confirm status immediately.`,
            requiresConfirmation: true
          };

          set((state) => ({
            ...state,
            mission: appendTimeline(
              {
                ...state.mission,
                status: kind === 'abort' ? 'aborted' : 'paused',
                activeProtocolKind: kind,
                alerts: [alert, ...state.mission.alerts],
                communications: [message, ...state.mission.communications]
              },
              event
            ),
            offlineQueue: queueIfOffline(state.online, state.offlineQueue, 'trigger-emergency', { kind, alert, event }, at)
          }));
        },

        scheduleNextFeeding: (fromIsoTime) => {
          const from = fromIsoTime ? new Date(fromIsoTime) : new Date();
          set((state) => ({
            ...state,
            mission: {
              ...state.mission,
              nextFeedingAt: addMinutes(from, state.mission.feedingIntervalMinutes).toISOString()
            }
          }));
        },

        updateSwimmerCondition: (level, note, actorId) => {
          const activeActorId = actorId ?? get().activeActorId;
          const at = new Date().toISOString();
          const condition = {
            id: makeId('condition', at),
            at,
            actorId: activeActorId,
            level,
            note
          };
          const event: TimelineEvent = {
            id: makeId('event-condition', at),
            type: 'condition',
            at,
            actorId: activeActorId,
            summary: level === 'steady' ? 'Condition steady' : `Condition ${level}`,
            detail: note,
            severity: level === 'distress' ? 'critical' : level === 'steady' ? 'info' : 'warning'
          };

          set((state) => {
            const alerts =
              level === 'distress' || level === 'fatigue'
                ? [
                    {
                      id: makeId('alert-condition', at),
                      kind: level === 'distress' ? ('distress' as const) : ('fatigue' as const),
                      title: level === 'distress' ? 'Distress indicators observed' : 'Fatigue indicators observed',
                      detail: note,
                      createdAt: at,
                      status: 'active' as const,
                      severity: level === 'distress' ? ('critical' as const) : ('warning' as const)
                    },
                    ...state.mission.alerts
                  ]
                : state.mission.alerts;

            return {
              ...state,
              mission: appendTimeline(
                {
                  ...state.mission,
                  alerts,
                  swimmerConditions: [condition, ...state.mission.swimmerConditions]
                },
                event
              ),
              offlineQueue: queueIfOffline(state.online, state.offlineQueue, 'condition-update', condition, at)
            };
          });
        },

        sendMessage: (input) => {
          const at = input.at ?? new Date().toISOString();
          const { at: _ignoredAt, ...rest } = input;
          const message: CommunicationMessage = {
            id: makeId('message', at),
            at,
            ...rest
          };

          set((state) => ({
            ...state,
            mission: {
              ...state.mission,
              communications: [message, ...state.mission.communications]
            },
            offlineQueue: queueIfOffline(state.online, state.offlineQueue, 'send-message', message, at)
          }));
        },

        updateSessionField: (field, value) => {
          set((state) => ({
            ...state,
            mission: {
              ...state.mission,
              session: {
                ...state.mission.session,
                [field]: value
              }
            }
          }));
        },

        updateMedicalVitalsField: (field, value) => {
          set((state) => ({
            ...state,
            mission: {
              ...state.mission,
              medicalVitals: {
                ...state.mission.medicalVitals,
                [field]: value
              }
            }
          }));
        },

        updateWellnessRating: (field, value) => {
          set((state) => ({
            ...state,
            mission: {
              ...state.mission,
              wellnessRatings: {
                ...state.mission.wellnessRatings,
                [field]: value
              }
            }
          }));
        },

        updateMedicalChecklistItem: (itemId, input, actorId) => {
          const at = new Date().toISOString();
          const activeActorId = actorId ?? get().activeActorId;

          set((state) => {
            const item = state.mission.medicalChecklist.find((candidate) => candidate.id === itemId);
            if (!item) {
              return state;
            }

            const updatedItem: MedicalChecklistItem = {
              ...item,
              status: input.status,
              completedAt: input.status === 'pending' ? undefined : at,
              completedBy: input.status === 'pending' ? undefined : activeActorId,
              lastNote: input.note?.trim() || item.lastNote,
              nextReviewAt: input.nextReviewAt || item.nextReviewAt
            };
            const severity = input.status === 'escalated' ? 'critical' : input.status === 'watch' ? 'warning' : 'info';
            const event: TimelineEvent = {
              id: makeId('event-medical-check', at),
              type: 'condition',
              at,
              actorId: activeActorId,
              summary: `Medical checklist ${input.status}`,
              detail: `${item.title}${input.note?.trim() ? ` - ${input.note.trim()}` : ''}`,
              severity
            };
            const alert: Alert | undefined =
              input.status === 'escalated'
                ? {
                    id: makeId('alert-medical-check', at),
                    kind: 'medical',
                    title: 'Medical checklist escalation',
                    detail: event.detail ?? item.title,
                    createdAt: at,
                    status: 'active',
                    severity: 'critical'
                  }
                : undefined;

            return {
              ...state,
              mission: appendTimeline(
                {
                  ...state.mission,
                  medicalChecklist: state.mission.medicalChecklist.map((candidate) =>
                    candidate.id === itemId ? updatedItem : candidate
                  ),
                  alerts: alert ? [alert, ...state.mission.alerts] : state.mission.alerts
                },
                event
              ),
              offlineQueue: queueIfOffline(state.online, state.offlineQueue, 'medical-checklist-update', updatedItem, at)
            };
          });
        },

        updateMedicalDailyChecklistItem: (date, itemId, input, actorId) => {
          const at = new Date().toISOString();
          const activeActorId = actorId ?? get().activeActorId;

          set((state) => {
            const item = state.mission.medicalChecklist.find((candidate) => candidate.id === itemId);
            if (!item) {
              return state;
            }

            const existingRecord = state.mission.medicalDailyRecords.find((record) => record.date === date);
            const existingRecordItems = new Map(existingRecord?.items.map((recordItem) => [recordItem.itemId, recordItem]) ?? []);
            const updatedDailyItem: MedicalDailyChecklistItemRecord = {
              itemId,
              status: input.status,
              note: input.note?.trim() ?? existingRecordItems.get(itemId)?.note ?? '',
              completedAt: input.status === 'pending' ? undefined : at,
              completedBy: input.status === 'pending' ? undefined : activeActorId
            };
            const recordItems = state.mission.medicalChecklist.map<MedicalDailyChecklistItemRecord>((templateItem) => {
              if (templateItem.id === itemId) {
                return updatedDailyItem;
              }

              return (
                existingRecordItems.get(templateItem.id) ?? {
                  itemId: templateItem.id,
                  status: 'pending',
                  note: ''
                }
              );
            });
            const updatedRecord: MedicalDailyRecord = {
              id: existingRecord?.id ?? `medical-daily-record-${date}`,
              date,
              updatedAt: at,
              updatedBy: activeActorId,
              items: recordItems
            };
            const updatedChecklistItem: MedicalChecklistItem = {
              ...item,
              status: input.status,
              completedAt: input.status === 'pending' ? undefined : at,
              completedBy: input.status === 'pending' ? undefined : activeActorId,
              lastNote: input.note?.trim() || item.lastNote
            };
            const severity = input.status === 'escalated' ? 'critical' : input.status === 'watch' ? 'warning' : 'info';
            const event: TimelineEvent = {
              id: makeId('event-medical-daily-check', at),
              type: 'condition',
              at,
              actorId: activeActorId,
              summary: `Daily medical checklist ${input.status}`,
              detail: `${date}: ${item.title}${input.note?.trim() ? ` - ${input.note.trim()}` : ''}`,
              severity
            };
            const alert: Alert | undefined =
              input.status === 'escalated'
                ? {
                    id: makeId('alert-medical-daily-check', at),
                    kind: 'medical',
                    title: 'Daily medical checklist escalation',
                    detail: event.detail ?? item.title,
                    createdAt: at,
                    status: 'active',
                    severity: 'critical'
                  }
                : undefined;

            return {
              ...state,
              mission: appendTimeline(
                {
                  ...state.mission,
                  medicalChecklist: state.mission.medicalChecklist.map((candidate) =>
                    candidate.id === itemId ? updatedChecklistItem : candidate
                  ),
                  medicalDailyRecords: [
                    updatedRecord,
                    ...state.mission.medicalDailyRecords.filter((record) => record.date !== date)
                  ].sort((left, right) => right.date.localeCompare(left.date)),
                  alerts: alert ? [alert, ...state.mission.alerts] : state.mission.alerts
                },
                event
              ),
              offlineQueue: queueIfOffline(state.online, state.offlineQueue, 'medical-daily-checklist-update', updatedRecord, at)
            };
          });
        },

        setMedicalRecoveryDay: (date, isRecoveryDay, actorId) => {
          const at = new Date().toISOString();
          const activeActorId = actorId ?? get().activeActorId;

          set((state) => {
            const existingRecord = getMedicalDailyRecord(state.mission.medicalDailyRecords ?? [], date, at, activeActorId);
            const updatedRecord: MedicalDailyRecord = {
              ...existingRecord,
              dayType: isRecoveryDay ? 'recovery' : 'swim',
              updatedAt: at,
              updatedBy: activeActorId
            };

            return {
              ...state,
              mission: {
                ...state.mission,
                medicalDailyRecords: upsertMedicalDailyRecord(state.mission.medicalDailyRecords ?? [], updatedRecord)
              },
              offlineQueue: queueIfOffline(state.online, state.offlineQueue, 'medical-day-type-update', updatedRecord, at)
            };
          });
        },

        updateMedicalDailyChecklistField: (date, checklistType, fieldId, value, source = 'manual', actorId) => {
          const at = new Date().toISOString();
          const activeActorId = actorId ?? get().activeActorId;

          set((state) => {
            const existingRecord = getMedicalDailyRecord(state.mission.medicalDailyRecords ?? [], date, at, activeActorId);
            const existingChecklist = existingRecord.checklists?.[checklistType] ?? {
              checklistType,
              status: 'not-started' as const,
              fields: {}
            };
            const nextFields = {
              ...existingChecklist.fields,
              [fieldId]: {
                value,
                updatedAt: at,
                updatedBy: activeActorId,
                source
              }
            };
            const hasAnyValue = Object.values(nextFields).some((field) => field.value.trim());
            const updatedChecklist = {
              ...existingChecklist,
              status: existingChecklist.status === 'complete' ? 'complete' : hasAnyValue ? 'in-progress' as const : 'not-started' as const,
              fields: nextFields
            };
            const updatedRecord: MedicalDailyRecord = {
              ...existingRecord,
              updatedAt: at,
              updatedBy: activeActorId,
              checklists: {
                ...existingRecord.checklists,
                [checklistType]: updatedChecklist
              }
            };
            const sourceId = `${date}:${checklistType}:${fieldId}`;
            const shouldCreateUrineEvent =
              checklistType === 'medic-post-swim' &&
              fieldId === 'urineDipstickResults' &&
              isAbnormalUrineResult(value) &&
              !(state.mission.medicalAdverseEvents ?? []).some((event) => event.source === sourceId);
            const nextDailyRecords = upsertMedicalDailyRecord(state.mission.medicalDailyRecords ?? [], updatedRecord);

            if (!shouldCreateUrineEvent) {
              return {
                ...state,
                mission: {
                  ...state.mission,
                  medicalDailyRecords: nextDailyRecords
                },
                offlineQueue: queueIfOffline(state.online, state.offlineQueue, 'medical-daily-field-update', updatedRecord, at)
              };
            }

            const adverseEvent: MedicalAdverseEvent = {
              id: makeId('medical-adverse', at),
              eventAt: at,
              enteredAt: at,
              enteredBy: activeActorId,
              severity: 'urgent',
              description: `Abnormal urine dipstick result recorded: ${value}`,
              photos: [],
              immediateActions: 'Review urine finding, repeat assessment as indicated, and notify medical lead.',
              followUpRequired: 'Medical follow-up required for abnormal urine finding.',
              resolutionStatus: 'open',
              source: sourceId
            };
            const event: TimelineEvent = {
              id: makeId('event-medical-adverse-urine', at),
              type: 'condition',
              at,
              actorId: activeActorId,
              summary: 'Adverse event logged: abnormal urine',
              detail: adverseEvent.description,
              severity: 'warning'
            };

            return {
              ...state,
              mission: appendTimeline(
                {
                  ...state.mission,
                  medicalDailyRecords: nextDailyRecords,
                  medicalAdverseEvents: [adverseEvent, ...(state.mission.medicalAdverseEvents ?? [])]
                },
                event
              ),
              offlineQueue: queueIfOffline(
                state.online,
                state.offlineQueue,
                'medical-daily-field-update',
                { updatedRecord, adverseEvent },
                at
              )
            };
          });
        },

        completeMedicalDailyChecklist: (date, checklistType, actorId) => {
          const at = new Date().toISOString();
          const activeActorId = actorId ?? get().activeActorId;

          set((state) => {
            const existingRecord = getMedicalDailyRecord(state.mission.medicalDailyRecords ?? [], date, at, activeActorId);
            const existingChecklist = existingRecord.checklists?.[checklistType] ?? {
              checklistType,
              status: 'not-started' as const,
              fields: {}
            };
            const updatedChecklist = {
              ...existingChecklist,
              status: 'complete' as const,
              completedAt: at,
              completedBy: activeActorId
            };
            const updatedRecord: MedicalDailyRecord = {
              ...existingRecord,
              updatedAt: at,
              updatedBy: activeActorId,
              checklists: {
                ...existingRecord.checklists,
                [checklistType]: updatedChecklist
              }
            };
            const event: TimelineEvent = {
              id: makeId('event-medical-daily-complete', at),
              type: 'check-in',
              at,
              actorId: activeActorId,
              summary: `Medical checklist complete: ${checklistType}`,
              detail: `${date} checklist saved.`,
              severity: 'info'
            };

            return {
              ...state,
              mission: appendTimeline(
                {
                  ...state.mission,
                  medicalDailyRecords: upsertMedicalDailyRecord(state.mission.medicalDailyRecords ?? [], updatedRecord)
                },
                event
              ),
              offlineQueue: queueIfOffline(state.online, state.offlineQueue, 'medical-daily-checklist-complete', updatedRecord, at)
            };
          });
        },

        addMedicalAdverseEvent: (input) => {
          const enteredAt = input.enteredAt ?? new Date().toISOString();
          const activeActorId = input.enteredBy ?? get().activeActorId;
          const { enteredAt: _ignoredEnteredAt, enteredBy: _ignoredEnteredBy, ...rest } = input;
          const entry: MedicalAdverseEvent = {
            id: makeId('medical-adverse', enteredAt),
            enteredAt,
            enteredBy: activeActorId,
            ...rest
          };
          const severity = entry.severity === 'emergency' ? 'critical' : entry.severity === 'watch' ? 'info' : 'warning';
          const event: TimelineEvent = {
            id: makeId('event-medical-adverse', enteredAt),
            type: 'condition',
            at: enteredAt,
            actorId: activeActorId,
            summary: `Adverse event logged: ${entry.description.slice(0, 80)}`,
            detail: entry.immediateActions || entry.followUpRequired || 'Adverse medical event recorded.',
            severity
          };
          const alert: Alert | undefined =
            entry.severity === 'urgent' || entry.severity === 'emergency'
              ? {
                  id: makeId('alert-medical-adverse', enteredAt),
                  kind: 'medical',
                  title: entry.severity === 'emergency' ? 'Emergency adverse event' : 'Urgent adverse event',
                  detail: entry.description,
                  createdAt: enteredAt,
                  status: 'active',
                  severity: entry.severity === 'emergency' ? 'critical' : 'warning'
                }
              : undefined;

          set((state) => ({
            ...state,
            mission: appendTimeline(
              {
                ...state.mission,
                medicalAdverseEvents: [entry, ...(state.mission.medicalAdverseEvents ?? [])],
                alerts: alert ? [alert, ...state.mission.alerts] : state.mission.alerts
              },
              event
            ),
            offlineQueue: queueIfOffline(state.online, state.offlineQueue, 'medical-adverse-event', entry, enteredAt)
          }));
        },

        resolveMedicalAdverseEvent: (entryId, actorId) => {
          const at = new Date().toISOString();
          const activeActorId = actorId ?? get().activeActorId;

          set((state) => {
            const entry = (state.mission.medicalAdverseEvents ?? []).find((candidate) => candidate.id === entryId);
            if (!entry || entry.resolutionStatus === 'resolved') {
              return state;
            }

            const resolvedEntry: MedicalAdverseEvent = {
              ...entry,
              resolutionStatus: 'resolved',
              resolvedAt: at,
              resolvedBy: activeActorId
            };
            const event: TimelineEvent = {
              id: makeId('event-medical-adverse-resolved', at),
              type: 'condition',
              at,
              actorId: activeActorId,
              summary: 'Adverse event resolved',
              detail: entry.description,
              severity: 'info'
            };

            return {
              ...state,
              mission: appendTimeline(
                {
                  ...state.mission,
                  medicalAdverseEvents: (state.mission.medicalAdverseEvents ?? []).map((candidate) =>
                    candidate.id === entryId ? resolvedEntry : candidate
                  )
                },
                event
              ),
              offlineQueue: queueIfOffline(state.online, state.offlineQueue, 'medical-adverse-event-resolved', resolvedEntry, at)
            };
          });
        },

        addMedicalSymptomEntry: (input) => {
          const at = input.at ?? new Date().toISOString();
          const activeActorId = input.actorId ?? get().activeActorId;
          const { at: _ignoredAt, actorId: _ignoredActor, status: _ignoredStatus, ...rest } = input;
          const entry: MedicalSymptomEntry = {
            id: makeId('medical-symptom', at),
            at,
            actorId: activeActorId,
            status: input.status ?? 'open',
            ...rest
          };
          const severity = entry.severity === 'emergency' ? 'critical' : entry.severity === 'watch' ? 'info' : 'warning';
          const actionDetail = entry.actionTaken.trim() || 'No action recorded.';
          const event: TimelineEvent = {
            id: makeId('event-medical-symptom', at),
            type: 'condition',
            at,
            actorId: activeActorId,
            summary: `Medical symptom logged: ${entry.symptom}`,
            detail: `${entry.trend}; ${actionDetail}${entry.notes ? ` - ${entry.notes}` : ''}`,
            severity
          };
          const alert: Alert | undefined =
            entry.severity === 'urgent' || entry.severity === 'emergency'
              ? {
                  id: makeId('alert-medical-symptom', at),
                  kind: 'medical',
                  title: entry.severity === 'emergency' ? 'Emergency medical symptom' : 'Urgent medical symptom',
                  detail: `${entry.symptom}: ${actionDetail}`,
                  createdAt: at,
                  status: 'active',
                  severity: entry.severity === 'emergency' ? 'critical' : 'warning'
                }
              : undefined;

          set((state) => ({
            ...state,
            mission: appendTimeline(
              {
                ...state.mission,
                medicalSymptomLog: [entry, ...state.mission.medicalSymptomLog],
                alerts: alert ? [alert, ...state.mission.alerts] : state.mission.alerts
              },
              event
            ),
            offlineQueue: queueIfOffline(state.online, state.offlineQueue, 'medical-symptom-entry', entry, at)
          }));
        },

        resolveMedicalSymptomEntry: (entryId, actorId) => {
          const at = new Date().toISOString();
          const activeActorId = actorId ?? get().activeActorId;

          set((state) => {
            const entry = state.mission.medicalSymptomLog.find((candidate) => candidate.id === entryId);
            if (!entry || entry.status === 'resolved') {
              return state;
            }

            const resolvedEntry: MedicalSymptomEntry = {
              ...entry,
              status: 'resolved',
              trend: 'resolved',
              resolvedAt: at,
              resolvedBy: activeActorId
            };
            const event: TimelineEvent = {
              id: makeId('event-medical-symptom-resolved', at),
              type: 'condition',
              at,
              actorId: activeActorId,
              summary: `Medical symptom resolved: ${entry.symptom}`,
              detail: entry.notes || entry.actionTaken,
              severity: 'info'
            };

            return {
              ...state,
              mission: appendTimeline(
                {
                  ...state.mission,
                  medicalSymptomLog: state.mission.medicalSymptomLog.map((candidate) =>
                    candidate.id === entryId ? resolvedEntry : candidate
                  )
                },
                event
              ),
              offlineQueue: queueIfOffline(state.online, state.offlineQueue, 'medical-symptom-resolved', resolvedEntry, at)
            };
          });
        },

        addWildlifeSighting: (input) => {
          const at = input.at ?? new Date().toISOString();
          const activeActorId = input.actorId ?? get().activeActorId;
          const { at: _ignoredAt, actorId: _ignoredActor, ...rest } = input;
          const sighting: WildlifeSighting = {
            id: makeId('wildlife', at),
            at,
            actorId: activeActorId,
            ...rest
          };
          const event: TimelineEvent = {
            id: makeId('event-wildlife', at),
            type: 'note',
            at,
            actorId: activeActorId,
            summary: `Wildlife sighting logged: ${sighting.species}`,
            detail: sighting.actionTaken || sighting.behavior || 'Observation recorded for marine research.',
            severity:
              /approaching|aggressive|threatening/i.test(sighting.behavior) || /exited|safety concern/i.test(sighting.actionTaken)
                ? 'warning'
                : 'info'
          };

          set((state) => ({
            ...state,
            mission: appendTimeline(
              {
                ...state.mission,
                wildlifeSightings: [sighting, ...state.mission.wildlifeSightings]
              },
              event
            ),
            offlineQueue: queueIfOffline(state.online, state.offlineQueue, 'wildlife-sighting', sighting, at)
          }));
        },

        removeWildlifeSighting: (sightingId) => {
          set((state) => ({
            ...state,
            mission: {
              ...state.mission,
              wildlifeSightings: state.mission.wildlifeSightings.filter((sighting) => sighting.id !== sightingId)
            }
          }));
        },

        addWowsaPhoto: (input) => {
          const at = input.at ?? new Date().toISOString();
          const activeActorId = input.actorId ?? get().activeActorId;
          const { at: _ignoredAt, actorId: _ignoredActor, ...rest } = input;

          set((state) => {
            const openStarterObservation = (state.mission.wowsaPhotos ?? []).find(
              (candidate) => candidate.eventTag === 'session-start' && !candidate.hasPhoto
            );
            const photo: WowsaPhotoEntry = {
              id: openStarterObservation?.id ?? makeId('wowsa-photo', at),
              number: openStarterObservation?.number ?? (state.mission.wowsaPhotos ?? []).length + 1,
              at,
              actorId: activeActorId,
              evidenceStatus: input.gps && input.hasPhoto ? 'ready' : input.gps ? 'needs-image' : 'needs-gps',
              ...rest
            };
            const event: TimelineEvent = {
              id: makeId('event-wowsa', at),
              type: photo.feedCompleted ? 'feeding' : 'note',
              at,
              actorId: activeActorId,
              summary: `Observation #${photo.number} logged`,
              detail: [
                photo.gps || 'GPS missing',
                photo.weatherSummary,
                photo.waterTempF !== undefined ? `Water ${photo.waterTempF}F` : undefined,
                photo.windKts !== undefined ? `Wind ${photo.windKts} kt` : undefined,
                photo.feedCompleted ? 'Feed completed' : undefined,
                photo.notes,
                photo.imageName
              ]
                .filter(Boolean)
                .join(' · '),
              gps: photo.gps,
              lat: photo.lat,
              lon: photo.lon,
              gpsAccuracyM: photo.gpsAccuracyM,
              weatherSummary: photo.weatherSummary,
              airTempF: photo.airTempF,
              waterTempF: photo.waterTempF,
              windKts: photo.windKts,
              windDirection: photo.windDirection,
              severity: photo.evidenceStatus === 'ready' ? 'info' : 'warning'
            };

            return {
              ...state,
              mission: appendTimeline(
                {
                  ...state.mission,
                  conditions: {
                    ...state.mission.conditions,
                    observedAt: at,
                    summary: photo.weatherSummary ?? state.mission.conditions.summary,
                    airTempF: photo.airTempF ?? state.mission.conditions.airTempF,
                    waterTempF: photo.waterTempF ?? state.mission.conditions.waterTempF,
                    windKts: photo.windKts ?? state.mission.conditions.windKts
                  },
                  position:
                    photo.lat !== undefined && photo.lon !== undefined
                      ? {
                          lat: photo.lat,
                          lon: photo.lon,
                          label: photo.gps,
                          updatedAt: at
                        }
                      : state.mission.position,
                  wowsaPhotos: openStarterObservation
                    ? (state.mission.wowsaPhotos ?? []).map((candidate) =>
                        candidate.id === openStarterObservation.id ? photo : candidate
                      )
                    : [photo, ...(state.mission.wowsaPhotos ?? [])],
                  expeditionCheckpoints:
                    photo.lat !== undefined && photo.lon !== undefined
                      ? [
                          {
                            id: makeId('checkpoint-wowsa', at),
                            at,
                            actorId: activeActorId,
                            lat: photo.lat,
                            lon: photo.lon,
                            gps: photo.gps,
                            accuracyM: photo.gpsAccuracyM,
                            label: `WOWSA photo #${photo.number}`,
                            note: photo.distanceSwum || photo.notes || 'Photo evidence checkpoint'
                          },
                          ...(state.mission.expeditionCheckpoints ?? [])
                        ]
                      : state.mission.expeditionCheckpoints
                },
                event
              ),
              offlineQueue: queueIfOffline(state.online, state.offlineQueue, 'wowsa-photo', photo, at)
            };
          });
        },

        removeWowsaPhoto: (photoId) => {
          set((state) => ({
            ...state,
            mission: {
              ...state.mission,
              wowsaPhotos: (state.mission.wowsaPhotos ?? [])
                .filter((photo) => photo.id !== photoId)
                .map((photo, index, photos) => ({
                  ...photo,
                  number: photos.length - index
                }))
            }
          }));
        },

        addExpeditionCheckpoint: (input) => {
          const at = input.at ?? new Date().toISOString();
          const activeActorId = input.actorId ?? get().activeActorId;
          const { at: _ignoredAt, actorId: _ignoredActor, ...rest } = input;
          const checkpoint: ExpeditionCheckpoint = {
            id: makeId('checkpoint', at),
            at,
            actorId: activeActorId,
            ...rest
          };
          const event: TimelineEvent = {
            id: makeId('event-gps', at),
            type: 'gps',
            at,
            actorId: activeActorId,
            summary: checkpoint.label,
            detail: `${checkpoint.gps}${checkpoint.accuracyM ? ` · ±${Math.round(checkpoint.accuracyM)}m` : ''}`,
            severity: 'info'
          };

          set((state) => ({
            ...state,
            mission: appendTimeline(
              {
                ...state.mission,
                position: {
                  lat: checkpoint.lat,
                  lon: checkpoint.lon,
                  label: checkpoint.gps,
                  updatedAt: at
                },
                expeditionCheckpoints: [checkpoint, ...(state.mission.expeditionCheckpoints ?? [])]
              },
              event
            ),
            offlineQueue: queueIfOffline(state.online, state.offlineQueue, 'expedition-checkpoint', checkpoint, at)
          }));
        },

        acknowledgeAlert: (alertId) => {
          set((state) => ({
            ...state,
            mission: {
              ...state.mission,
              alerts: state.mission.alerts.map((alert) =>
                alert.id === alertId ? { ...alert, status: 'acknowledged' } : alert
              )
            }
          }));
        },

        resolveAlert: (alertId) => {
          set((state) => ({
            ...state,
            mission: {
              ...state.mission,
              activeProtocolKind: state.mission.alerts.some(
                (alert) => alert.id === alertId && ['medical', 'distress', 'abort'].includes(alert.kind)
              )
                ? undefined
                : state.mission.activeProtocolKind,
              alerts: state.mission.alerts.map((alert) =>
                alert.id === alertId ? { ...alert, status: 'resolved' } : alert
              )
            }
          }));
        },

        setOnlineStatus: (isOnline) => {
          set((state) => ({
            ...state,
            online: isOnline,
            offlineQueue: isOnline ? [] : state.offlineQueue
          }));
        },

        completePartnerTask: (taskId) => {
          set((state) => ({
            ...state,
            mission: {
              ...state.mission,
              partnerTasks: state.mission.partnerTasks.map((task) =>
                task.id === taskId ? { ...task, status: 'done' } : task
              )
            }
          }));
        }
      }),
      {
        name: storageName,
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          mission: state.mission,
          activeActorId: state.activeActorId,
          selectedRole: state.selectedRole,
          online: state.online,
          offlineQueue: state.offlineQueue
        }),
        merge: mergePersistedMissionState
      }
    )
  );

export const useLiveMissionStore = createMissionStore('swim-california-mission-live', () => buildLiveSeedMission());
export const useTemplateMissionStore = createMissionStore('swim-expedition-template-mission', () => buildTemplateSeedMission());

const MissionStoreContext = createContext<MissionStoreHook | null>(null);

export function MissionStoreProvider({ store, children }: { store: MissionStoreHook; children: ReactNode }) {
  return createElement(MissionStoreContext.Provider, { value: store }, children);
}

interface UseMissionStoreHook {
  <T>(selector: (state: MissionStore) => T): T;
  getState: MissionStoreHook['getState'];
  setState: MissionStoreHook['setState'];
  subscribe: MissionStoreHook['subscribe'];
}

const useMissionStoreScoped = <T,>(selector: (state: MissionStore) => T): T => {
  const store = useContext(MissionStoreContext) ?? useLiveMissionStore;
  return store(selector);
};

export const useMissionStore = useMissionStoreScoped as UseMissionStoreHook;
useMissionStore.getState = useLiveMissionStore.getState;
useMissionStore.setState = useLiveMissionStore.setState;
useMissionStore.subscribe = useLiveMissionStore.subscribe;
