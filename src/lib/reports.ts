import { format } from 'date-fns';
import type { Mission, WowsaPhotoEntry } from '../state/types';

const blank = (value?: string | number) => (value === undefined || value === '' ? '-' : String(value));

function sessionBlock(mission: Mission) {
  const session = mission.session;
  return `Swim California - Daily Operations Report
Generated: ${format(new Date(), 'PPpp')}
Mission: ${mission.name}
Swimmer: ${blank(session.swimmerName)}
Location: ${blank(session.location)}
Planned Distance: ${blank(session.plannedDistance)}
Planned Start Time: ${blank(session.plannedStartTime)}
GPS Start: ${blank(session.gpsStart)}
GPS End: ${blank(session.gpsEnd)}
Primary Vessel: ${blank(session.primaryVessel)}
Support Vessels: ${blank(session.supportVessels)}
Lead Crew: ${blank(session.leadCrew)}
Completed By: ${blank(session.completedBy)}`;
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
  GPS Accuracy: ${photo.gpsAccuracyM ? `+/- ${Math.round(photo.gpsAccuracyM)}m` : '-'}
  Distance swum: ${blank(photo.distanceSwum)}
  Evidence status: ${blank(photo.evidenceStatus)}
  Photo file: ${photo.imageName || (photo.hasPhoto ? 'Selected - attach from camera roll' : 'Not selected')}
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

export function buildLogisticsReport(mission: Mission) {
  return `${sessionBlock(mission)}

BOAT, SWIM, AND READINESS CHECKS
${checklistBlock(mission)}

TIMELINE
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
Confidence: ${wellness.confidence}/10`;
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
    { id: 'image', label: 'Photo attached', done: Boolean(photo.hasPhoto || photo.imageDataUrl || photo.imageName) },
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
        gpsAccuracyM: photo.gpsAccuracyM,
        distanceSwum: photo.distanceSwum,
        imageName: photo.imageName,
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
