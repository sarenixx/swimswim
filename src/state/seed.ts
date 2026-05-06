import { addHours, addMinutes, subHours, subMinutes } from 'date-fns';
import type { CrewRole, EmergencyKind, Mission } from './types';

export const roleLabels: Record<CrewRole, string> = {
  captain: 'Captain',
  safety: 'Safety Lead',
  medical: 'Medic',
  'kayak-1': 'Kayak 1',
  'kayak-2': 'Kayak 2',
  boat: 'Boat Lead',
  media: 'Media'
};

export const emergencyLabels: Record<EmergencyKind, string> = {
  medical: 'Medical Issue',
  distress: 'Swimmer Distress',
  abort: 'Abort Swim'
};

const iso = (date: Date) => date.toISOString();

export function buildSeedMission(now = new Date()): Mission {
  const startedAt = subMinutes(now, 84);
  const shiftStart = subHours(now, 1);
  const shiftEnd = addHours(now, 2);
  const nextShiftStart = addHours(now, 2);
  const nextShiftEnd = addHours(now, 5);

  return {
    id: 'mission-catalina-qualifier',
    name: 'Catalina Channel Qualifier',
    status: 'active',
    startedAt: iso(startedAt),
    feedingIntervalMinutes: 30,
    wowsaPhotoIntervalMinutes: 30,
    lastFeedingAt: iso(subMinutes(now, 26)),
    nextFeedingAt: iso(addMinutes(now, 4)),
    position: {
      lat: 33.397,
      lon: -118.412,
      label: '3.8 nm off Catalina bearing 072',
      updatedAt: iso(subMinutes(now, 2))
    },
    conditions: {
      observedAt: iso(subMinutes(now, 6)),
      airTempF: 64,
      waterTempF: 61,
      windKts: 8,
      currentKts: 0.7,
      visibilityNm: 4.5,
      swellFt: 2,
      summary: 'Light cross-current, stable visibility'
    },
    crew: [
      {
        id: 'crew-captain',
        name: 'Maya Chen',
        role: 'captain',
        phone: '+1 310 555 0141',
        shiftStart: iso(shiftStart),
        shiftEnd: iso(shiftEnd),
        responsibilities: ['Final go/no-go authority', 'Broadcasts', 'Incident coordination']
      },
      {
        id: 'crew-safety',
        name: 'Luis Ortega',
        role: 'safety',
        phone: '+1 310 555 0182',
        shiftStart: iso(shiftStart),
        shiftEnd: iso(shiftEnd),
        responsibilities: ['Safety watch', 'Check-in cadence', 'Alert verification']
      },
      {
        id: 'crew-medical',
        name: 'Dr. Priya Shah',
        role: 'medical',
        phone: '+1 310 555 0188',
        shiftStart: iso(shiftStart),
        shiftEnd: iso(nextShiftEnd),
        responsibilities: ['Medical readiness', 'Condition assessment', 'Recovery protocol']
      },
      {
        id: 'crew-kayak-1',
        name: 'Ben Alvarez',
        role: 'kayak-1',
        phone: '+1 310 555 0158',
        shiftStart: iso(shiftStart),
        shiftEnd: iso(shiftEnd),
        responsibilities: ['Primary escort', 'Feeding handoff', 'Swimmer observation']
      },
      {
        id: 'crew-kayak-2',
        name: 'Nora Lee',
        role: 'kayak-2',
        phone: '+1 310 555 0177',
        shiftStart: iso(nextShiftStart),
        shiftEnd: iso(nextShiftEnd),
        responsibilities: ['Relief escort', 'Spare nutrition', 'Condition confirmation']
      },
      {
        id: 'crew-boat',
        name: 'Tom Reyes',
        role: 'boat',
        phone: '+1 310 555 0137',
        shiftStart: iso(shiftStart),
        shiftEnd: iso(nextShiftEnd),
        responsibilities: ['Vessel operations', 'Route bearing', 'Radio watch']
      },
      {
        id: 'crew-media',
        name: 'Avery Brooks',
        role: 'media',
        phone: '+1 310 555 0163',
        shiftStart: iso(shiftStart),
        shiftEnd: iso(shiftEnd),
        responsibilities: ['Content capture', 'Sponsor notes', 'Non-operational updates']
      }
    ],
    checklistItems: [
      {
        id: 'pre-boat-ready',
        category: 'pre-swim',
        title: 'Boat fuel, radio, lights, and spare batteries confirmed',
        ownerId: 'crew-boat',
        completedAt: iso(subMinutes(now, 96)),
        completedBy: 'crew-boat',
        status: 'done'
      },
      {
        id: 'pre-weather-route',
        category: 'pre-swim',
        title: 'Weather window and route bearings confirmed',
        ownerId: 'crew-captain',
        completedAt: iso(subMinutes(now, 92)),
        completedBy: 'crew-captain',
        status: 'done'
      },
      {
        id: 'pre-medical-readiness',
        category: 'pre-swim',
        title: 'Medical kit, warming plan, and extraction path ready',
        ownerId: 'crew-medical',
        completedAt: iso(subMinutes(now, 90)),
        completedBy: 'crew-medical',
        status: 'done'
      },
      {
        id: 'pre-vhf-channel-16',
        category: 'pre-swim',
        title: 'VHF radio operational and set to Channel 16',
        ownerId: 'crew-boat',
        completedAt: iso(subMinutes(now, 88)),
        completedBy: 'crew-boat',
        status: 'done'
      },
      {
        id: 'pre-route-loaded',
        category: 'pre-swim',
        title: 'GPS/chart plotter working and route loaded',
        ownerId: 'crew-boat',
        completedAt: iso(subMinutes(now, 86)),
        completedBy: 'crew-boat',
        status: 'done'
      },
      {
        id: 'pre-float-plan-filed',
        category: 'pre-swim',
        title: 'Float plan filed with shore contact',
        ownerId: 'crew-captain',
        completedAt: iso(subMinutes(now, 85)),
        completedBy: 'crew-captain',
        status: 'done'
      },
      {
        id: 'pre-pfds-accounted',
        category: 'pre-swim',
        title: 'PFDs, throwable ring buoy, flares, and fire extinguisher accounted for',
        ownerId: 'crew-safety',
        completedAt: iso(subMinutes(now, 84)),
        completedBy: 'crew-safety',
        status: 'done'
      },
      {
        id: 'pre-fuel-reserve',
        category: 'pre-swim',
        title: 'Fuel adequate for route plus reserve',
        ownerId: 'crew-boat',
        completedAt: iso(subMinutes(now, 82)),
        completedBy: 'crew-boat',
        status: 'done'
      },
      {
        id: 'pre-marine-forecast',
        category: 'pre-swim',
        title: 'Marine weather forecast checked and conditions acceptable',
        ownerId: 'crew-safety',
        completedAt: iso(subMinutes(now, 80)),
        completedBy: 'crew-safety',
        status: 'done'
      },
      {
        id: 'pre-water-temp',
        category: 'pre-swim',
        title: 'Water temperature recorded and safe for swimmer',
        ownerId: 'crew-medical',
        completedAt: iso(subMinutes(now, 78)),
        completedBy: 'crew-medical',
        status: 'done'
      },
      {
        id: 'pre-wildlife-scan',
        category: 'pre-swim',
        title: 'Marine wildlife activity assessed before swimmer entry',
        ownerId: 'crew-safety',
        completedAt: iso(subMinutes(now, 76)),
        completedBy: 'crew-safety',
        status: 'done'
      },
      {
        id: 'pre-feeding-schedule',
        category: 'pre-swim',
        title: 'Feeding and hydration schedule confirmed with swimmer',
        ownerId: 'crew-kayak-1',
        completedAt: iso(subMinutes(now, 74)),
        completedBy: 'crew-kayak-1',
        status: 'done'
      },
      {
        id: 'pre-abort-protocol',
        category: 'pre-swim',
        title: 'Emergency exit and abort protocol agreed by all teams',
        ownerId: 'crew-captain',
        completedAt: iso(subMinutes(now, 72)),
        completedBy: 'crew-captain',
        status: 'done'
      },
      {
        id: 'in-kayak-check',
        category: 'in-swim',
        title: 'Kayak team check-in confirmed',
        ownerId: 'crew-safety',
        dueAt: iso(addMinutes(now, 9)),
        status: 'pending'
      },
      {
        id: 'in-feeding-readiness',
        category: 'in-swim',
        title: 'Prepare nutrition bottle and recovery backup',
        ownerId: 'crew-kayak-1',
        dueAt: iso(addMinutes(now, 2)),
        status: 'pending'
      },
      {
        id: 'in-condition-scan',
        category: 'in-swim',
        title: 'Structured swimmer condition scan',
        ownerId: 'crew-medical',
        dueAt: iso(addMinutes(now, 7)),
        status: 'pending'
      },
      {
        id: 'post-recovery',
        category: 'post-swim',
        title: 'Warm handoff, vitals, and recovery nutrition logged',
        ownerId: 'crew-medical',
        status: 'pending'
      },
      {
        id: 'post-wowsa-review',
        category: 'post-swim',
        title: 'WOWSA photo log reviewed and photos ready to attach',
        ownerId: 'crew-media',
        status: 'pending'
      },
      {
        id: 'post-debrief',
        category: 'post-swim',
        title: 'Crew debrief notes and near misses captured',
        ownerId: 'crew-captain',
        status: 'pending'
      },
      {
        id: 'mental-captain-load',
        category: 'mental-health',
        title: 'Captain decision load check completed',
        ownerId: 'crew-safety',
        dueAt: iso(addMinutes(now, 22)),
        status: 'pending'
      },
      {
        id: 'mental-team-rotation',
        category: 'mental-health',
        title: 'Quiet rotation break confirmed for off-duty crew',
        ownerId: 'crew-captain',
        dueAt: iso(addMinutes(now, 34)),
        status: 'pending'
      },
      {
        id: 'mental-swimmer-supported',
        category: 'mental-health',
        title: 'Swimmer confirms feeling safe and supported by the team',
        ownerId: 'crew-medical',
        dueAt: iso(addMinutes(now, 42)),
        status: 'pending'
      },
      {
        id: 'mental-concerns-communicated',
        category: 'mental-health',
        title: 'Any emotional or personal concerns communicated to support team',
        ownerId: 'crew-medical',
        dueAt: iso(addMinutes(now, 48)),
        status: 'pending'
      }
    ],
    timeline: [
      {
        id: 'event-start',
        type: 'note',
        at: iso(startedAt),
        actorId: 'crew-captain',
        summary: 'Swim started',
        detail: 'Mile zero logged with all active teams checked in.',
        severity: 'info'
      },
      {
        id: 'event-feed-last',
        type: 'feeding',
        at: iso(subMinutes(now, 26)),
        actorId: 'crew-kayak-1',
        summary: 'Feeding completed',
        detail: 'Carb bottle, warm rinse, verbal condition confirmed.',
        severity: 'info'
      },
      {
        id: 'event-condition',
        type: 'condition',
        at: iso(subMinutes(now, 16)),
        actorId: 'crew-medical',
        summary: 'Condition steady',
        detail: 'Stroke cadence stable, response clear.',
        severity: 'info'
      },
      {
        id: 'event-course',
        type: 'course',
        at: iso(subMinutes(now, 10)),
        actorId: 'crew-boat',
        summary: 'Course adjusted',
        detail: 'Adjusted 8 degrees north to hold projected line.',
        severity: 'info'
      },
      {
        id: 'event-checkin',
        type: 'check-in',
        at: iso(subMinutes(now, 5)),
        actorId: 'crew-safety',
        summary: 'Team check-in confirmed',
        detail: 'Boat, kayak, medical, and captain channels confirmed.',
        severity: 'info'
      }
    ],
    alerts: [],
    swimmerConditions: [
      {
        id: 'condition-seed',
        at: iso(subMinutes(now, 16)),
        actorId: 'crew-medical',
        level: 'steady',
        note: 'Stroke cadence stable. Clear responses on every sighting.'
      }
    ],
    contacts: [
      {
        id: 'contact-coast-guard',
        name: 'US Coast Guard Sector LA/LB',
        role: 'Rescue Coordination',
        phone: '+1 310 521 3801',
        channel: 'VHF 16'
      },
      {
        id: 'contact-doctor',
        name: 'Dr. Priya Shah',
        role: 'Expedition Medic',
        phone: '+1 310 555 0188',
        channel: 'Medical'
      },
      {
        id: 'contact-leadership',
        name: 'Maya Chen',
        role: 'Captain',
        phone: '+1 310 555 0141',
        channel: 'Captain'
      }
    ],
    protocols: [
      {
        kind: 'distress',
        title: 'Swimmer Distress Protocol',
        steps: [
          { id: 'distress-1', order: 1, label: 'Kayak escort establishes direct contact and maintains eyes on swimmer', ownerRole: 'kayak-1' },
          { id: 'distress-2', order: 2, label: 'Captain pauses all non-essential communications', ownerRole: 'captain' },
          { id: 'distress-3', order: 3, label: 'Medic prepares assessment and extraction kit', ownerRole: 'medical' },
          { id: 'distress-4', order: 4, label: 'Boat lead positions vessel for safe pickup without wake hazard', ownerRole: 'boat' },
          { id: 'distress-5', order: 5, label: 'Safety lead logs time, location, symptoms, and response', ownerRole: 'safety' }
        ]
      },
      {
        kind: 'medical',
        title: 'Medical Issue Protocol',
        steps: [
          { id: 'medical-1', order: 1, label: 'Medic takes command of clinical assessment', ownerRole: 'medical' },
          { id: 'medical-2', order: 2, label: 'Captain confirms whether swim is paused or aborted', ownerRole: 'captain' },
          { id: 'medical-3', order: 3, label: 'Boat lead prepares warming area and dry handoff', ownerRole: 'boat' },
          { id: 'medical-4', order: 4, label: 'Safety lead starts incident log with vitals and times', ownerRole: 'safety' }
        ]
      },
      {
        kind: 'abort',
        title: 'Abort Swim Protocol',
        steps: [
          { id: 'abort-1', order: 1, label: 'Captain broadcasts abort order to all channels', ownerRole: 'captain' },
          { id: 'abort-2', order: 2, label: 'Kayak escort signals swimmer and maintains calm extraction path', ownerRole: 'kayak-1' },
          { id: 'abort-3', order: 3, label: 'Boat lead moves to extraction position', ownerRole: 'boat' },
          { id: 'abort-4', order: 4, label: 'Medic begins recovery protocol as soon as swimmer boards', ownerRole: 'medical' },
          { id: 'abort-5', order: 5, label: 'Safety lead closes incident timeline with location and cause', ownerRole: 'safety' }
        ]
      }
    ],
    communications: [
      {
        id: 'message-seed',
        channel: 'broadcast',
        at: iso(subMinutes(now, 12)),
        actorId: 'crew-captain',
        body: 'Hold current formation. Feeding window approaching.',
        requiresConfirmation: true
      }
    ],
    partnerTasks: [
      {
        id: 'partner-sponsor-midpoint',
        title: 'Midpoint sponsor photo set',
        ownerId: 'crew-media',
        dueAt: iso(addMinutes(now, 55)),
        status: 'pending',
        notes: 'Capture only when operations are quiet.'
      },
      {
        id: 'partner-post-update',
        title: 'Draft post-swim sponsor recap',
        ownerId: 'crew-media',
        dueAt: iso(addHours(now, 5)),
        status: 'pending',
        notes: 'Use approved safety-first language.'
      }
    ],
    session: {
      swimmerName: 'Catherine Breed',
      location: 'Catalina Channel',
      plannedDistance: '20.2 miles',
      plannedStartTime: '06:00',
      gpsStart: '33.34590° N, 118.32780° W',
      gpsEnd: '33.73610° N, 118.28350° W',
      primaryVessel: 'Support vessel Bravo',
      supportVessels: 'Kayak 1, Kayak 2, zodiac standby',
      leadCrew: 'Maya Chen, Tom Reyes',
      completedBy: 'Maya Chen'
    },
    medicalVitals: {
      heartRateBpm: '58',
      bodyTempF: '98.4',
      spo2: '99',
      weightLbs: '',
      sleepHours: '7.5',
      sleepQuality: 'Good'
    },
    wellnessRatings: {
      mood: 8,
      motivation: 9,
      stress: 4,
      anxiety: 3,
      confidence: 8
    },
    wildlifeSightings: [],
    wowsaPhotos: [],
    expeditionCheckpoints: [
      {
        id: 'checkpoint-start',
        at: iso(startedAt),
        lat: 33.3459,
        lon: -118.3278,
        gps: '33.34590° N, 118.32780° W',
        accuracyM: 9,
        label: 'Start checkpoint',
        note: 'Mile zero GPS recorded at swimmer entry.',
        actorId: 'crew-captain'
      },
      {
        id: 'checkpoint-current',
        at: iso(subMinutes(now, 2)),
        lat: 33.397,
        lon: -118.412,
        gps: '33.39700° N, 118.41200° W',
        accuracyM: 12,
        label: 'Current support position',
        note: 'Support vessel position logged for expedition track.',
        actorId: 'crew-boat'
      }
    ]
  };
}
