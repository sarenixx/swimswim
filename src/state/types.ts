export type MissionStatus = 'preparing' | 'active' | 'paused' | 'completed' | 'aborted';
export type MissionMode = 'live' | 'template';

export type CrewRole =
  | 'captain'
  | 'safety'
  | 'medical'
  | 'first-mate'
  | 'observer'
  | 'land-support'
  | 'kayak-1'
  | 'kayak-2'
  | 'boat'
  | 'media';

export type ChecklistCategory = 'pre-swim' | 'in-swim' | 'post-swim' | 'mental-health';

export type ChecklistStatus = 'pending' | 'done' | 'overdue';
export type OperationalTimelineStatus = 'pending' | 'done';
export type OperationalTimelineCategory =
  | 'arrival'
  | 'loading'
  | 'warmup'
  | 'launch'
  | 'observer'
  | 'swim'
  | 'feeding'
  | 'risk'
  | 'recovery';

export type TimelineEventType =
  | 'feeding'
  | 'condition'
  | 'shift'
  | 'weather'
  | 'course'
  | 'check-in'
  | 'gps'
  | 'emergency'
  | 'note';

export type AlertKind =
  | 'fatigue'
  | 'missed-feeding'
  | 'weather-threshold'
  | 'missed-check-in'
  | 'medical'
  | 'distress'
  | 'abort';

export type EmergencyKind = 'medical' | 'distress' | 'abort';

export type Severity = 'info' | 'warning' | 'critical';

export type SwimmerConditionLevel = 'steady' | 'watch' | 'fatigue' | 'distress';

export type MedicalProtocolArea =
  | 'daily-monitoring'
  | 'rhabdomyolysis'
  | 'hypothermia'
  | 'weight-loss'
  | 'sipe'
  | 'skin-soft-tissue'
  | 'water-illness'
  | 'bites-stings'
  | 'mental-health'
  | 'other';

export type MedicalChecklistCadence = 'pre-swim' | 'post-swim' | 'daily' | 'weekly' | 'as-needed';
export type MedicalChecklistStatus = 'pending' | 'done' | 'watch' | 'escalated';
export type MedicalSymptomSeverity = 'watch' | 'caution' | 'urgent' | 'emergency';
export type MedicalSymptomTrend = 'new' | 'worse' | 'same' | 'improving' | 'resolved';
export type MedicalSymptomStatus = 'open' | 'monitoring' | 'resolved';

export type QuickLogKind =
  | 'feeding-completed'
  | 'fatigue-observed'
  | 'course-adjustment'
  | 'weather-shift'
  | 'shift-handover'
  | 'check-in-confirmed';

export interface CrewMember {
  id: string;
  name: string;
  role: CrewRole;
  phone: string;
  shiftStart: string;
  shiftEnd: string;
  responsibilities: string[];
  backupId?: string;
  backupPlan?: string;
}

export interface MissionSetupCrewAssignment {
  id: string;
  name: string;
  phone: string;
}

export interface MissionSetupInput {
  name: string;
  swimmerName: string;
  location: string;
  plannedDistance: string;
  startAt: string;
  gpsStart: string;
  gpsEnd: string;
  primaryVessel: string;
  supportVessels: string;
  leadCrew: string;
  completedBy: string;
  operationsEmail: string;
  feedingIntervalMinutes: number;
  wowsaPhotoIntervalMinutes: number;
  crew: MissionSetupCrewAssignment[];
}

export interface ChecklistItem {
  id: string;
  category: ChecklistCategory;
  title: string;
  ownerId: string;
  dueAt?: string;
  completedAt?: string;
  completedBy?: string;
  status: ChecklistStatus;
}

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  at: string;
  actorId: string;
  summary: string;
  detail?: string;
  gps?: string;
  lat?: number;
  lon?: number;
  gpsAccuracyM?: number;
  weatherSummary?: string;
  airTempF?: number;
  waterTempF?: number;
  windKts?: number;
  windDirection?: string;
  lateByMinutes?: number;
  severity?: Severity;
}

export interface OperationalTimelineItem {
  id: string;
  category: OperationalTimelineCategory;
  label: string;
  at: string;
  ownerId: string;
  status: OperationalTimelineStatus;
  notes: string;
  contingencyWindowMinutes?: number;
  completedAt?: string;
  completedBy?: string;
}

export interface Alert {
  id: string;
  kind: AlertKind;
  title: string;
  detail: string;
  createdAt: string;
  status: 'active' | 'acknowledged' | 'resolved';
  severity: 'warning' | 'critical';
}

export interface EnvironmentalConditions {
  observedAt: string;
  airTempF: number;
  waterTempF: number;
  windKts: number;
  currentKts: number;
  visibilityNm: number;
  swellFt: number;
  summary: string;
}

export interface FeedingPlanItem {
  id: string;
  label: string;
  intervalMinutes: number;
  calories: number;
  hydrationOz: number;
  electrolytesMg: number;
  notes: string;
  backup: boolean;
}

export interface RiskPlan {
  tideWindow: string;
  weatherSource: string;
  abortConditions: string[];
  medicalConcerns: string[];
  mitigationNotes: string[];
}

export interface SwimmerConditionEntry {
  id: string;
  at: string;
  actorId: string;
  level: SwimmerConditionLevel;
  note: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  role: string;
  phone: string;
  channel: string;
}

export interface ProtocolStep {
  id: string;
  order: number;
  label: string;
  ownerRole: CrewRole;
}

export interface EmergencyProtocol {
  kind: EmergencyKind;
  title: string;
  steps: ProtocolStep[];
}

export interface CommunicationMessage {
  id: string;
  channel: 'captain' | 'safety' | 'medical' | 'kayak' | 'broadcast';
  at: string;
  actorId: string;
  body: string;
  requiresConfirmation?: boolean;
}

export interface PartnerTask {
  id: string;
  title: string;
  ownerId: string;
  dueAt: string;
  status: 'pending' | 'done';
  notes: string;
}

export interface DailySessionInfo {
  swimmerName: string;
  swimmers?: string[];
  location: string;
  plannedDistance: string;
  plannedStartTime: string;
  gpsStart: string;
  gpsEnd: string;
  primaryVessel: string;
  supportVessels: string;
  leadCrew: string;
  completedBy: string;
  operationsEmail: string;
}

export interface MedicalVitals {
  heartRateBpm: string;
  bodyTempF: string;
  spo2: string;
  weightLbs: string;
  sleepHours: string;
  sleepQuality: string;
}

export interface WellnessRatings {
  mood: number;
  motivation: number;
  stress: number;
  anxiety: number;
  confidence: number;
}

export interface MedicalChecklistItem {
  id: string;
  protocolArea: MedicalProtocolArea;
  cadence: MedicalChecklistCadence;
  title: string;
  ownerId: string;
  instructions: string;
  status: MedicalChecklistStatus;
  completedAt?: string;
  completedBy?: string;
  lastNote?: string;
  nextReviewAt?: string;
}

export interface MedicalDailyChecklistItemRecord {
  itemId: string;
  status: MedicalChecklistStatus;
  note: string;
  completedAt?: string;
  completedBy?: string;
}

export interface MedicalDailyRecord {
  id: string;
  date: string;
  updatedAt: string;
  updatedBy: string;
  items: MedicalDailyChecklistItemRecord[];
}

export interface MedicalSymptomEntry {
  id: string;
  at: string;
  actorId: string;
  protocolArea: MedicalProtocolArea;
  symptom: string;
  severity: MedicalSymptomSeverity;
  trend: MedicalSymptomTrend;
  actionTaken: string;
  notes: string;
  nextReviewAt?: string;
  status: MedicalSymptomStatus;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface WildlifeSighting {
  id: string;
  species: string;
  at: string;
  gps: string;
  distanceFromSwimmer: string;
  behavior: string;
  actionTaken: string;
  count: string;
  notes: string;
  hasPhoto: boolean;
  actorId: string;
}

export interface WowsaPhotoEntry {
  id: string;
  number: number;
  at: string;
  gps: string;
  lat?: number;
  lon?: number;
  gpsAccuracyM?: number;
  distanceSwum: string;
  notes: string;
  weatherSummary?: string;
  airTempF?: number;
  waterTempF?: number;
  windKts?: number;
  windDirection?: string;
  feedCompleted?: boolean;
  eventTag?: string;
  hasPhoto: boolean;
  imageName?: string;
  imageDataUrl?: string;
  imageStorageKey?: string;
  imageSizeBytes?: number;
  evidenceStatus: 'ready' | 'needs-gps' | 'needs-image';
  actorId: string;
}

export interface ExpeditionCheckpoint {
  id: string;
  at: string;
  lat: number;
  lon: number;
  gps: string;
  accuracyM?: number;
  label: string;
  note: string;
  actorId: string;
}

export interface RoutePosition {
  lat: number;
  lon: number;
  label: string;
  updatedAt: string;
}

export interface Mission {
  id: string;
  mode: MissionMode;
  name: string;
  status: MissionStatus;
  startedAt: string;
  feedingIntervalMinutes: number;
  wowsaPhotoIntervalMinutes: number;
  lastFeedingAt: string;
  nextFeedingAt: string;
  feedingPlan: FeedingPlanItem[];
  riskPlan: RiskPlan;
  crew: CrewMember[];
  checklistItems: ChecklistItem[];
  operationalTimeline: OperationalTimelineItem[];
  timeline: TimelineEvent[];
  alerts: Alert[];
  conditions: EnvironmentalConditions;
  swimmerConditions: SwimmerConditionEntry[];
  contacts: EmergencyContact[];
  protocols: EmergencyProtocol[];
  communications: CommunicationMessage[];
  partnerTasks: PartnerTask[];
  session: DailySessionInfo;
  medicalVitals: MedicalVitals;
  wellnessRatings: WellnessRatings;
  medicalChecklist: MedicalChecklistItem[];
  medicalDailyRecords: MedicalDailyRecord[];
  medicalSymptomLog: MedicalSymptomEntry[];
  wildlifeSightings: WildlifeSighting[];
  wowsaPhotos: WowsaPhotoEntry[];
  expeditionCheckpoints: ExpeditionCheckpoint[];
  position: RoutePosition;
  activeProtocolKind?: EmergencyKind;
}
