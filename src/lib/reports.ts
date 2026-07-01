import { format } from 'date-fns';
import type { MedicalDailyChecklistRecord, MedicalDailyChecklistType, Mission, WowsaPhotoEntry } from '../state/types';

const blank = (value?: string | number) => (value === undefined || value === '' ? '-' : String(value));
export const medicalReportRecipients = ['swimcalifornia2026@gmail.com', 'kmsusskind@gmail.com'];

const medicalChecklistLabels: Record<MedicalDailyChecklistType, string> = {
  'athlete-pre-swim': 'Athlete Pre-Swim',
  'medic-pre-swim': 'Medic Pre-Swim',
  'athlete-post-swim': 'Athlete Post-Swim',
  'medic-post-swim': 'Medic Post-Swim',
  'athlete-recovery': 'Athlete Recovery',
  'medic-recovery': 'Medic Recovery'
};

function crewLabel(mission: Mission, crewId?: string) {
  if (!crewId) {
    return '-';
  }

  return mission.crew.find((member) => member.id === crewId)?.name ?? crewId;
}

function medicalDailyChecklistReportBlock(
  mission: Mission,
  checklist: MedicalDailyChecklistRecord,
  headingIndent = '',
  detailIndent = '  '
) {
  const fields = Object.entries(checklist.fields)
    .map(([fieldId, field]) => `${detailIndent}${fieldId}: ${blank(field.value)}${field.source && field.source !== 'manual' ? ` (${field.source})` : ''}`)
    .join('\n');

  return `${headingIndent}${medicalChecklistLabels[checklist.checklistType]} - ${checklist.status}
${detailIndent}Completed: ${checklist.completedAt ? format(new Date(checklist.completedAt), 'PPp') : '-'}
${detailIndent}Completed by: ${crewLabel(mission, checklist.completedBy)}
${fields || `${detailIndent}No fields saved.`}`;
}

function sessionBlock(mission: Mission) {
  const session = mission.session;
  return `${mission.name} - Operational Swim Source of Truth
Record Generated: ${format(new Date(), 'PPpp')}
Mission: ${mission.name}
Status: ${mission.status}
Swimmer: ${blank(session.swimmerName)}
Location: ${blank(session.location)}
Session Start: ${blank(mission.startedAt)}
Observer Interval: ${mission.wowsaPhotoIntervalMinutes ?? 30} min
Current Position: ${blank(mission.position.label)}
Conditions: ${blank(mission.conditions.summary)}
Water Temperature: ${blank(mission.conditions.waterTempF)} F
Wind: ${blank(mission.conditions.windKts)} kt
GPS Start: ${blank(session.gpsStart)}
Primary Vessel: ${blank(session.primaryVessel)}
Support Vessels: ${blank(session.supportVessels)}
Lead Crew: ${blank(session.leadCrew)}
Completed By: ${blank(session.completedBy)}
Operations Email: ${blank(session.operationsEmail)}`;
}

function checklistBlock(mission: Mission) {
  return mission.checklistItems
    .map((item) => {
      const mark = item.status === 'done' ? '[x]' : '[ ]';
      return `${mark} ${item.title}${item.completedAt ? ` - completed ${format(new Date(item.completedAt), 'p')}` : ''}`;
    })
    .join('\n');
}

function wildlifeBlock(mission: Mission) {
  if (!mission.wildlifeSightings.length) {
    return 'No wildlife sightings logged.';
  }

  return mission.wildlifeSightings
    .map(
      (sighting, index) => `Sighting ${index + 1}: ${sighting.species}
  Time: ${format(new Date(sighting.at), 'p')}
  GPS: ${blank(sighting.gps)}
  Distance from swimmer: ${blank(sighting.distanceFromSwimmer)}
  Behavior: ${blank(sighting.behavior)}
  Action taken: ${blank(sighting.actionTaken)}
  Count: ${blank(sighting.count)}
  Photo taken: ${sighting.hasPhoto ? 'Yes - attach from camera roll' : 'No'}
  Notes: ${blank(sighting.notes)}`
    )
    .join('\n\n');
}

function wowsaBlock(mission: Mission) {
  const photos = mission.wowsaPhotos ?? [];
  if (!photos.length) {
    return 'No WOWSA photos logged.';
  }

  return [...photos]
    .sort((a, b) => a.number - b.number)
    .map(
      (photo) => `Photo #${photo.number}
  Time: ${format(new Date(photo.at), 'p')}
  GPS: ${blank(photo.gps)}
  Lat/Lon: ${photo.lat !== undefined && photo.lon !== undefined ? `${photo.lat}, ${photo.lon}` : '-'}
  GPS Accuracy: ${photo.gpsAccuracyM ? `+/- ${Math.round(photo.gpsAccuracyM)}m` : '-'}
  Weather: ${blank(photo.weatherSummary)}
  Air Temperature: ${blank(photo.airTempF)} F
  Water Temperature: ${blank(photo.waterTempF)} F
  Wind: ${photo.windKts !== undefined ? `${photo.windKts} kt${photo.windDirection ? ` ${photo.windDirection}` : ''}` : '-'}
  Feed completed: ${photo.feedCompleted ? 'Yes' : 'No'}
  Evidence status: ${blank(photo.evidenceStatus)}
  Photo file: ${photo.imageName || (photo.hasPhoto ? 'Selected - attach from camera roll' : 'Not selected')}
  Local image storage: ${photo.imageStorageKey ? 'Browser evidence cache' : '-'}
  Notes: ${blank(photo.notes)}`
    )
    .join('\n\n');
}

function checkpointBlock(mission: Mission) {
  const checkpoints = mission.expeditionCheckpoints ?? [];
  if (!checkpoints.length) {
    return 'No GPS route checkpoints logged.';
  }

  return checkpoints
    .map(
      (checkpoint, index) => `Checkpoint ${index + 1}: ${checkpoint.label}
  Time: ${format(new Date(checkpoint.at), 'p')}
  GPS: ${checkpoint.gps}
  Accuracy: ${checkpoint.accuracyM ? `+/- ${Math.round(checkpoint.accuracyM)}m` : '-'}
  Note: ${blank(checkpoint.note)}`
    )
    .join('\n\n');
}

function medicalChecklistBlock(mission: Mission) {
  const items = mission.medicalChecklist ?? [];
  if (!items.length) {
    return 'No medical checklist items recorded.';
  }

  return items
    .map(
      (item) => `${item.status.toUpperCase()} - ${item.title}
  Cadence: ${item.cadence}
  Protocol area: ${item.protocolArea}
  Completed: ${item.completedAt ? format(new Date(item.completedAt), 'p') : '-'}
  Follow-up: ${item.nextReviewAt ? format(new Date(item.nextReviewAt), 'p') : '-'}
  Note: ${blank(item.lastNote)}`
    )
    .join('\n\n');
}

function medicalDailyChecklistBlock(mission: Mission) {
  const records = mission.medicalDailyRecords ?? [];
  if (!records.length) {
    return 'No daily medical checklist records saved.';
  }

  const checklistById = new Map((mission.medicalChecklist ?? []).map((item) => [item.id, item]));

  return records
    .map((record) => {
      const typedBlock = Object.values(record.checklists ?? {})
        .map((checklist) => medicalDailyChecklistReportBlock(mission, checklist, '  ', '    '))
        .join('\n');
      const legacyBlock = record.items
        .map((item) => {
          const checklistItem = checklistById.get(item.itemId);
          return `  ${item.status.toUpperCase()} - ${checklistItem?.title ?? item.itemId}
    Note: ${blank(item.note)}`;
        })
        .join('\n');

      return `${format(new Date(`${record.date}T00:00:00`), 'PP')} - ${record.dayType ?? 'swim'} day - updated ${format(new Date(record.updatedAt), 'p')}
${[typedBlock, legacyBlock].filter(Boolean).join('\n')}`;
    })
    .join('\n\n');
}

function medicalAdverseEventBlock(mission: Mission) {
  const entries = mission.medicalAdverseEvents ?? [];
  if (!entries.length) {
    return 'No adverse events logged.';
  }

  return entries
    .map(
      (entry) => `${format(new Date(entry.eventAt), 'PPp')} - ${entry.description}
  Entered: ${format(new Date(entry.enteredAt), 'PPp')}
  Severity: ${entry.severity}
  Status: ${entry.resolutionStatus}
  Immediate actions: ${blank(entry.immediateActions)}
  Follow-up: ${blank(entry.followUpRequired)}
  Photos: ${entry.photos.length}`
    )
    .join('\n\n');
}

function medicalDeviceBlock(mission: Mission) {
  const readings = mission.medicalDeviceReadings ?? [];
  if (!readings.length) {
    return 'No Oura or Garmin imports available.';
  }

  return readings
    .map(
      (reading) => `${reading.source.toUpperCase()} - ${format(new Date(reading.capturedAt), 'PPp')}
${Object.entries(reading.metrics)
  .map(([key, value]) => `  ${key}: ${blank(value)}`)
  .join('\n')}`
    )
    .join('\n\n');
}

export function buildDailyMedicalSummary(mission: Mission, date: string) {
  const dailyRecord = (mission.medicalDailyRecords ?? []).find((record) => record.date === date);
  const adverseEvents = (mission.medicalAdverseEvents ?? []).filter((entry) => entry.eventAt.slice(0, 10) === date);
  const deviceReadings = (mission.medicalDeviceReadings ?? []).filter((reading) => reading.capturedAt.slice(0, 10) === date);

  return `${mission.name} - Daily Medical Summary
Date: ${format(new Date(`${date}T00:00:00`), 'PP')}
Generated: ${format(new Date(), 'PPpp')}
Day Type: ${dailyRecord?.dayType ?? 'swim'}

TODAY'S CHECKLISTS
${
  dailyRecord?.checklists
    ? Object.values(dailyRecord.checklists)
        .map((checklist) => medicalDailyChecklistReportBlock(mission, checklist))
        .join('\n\n')
    : 'No checklist entries saved for this date.'
}

ADVERSE EVENTS
${
  adverseEvents.length
    ? adverseEvents
        .map(
          (entry) => `${format(new Date(entry.eventAt), 'p')} - ${entry.severity} - ${entry.description}
  Actions: ${blank(entry.immediateActions)}
  Follow-up: ${blank(entry.followUpRequired)}
  Status: ${entry.resolutionStatus}`
        )
        .join('\n\n')
    : 'No adverse events logged for this date.'
}

DEVICE IMPORTS
${
  deviceReadings.length
    ? deviceReadings
        .map(
          (reading) => `${reading.source.toUpperCase()} - ${format(new Date(reading.capturedAt), 'p')}
${Object.entries(reading.metrics)
  .map(([key, value]) => `  ${key}: ${blank(value)}`)
  .join('\n')}`
        )
        .join('\n\n')
    : 'No Oura or Garmin imports available for this date.'
}`;
}

function medicalSymptomBlock(mission: Mission) {
  const entries = mission.medicalSymptomLog ?? [];
  if (!entries.length) {
    return 'No symptom changes logged.';
  }

  return entries
    .map(
      (entry) => `${format(new Date(entry.at), 'p')} - ${entry.symptom}
  Severity: ${entry.severity}
  Trend: ${entry.trend}
  Status: ${entry.status}
  Protocol area: ${entry.protocolArea}
  Action taken: ${entry.actionTaken ? entry.actionTaken : 'No action recorded.'}
  Follow-up: ${entry.nextReviewAt ? format(new Date(entry.nextReviewAt), 'p') : '-'}
  Notes: ${blank(entry.notes)}`
    )
    .join('\n\n');
}

export function buildLogisticsReport(mission: Mission) {
  return `${sessionBlock(mission)}

OPERATING CHECKLIST
${checklistBlock(mission)}

EVENT LOG
${mission.timeline
  .slice(0, 25)
  .map((event) => `${format(new Date(event.at), 'p')} - ${event.summary}: ${event.detail ?? ''}`)
  .join('\n')}

EXPEDITION GPS TRACK
${checkpointBlock(mission)}

WILDLIFE SIGHTINGS
${wildlifeBlock(mission)}`;
}

export function buildMedicalReport(mission: Mission) {
  const vitals = mission.medicalVitals;
  const wellness = mission.wellnessRatings;
  return `${sessionBlock(mission)}

MEDICAL CHECK
Resting Heart Rate: ${blank(vitals.heartRateBpm)} bpm
Body Temperature: ${blank(vitals.bodyTempF)} F
SpO2: ${blank(vitals.spo2)}%
Morning Weight: ${blank(vitals.weightLbs)} lbs
Sleep: ${blank(vitals.sleepHours)} hrs (${blank(vitals.sleepQuality)})

WELLNESS RATINGS (1-10)
Mood: ${wellness.mood}/10
Motivation: ${wellness.motivation}/10
Stress: ${wellness.stress}/10
Anxiety: ${wellness.anxiety}/10
Confidence: ${wellness.confidence}/10

MEDICAL PROTOCOL CHECKLIST
${medicalChecklistBlock(mission)}

DAILY MEDICAL CHECKLIST RECORDS
${medicalDailyChecklistBlock(mission)}

ADVERSE EVENT LOG
${medicalAdverseEventBlock(mission)}

SYMPTOM / CHANGE LOG
${medicalSymptomBlock(mission)}

DEVICE IMPORTS
${medicalDeviceBlock(mission)}`;
}

export function buildWildlifeReport(mission: Mission) {
  return `${sessionBlock(mission)}

MARINE RESEARCH WILDLIFE LOG
${wildlifeBlock(mission)}

Note: attach any wildlife photos from the camera roll before sending.`;
}

export function buildWowsaReport(mission: Mission) {
  return `${sessionBlock(mission)}

WOWSA CERTIFICATION PHOTO LOG
Total Photos Logged: ${(mission.wowsaPhotos ?? []).length}

${wowsaBlock(mission)}

Note: attach every corresponding photo from the camera roll before sending.`;
}

export function getWowsaEvidenceChecks(photo: WowsaPhotoEntry) {
  return [
    { id: 'image', label: 'Photo attached', done: Boolean(photo.hasPhoto || photo.imageDataUrl || photo.imageName || photo.imageStorageKey) },
    { id: 'gps', label: 'GPS present', done: Boolean(photo.gps) },
    { id: 'timestamp', label: 'Timestamp present', done: Boolean(photo.at) },
    { id: 'accuracy', label: 'Accuracy present', done: photo.gpsAccuracyM !== undefined },
    { id: 'weather', label: 'Weather present', done: Boolean(photo.weatherSummary) }
  ];
}

export function buildWowsaEvidenceManifest(mission: Mission) {
  const photos = [...(mission.wowsaPhotos ?? [])].sort((a, b) => a.number - b.number);
  return JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      mission: {
        id: mission.id,
        name: mission.name,
        swimmer: mission.session.swimmerName,
        location: mission.session.location,
        wowsaPhotoIntervalMinutes: mission.wowsaPhotoIntervalMinutes ?? 30,
        gpsStart: mission.session.gpsStart,
        primaryVessel: mission.session.primaryVessel
      },
      summary: {
        totalPhotos: photos.length,
        readyPhotos: photos.filter((photo) => photo.evidenceStatus === 'ready').length,
        routeCheckpoints: (mission.expeditionCheckpoints ?? []).length
      },
      photos: photos.map((photo) => ({
        number: photo.number,
        timestamp: photo.at,
        gps: photo.gps,
        lat: photo.lat,
        lon: photo.lon,
        gpsAccuracyM: photo.gpsAccuracyM,
        distanceSwum: photo.distanceSwum,
        imageName: photo.imageName,
        imageStorageKey: photo.imageStorageKey,
        imageSizeBytes: photo.imageSizeBytes,
        weatherSummary: photo.weatherSummary,
        airTempF: photo.airTempF,
        waterTempF: photo.waterTempF,
        windKts: photo.windKts,
        windDirection: photo.windDirection,
        feedCompleted: photo.feedCompleted,
        eventTag: photo.eventTag,
        evidenceStatus: photo.evidenceStatus,
        checks: getWowsaEvidenceChecks(photo),
        notes: photo.notes
      })),
      route: mission.expeditionCheckpoints ?? []
    },
    null,
    2
  );
}

export function buildRouteCsv(mission: Mission) {
  const headers = ['at', 'label', 'gps', 'lat', 'lon', 'accuracyM', 'note', 'actorId'];
  const escape = (value: string | number | undefined) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const rows = (mission.expeditionCheckpoints ?? []).map((checkpoint) => ({
    at: checkpoint.at,
    label: checkpoint.label,
    gps: checkpoint.gps,
    lat: checkpoint.lat,
    lon: checkpoint.lon,
    accuracyM: checkpoint.accuracyM,
    note: checkpoint.note,
    actorId: checkpoint.actorId
  }));

  return [headers.join(','), ...rows.map((row) => headers.map((header) => escape(row[header as keyof typeof row])).join(','))].join('\n');
}

export function mailtoHref(to: string, subject: string, body: string) {
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
