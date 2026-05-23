import { createContext, createElement, useContext, type ReactNode } from 'react';
import { addHours, addMinutes } from 'date-fns';
import { create, type StoreApi, type UseBoundStore } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createOfflineQueueEntry, type OfflineQueueEntry } from '../lib/storage/offlineQueue';
import { buildLiveSeedMission, buildTemplateSeedMission, emergencyLabels } from './seed';
import type {
  Alert,
  ChecklistItem,
  CommunicationMessage,
  CrewMember,
  CrewRole,
  DailySessionInfo,
  EmergencyKind,
  ExpeditionCheckpoint,
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
  setActiveActor: (actorId: string) => void;
  setSelectedRole: (role: CrewRole) => void;
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
  logQuickAction: (kind: QuickLogKind, actorId?: string) => void;
  triggerEmergency: (kind: EmergencyKind, actorId?: string) => void;
  scheduleNextFeeding: (fromIsoTime?: string) => void;
  updateSwimmerCondition: (level: SwimmerConditionLevel, note: string, actorId?: string) => void;
  sendMessage: (message: Omit<CommunicationMessage, 'id' | 'at'> & { at?: string }) => void;
  updateSessionField: <K extends keyof DailySessionInfo>(field: K, value: DailySessionInfo[K]) => void;
  updateMedicalVitalsField: <K extends keyof MedicalVitals>(field: K, value: MedicalVitals[K]) => void;
  updateWellnessRating: <K extends keyof WellnessRatings>(field: K, value: WellnessRatings[K]) => void;
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

        setActiveActor: (actorId) => set({ activeActorId: actorId }),

        setSelectedRole: (role) => set({ selectedRole: role }),

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
          set((state) => {
            const [primaryContact, ...restContacts] = state.mission.contacts;
            return {
              ...state,
              mission: {
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
              }
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
            const photo: WowsaPhotoEntry = {
              id: makeId('wowsa-photo', at),
              number: (state.mission.wowsaPhotos ?? []).length + 1,
              at,
              actorId: activeActorId,
              evidenceStatus: input.gps && input.hasPhoto ? 'ready' : input.gps ? 'needs-image' : 'needs-gps',
              ...rest
            };
            const event: TimelineEvent = {
              id: makeId('event-wowsa', at),
              type: 'note',
              at,
              actorId: activeActorId,
              summary: `WOWSA photo #${photo.number} logged`,
              detail: `${photo.gps || 'GPS missing'}${photo.imageName ? ` · ${photo.imageName}` : ''}`,
              severity: photo.evidenceStatus === 'ready' ? 'info' : 'warning'
            };

            return {
              ...state,
              mission: appendTimeline(
                {
                  ...state.mission,
                  wowsaPhotos: [photo, ...(state.mission.wowsaPhotos ?? [])],
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
        })
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
