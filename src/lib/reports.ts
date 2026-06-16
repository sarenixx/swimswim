import { format } from 'date-fns';
import type { Mission, WowsaPhotoEntry } from '../state/types';

const blank = (value?: string | number) => (value === undefined || value === '' ? '-' : String(value));

function sessionBlock(mission: Mission) {
  const session = mission.session;
  return `${mission.name} - Operational Swim Source of Truth
Record Generated: ${format(new Date(), 'PPpp')}
Mission: ${mission.name}
Status: ${mission.status}
Swimmer: ${blank(session.swimmerName)}
Location: ${blank(session.location)}
Planned Distance: ${blank(session.plannedDistance)}
Planned Start Time: ${blank(session.plannedStartTime)}
Feeding Interval: ${mission.feedingIntervalMinutes} min
Current Position: ${blank(mission.position.label)}
Conditions: ${blank(mission.conditions.summary)}
GPS Start: ${blank(session.gpsStart)}
GPS End: ${blank(session.gpsEnd)}
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
  Distance swum: ${blank(photo.distanceSwum)}
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
    .map(
      (record) => `${format(new Date(`${record.date}T00:00:00`), 'PP')} - updated ${format(new Date(record.updatedAt), 'p')}
${record.items
  .map((item) => {
    const checklistItem = checklistById.get(item.itemId);
    return `  ${item.status.toUpperCase()} - ${checklistItem?.title ?? item.itemId}
    Note: ${blank(item.note)}`;
  })
  .join('\n')}`
    )
    .join('\n\n');
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

SYMPTOM / CHANGE LOG
${medicalSymptomBlock(mission)}`;
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
    { id: 'distance', label: 'Distance noted', done: Boolean(photo.distanceSwum) }
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
        plannedDistance: mission.session.plannedDistance,
        feedingIntervalMinutes: mission.feedingIntervalMinutes,
        wowsaPhotoIntervalMinutes: mission.wowsaPhotoIntervalMinutes ?? 30,
        gpsStart: mission.session.gpsStart,
        gpsEnd: mission.session.gpsEnd
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
