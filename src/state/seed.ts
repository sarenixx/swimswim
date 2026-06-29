import { addHours, addMinutes, subHours, subMinutes } from 'date-fns';
import type { CrewRole, EmergencyKind, Mission } from './types';

export const roleLabels: Record<CrewRole, string> = {
  captain: 'Captain',
  safety: 'Safety Lead',
  medical: 'Medic',
  'first-mate': 'First Mate',
  observer: 'Observer',
  'land-support': 'Lead Land Support',
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

export const liveMissionName = 'California coast swim';
export const legacyLiveMissionName = 'Catalina Channel Qualifier';

export function buildLiveSeedMission(now = new Date()): Mission {
  const startedAt = subMinutes(now, 84);
  const shiftStart = subHours(now, 1);
  const shiftEnd = addHours(now, 2);
  const nextShiftStart = addHours(now, 2);
  const nextShiftEnd = addHours(now, 5);

  return {
    id: 'mission-catalina-qualifier',
    mode: 'live',
    name: liveMissionName,
    status: 'preparing',
    startedAt: iso(startedAt),
    feedingIntervalMinutes: 30,
    wowsaPhotoIntervalMinutes: 30,
    lastFeedingAt: iso(subMinutes(now, 26)),
    nextFeedingAt: iso(addMinutes(now, 4)),
    feedingPlan: [
      {
        id: 'feed-standard-carb',
        label: 'Standard carb bottle',
        intervalMinutes: 30,
        calories: 180,
        hydrationOz: 12,
        electrolytesMg: 350,
        notes: 'Primary kayak handoff. Confirm verbal response before resuming formation.',
        backup: false
      },
      {
        id: 'feed-warm-broth',
        label: 'Warm broth backup',
        intervalMinutes: 60,
        calories: 90,
        hydrationOz: 8,
        electrolytesMg: 500,
        notes: 'Use if swimmer reports cold stress, nausea, or refusal of sweet feed.',
        backup: true
      },
      {
        id: 'feed-gel-water',
        label: 'Gel plus water backup',
        intervalMinutes: 30,
        calories: 110,
        hydrationOz: 6,
        electrolytesMg: 125,
        notes: 'Compact backup held by relief kayak.',
        backup: true
      }
    ],
    riskPlan: {
      tideWindow: 'Daily playbook review: wind, swell, fog, tides, temperature, red flag zone, and safe harbor options',
      weatherSource: 'NOAA Marine Forecasts, Surfline/Mark Sponsler, CeNCOOS/WCOFS, COAMPS, HFR radar, vessel observation',
      abortConditions: [
        'Sustained swimmer distress or loss of coherent response',
        'Lead Water Safety medical veto: confusion, stumbling, fumbling, mumbling, uncontrolled shivering, oliguria, or lung crackles',
        'Significant wave height exceeds 2m or section-specific JC threshold',
        'Wind exceeds go/no-go threshold for direction: bow 12 kt, side 15 kt, stern 25 kt, or headwind above 20 kt',
        'Zero-visibility fog or visibility below 1000m without PLB/AIS float and full lighting protocol',
        'Swimmer cannot be seen from vessel due to swell',
        'Confirmed shark within 1000m of swimmer',
        'Loss of kayaker-vessel communication beyond agreed JC limit',
        'Vessel emergency: mechanical failure, fire, flooding, unsafe navigation, or authority-directed evacuation'
      ],
      medicalConcerns: [
        'Rhabdomyolysis signs: cola-colored urine, dipstick blood, extreme muscle pain, swelling, weakness, or lethargy',
        'Hypothermia/cold stress: shivering, umbles, marked stroke-rate drop, or coordination loss',
        'Weight loss: 5-10 lb below baseline is caution; more than 10 lb requires rest days and nourishment',
        'Swimming-induced pulmonary edema: shortness of breath, SpO2 drop greater than 5%, rales, or crackles',
        'Oliguria: failure to urinate for more than 10 hours despite fluid intake',
        'Blood in urine or urine dipstick positive for blood after exertion',
        'Loss or irregularity of menses as possible sign of energy imbalance',
        'Skin maceration or soft tissue infection: redness, tenderness, swelling, papules, or blistering',
        'Environmental water disease: diarrhea, abdominal pain, ear pain, itching, hearing loss, or discharge',
        'Bites, stings, envenomations, debris, entanglement, or major marine injury'
      ],
      mitigationNotes: [
        'Skipper/Captain Matthew Sessions has final authority on vessel safety and navigation',
        'Lead Water Safety Jonathan Cahill owns in-water safety and swim go/no-go veto for medical reasons',
        'Director of Logistics Sara Sheltz manages the daily captain, water safety, land support, and logistics communication loop',
        'Lead Water Safety Personnel makes immediate onboard medical decisions with Medical Director and Lead Physician support',
        'Daily mental health check-in, pre/post-swim vitals, post-swim urine collection, and trend review by Medical Director',
        'No NSAIDs during the trip; use acetaminophen only per medical direction',
        'Collect urine after each swim, use dipsticks when indicated, and rehydrate to clear or faint yellow urine output',
        'Document care tier for every meaningful change: proactive care, minor care, moderate/urgent care, or emergency care',
        'Persistent soreness over 2-3 days, worsening symptoms, blood in urine, imaging needs, or loss of menstrual cycle require medical team consultation',
        'Stage active rewarming: dry quickly, electric blankets, chemical warmers to axilla/groin, and hot liquids only if fully alert',
        'Jellyfish stings: remove tentacles, rinse with sea water, immerse in 40-45 C hot water for 20 minutes, avoid rubbing, vinegar, and fresh water',
        'Major bite or injury: call 911, take vitals, keep patient horizontal, apply direct pressure, use tourniquet if needed and record application time',
        'Completed crew medical questionnaires and insurance information stay in the onboard medical binder',
        'WOWSA observer documents start/finish video, GPS coordinates, mileage, conditions, interruptions, and incident times',
        'VHF Channel 16, ZeroSixZero tracking, Garmin InReach/Starlink, and daily email log remain active for significant decisions'
      ]
    },
    position: {
      lat: 41.955,
      lon: -124.211,
      label: 'Oregon border launch corridor toward Crescent City',
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
        name: 'Captain',
        role: 'captain',
        phone: '',
        shiftStart: iso(shiftStart),
        shiftEnd: iso(shiftEnd),
        responsibilities: ['Final vessel safety and navigation authority', 'Route adjustments', 'USCG interface'],
        backupId: 'crew-safety',
        backupPlan: 'Lead Water Safety and First Mate pause swim operations while captain handles vessel or navigation safety.'
      },
      {
        id: 'crew-safety',
        name: 'Safety Lead',
        role: 'safety',
        phone: '+1 650 224 1189',
        shiftStart: iso(shiftStart),
        shiftEnd: iso(shiftEnd),
        responsibilities: ['Lead water safety', 'Escort kayak oversight', 'Shark watch', 'Medical veto'],
        backupId: 'crew-boat',
        backupPlan: 'First Mate or dedicated safety officer holds watch while JC handles direct swimmer or medical response.'
      },
      {
        id: 'crew-medical',
        name: 'Sarah',
        role: 'medical',
        phone: '+1 408 472 2770',
        shiftStart: iso(shiftStart),
        shiftEnd: iso(nextShiftEnd),
        responsibilities: ['Medical Director', 'Daily athlete assessment', 'Medical team coordination'],
        backupId: 'crew-captain',
        backupPlan: 'Lead Physician Jonathan Carter provides MD decision support and final medical authority when needed.'
      },
      {
        id: 'crew-kayak-1',
        name: 'Jonathan Cahill',
        role: 'kayak-1',
        phone: '+1 650 224 1189',
        shiftStart: iso(shiftStart),
        shiftEnd: iso(shiftEnd),
        responsibilities: ['Primary water escort', 'Feed station management', 'Environmental monitoring'],
        backupId: 'crew-kayak-2',
        backupPlan: 'Relief water support maintains swimmer within 10 metres and carries waterproof VHF during rotation.'
      },
      {
        id: 'crew-kayak-2',
        name: 'Heather Hitchcock',
        role: 'observer',
        phone: '',
        shiftStart: iso(nextShiftStart),
        shiftEnd: iso(nextShiftEnd),
        responsibilities: ['WOWSA observer', 'Data/tracking lead', 'Vessel-to-shore liaison'],
        backupId: 'crew-kayak-1',
        backupPlan: 'First Mate or shore operations continues time, GPS, interruption, and incident documentation.'
      },
      {
        id: 'crew-boat',
        name: 'Maisie Bristow',
        role: 'first-mate',
        phone: '',
        shiftStart: iso(shiftStart),
        shiftEnd: iso(nextShiftEnd),
        responsibilities: ['First Mate', 'Deck operations', 'Watch schedule', 'Vessel systems'],
        backupId: 'crew-captain',
        backupPlan: 'Captain or engineer/mechanical lead covers vessel systems during deck or emergency response.'
      },
      {
        id: 'crew-media',
        name: 'Sarah Scheltz',
        role: 'land-support',
        phone: '+1 818 307 7553',
        shiftStart: iso(shiftStart),
        shiftEnd: iso(shiftEnd),
        responsibilities: ['Lead land support', 'Shore-side backup record', 'California 2026 Gmail backup'],
        backupId: 'crew-safety',
        backupPlan: 'Observer keeps the official log onboard; land support receives the backup copy after session close.'
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
        id: 'pre-swim-gear-packed',
        category: 'pre-swim',
        title: 'Swim gear packed: suit, goggles, caps, grease, towels, warm layers',
        ownerId: 'crew-safety',
        completedAt: iso(subMinutes(now, 70)),
        completedBy: 'crew-safety',
        status: 'done'
      },
      {
        id: 'pre-nutrition-crates',
        category: 'pre-swim',
        title: 'Nutrition crates labeled by interval with backup bottles staged',
        ownerId: 'crew-kayak-1',
        completedAt: iso(subMinutes(now, 68)),
        completedBy: 'crew-kayak-1',
        status: 'done'
      },
      {
        id: 'pre-electronics-charged',
        category: 'pre-swim',
        title: 'Electronics charged: phones, GPS, radios, lights, battery banks',
        ownerId: 'crew-boat',
        completedAt: iso(subMinutes(now, 66)),
        completedBy: 'crew-boat',
        status: 'done'
      },
      {
        id: 'pre-documents-ready',
        category: 'pre-swim',
        title: 'Documents ready: permits, float plan, emergency contacts, observer notes',
        ownerId: 'crew-captain',
        completedAt: iso(subMinutes(now, 64)),
        completedBy: 'crew-captain',
        status: 'done'
      },
      {
        id: 'playbook-pre-swim-briefing',
        category: 'pre-swim',
        title: 'Playbook 0600 pre-swim briefing completed: weather, medical, equipment, WOWSA, vessel position, and feed plan',
        ownerId: 'crew-captain',
        status: 'pending'
      },
      {
        id: 'playbook-red-flag-zone-review',
        category: 'pre-swim',
        title: 'Red flag zone risks reviewed before entry',
        ownerId: 'crew-safety',
        status: 'pending'
      },
      {
        id: 'playbook-vessel-predeparture',
        category: 'pre-swim',
        title: 'Vessel pre-departure checklist complete: fuel reserve, engine, bilge, GPS/AIS/radar, VHF 16, float plan',
        ownerId: 'crew-boat',
        status: 'pending'
      },
      {
        id: 'playbook-emergency-readiness',
        category: 'pre-swim',
        title: 'Daily emergency readiness checked: AED, extinguishers, EPIRB/PLBs, first aid, oxygen, shark shield',
        ownerId: 'crew-safety',
        status: 'pending'
      },
      {
        id: 'playbook-comms-loop-confirmed',
        category: 'pre-swim',
        title: 'Daily communication loop confirmed between captain, water safety, land support, and logistics',
        ownerId: 'crew-captain',
        status: 'pending'
      },
      {
        id: 'pre-crew-supplies',
        category: 'pre-swim',
        title: 'Crew supplies packed: water, food, sunscreen, dry bags, seasick meds',
        ownerId: 'crew-safety',
        completedAt: iso(subMinutes(now, 62)),
        completedBy: 'crew-safety',
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
        id: 'playbook-post-swim-vitals',
        category: 'post-swim',
        title: 'Playbook post-swim vitals complete: temperature, HR, SpO2, breathing, cognitive, MSK, and fatigue check',
        ownerId: 'crew-medical',
        status: 'pending'
      },
      {
        id: 'playbook-wowsa-daily-log',
        category: 'post-swim',
        title: 'WOWSA daily log complete: start/finish video, GPS, mileage, conditions, interruptions, and incidents',
        ownerId: 'crew-kayak-2',
        status: 'pending'
      },
      {
        id: 'playbook-medication-log',
        category: 'post-swim',
        title: 'Medication issue log reviewed and controlled-drug witness requirements confirmed',
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
    operationalTimeline: [
      {
        id: 'op-arrival',
        category: 'arrival',
        label: 'Crew arrival and shore staging',
        at: iso(subMinutes(startedAt, 150)),
        ownerId: 'crew-captain',
        status: 'done',
        completedAt: iso(subMinutes(startedAt, 148)),
        completedBy: 'crew-captain',
        notes: 'All crew physically present, contact sheet checked, gear staged by vessel.'
      },
      {
        id: 'op-loadout',
        category: 'loading',
        label: 'Boat loadout and equipment check',
        at: iso(subMinutes(startedAt, 105)),
        ownerId: 'crew-boat',
        status: 'done',
        completedAt: iso(subMinutes(startedAt, 101)),
        completedBy: 'crew-boat',
        notes: 'Fuel, radios, GPS, safety gear, nutrition crates, and recovery bag loaded.'
      },
      {
        id: 'op-observer-brief',
        category: 'observer',
        label: 'Observer timing and rules brief',
        at: iso(subMinutes(startedAt, 75)),
        ownerId: 'crew-captain',
        status: 'done',
        completedAt: iso(subMinutes(startedAt, 73)),
        completedBy: 'crew-captain',
        notes: 'Observer clock, start confirmation, feed rules, and evidence cadence aligned.'
      },
      {
        id: 'op-warmup',
        category: 'warmup',
        label: 'Swimmer warmup and pre-entry condition check',
        at: iso(subMinutes(startedAt, 45)),
        ownerId: 'crew-medical',
        status: 'done',
        completedAt: iso(subMinutes(startedAt, 42)),
        completedBy: 'crew-medical',
        notes: 'Vitals, cold response, goggles, cap, grease, and communication cues confirmed.'
      },
      {
        id: 'op-boat-launch',
        category: 'launch',
        label: 'Boat launch and escort formation',
        at: iso(subMinutes(startedAt, 30)),
        ownerId: 'crew-boat',
        status: 'done',
        completedAt: iso(subMinutes(startedAt, 28)),
        completedBy: 'crew-boat',
        notes: 'Support vessel and kayaks moved into start formation.'
      },
      {
        id: 'op-swim-start',
        category: 'swim',
        label: 'Official swim start and observer clock',
        at: iso(startedAt),
        ownerId: 'crew-captain',
        status: 'done',
        completedAt: iso(startedAt),
        completedBy: 'crew-captain',
        notes: 'Start GPS, observer time, and all-team check-in logged.'
      },
      {
        id: 'op-next-feed',
        category: 'feeding',
        label: 'Next feed handoff window',
        at: iso(addMinutes(now, 4)),
        ownerId: 'crew-kayak-1',
        status: 'pending',
        contingencyWindowMinutes: 5,
        notes: 'Prepare primary carb bottle plus warm broth backup.'
      },
      {
        id: 'op-observer-sync',
        category: 'observer',
        label: 'Observer time and GPS sync',
        at: iso(addMinutes(now, 18)),
        ownerId: 'crew-safety',
        status: 'pending',
        contingencyWindowMinutes: 10,
        notes: 'Confirm observer log, feed count, GPS position, and active crew status.'
      },
      {
        id: 'op-risk-window',
        category: 'risk',
        label: 'Weather, current, and abort threshold reassessment',
        at: iso(addMinutes(now, 34)),
        ownerId: 'crew-captain',
        status: 'pending',
        contingencyWindowMinutes: 15,
        notes: 'Captain confirms continue, adjust route, pause, or abort.'
      },
      {
        id: 'op-recovery-standby',
        category: 'recovery',
        label: 'Recovery station standby check',
        at: iso(addHours(now, 2)),
        ownerId: 'crew-medical',
        status: 'pending',
        contingencyWindowMinutes: 30,
        notes: 'Warm handoff, dry layers, vitals station, and recovery nutrition staged.'
      }
    ],
    timeline: [],
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
        id: 'contact-onboard-medical',
        name: 'Jonathan Cahill',
        role: 'Lead Water Safety Personnel, OEC, WFR',
        phone: '+1 650 224 1189',
        channel: 'Onboard medical'
      },
      {
        id: 'contact-medical-director',
        name: 'Katherine Susskind',
        role: 'Medical Director, ATC',
        phone: '+1 408 472 2770',
        channel: 'Medical director'
      },
      {
        id: 'contact-lead-physician',
        name: 'Jonathan Carter',
        role: 'Lead Physician, MD',
        phone: '+1 415 577 4564',
        channel: 'Lead physician'
      },
      {
        id: 'contact-secondary-physician',
        name: 'Emily Kraus',
        role: 'Secondary Physician, female endurance athlete expert',
        phone: '+1 308 991 8055',
        channel: 'Secondary physician'
      },
      {
        id: 'contact-primary-care-provider',
        name: 'Kim Juarez',
        role: 'Primary Care Provider, NP',
        phone: '',
        channel: 'Primary care'
      },
      {
        id: 'contact-research-analysis',
        name: 'Rachel Prosser',
        role: 'Research Assistant / Data Analysis',
        phone: '+1 916 397 6632',
        channel: 'Medical data'
      },
      {
        id: 'contact-massage-therapy',
        name: 'Sheri Burgoyne',
        role: 'Massage Therapist',
        phone: '+1 805 469 0628',
        channel: 'Recovery'
      },
      {
        id: 'contact-director-logistics',
        name: 'Sara Sheltz',
        role: 'Director of Logistics',
        phone: '+1 818 307 7553',
        channel: 'Operations loop'
      },
      {
        id: 'contact-pr-lead',
        name: 'Billy Rinehart',
        role: 'PR and Communications Lead',
        phone: '+1 415 840 4168',
        channel: 'Media'
      },
      {
        id: 'contact-boat-owner',
        name: 'Kaipo Kelley',
        role: 'Boat Owner / Logistics',
        phone: '+1 760 696 0982',
        channel: 'Vessel logistics'
      },
      {
        id: 'contact-uscg-aux',
        name: 'Carlo Facchin',
        role: 'USCG Auxiliarist',
        phone: '+1 408 314 1718',
        channel: 'USCG support'
      },
      {
        id: 'contact-ice-mother',
        name: 'Robin Breed',
        role: "ICE - athlete's mother",
        phone: '+1 925 890 8889',
        channel: 'Emergency family'
      },
      {
        id: 'contact-coast-guard',
        name: 'US Coast Guard',
        role: 'Rescue Coordination',
        phone: '16',
        channel: 'VHF 16'
      },
      {
        id: 'contact-chp',
        name: 'California Highway Patrol',
        role: 'Highway emergency support',
        phone: '+1 800 835 5247',
        channel: '1-800-TELL-CHP'
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
          { id: 'medical-1', order: 1, label: 'Lead Water Safety Personnel makes the immediate onboard medical decision and stabilizes the athlete or crew member', ownerRole: 'medical' },
          { id: 'medical-2', order: 2, label: 'Take vitals and document symptoms, time, location, and care tier: proactive/minor, moderate/urgent, or emergency', ownerRole: 'safety' },
          { id: 'medical-3', order: 3, label: 'Consult Medical Director and Lead Physician on shore evaluation, labs, imaging, rest days, or continuation decision', ownerRole: 'captain' },
          { id: 'medical-4', order: 4, label: 'If urgent care, emergency department, or medical evacuation is needed, follow EAP chain of command and prepare transport', ownerRole: 'boat' },
          { id: 'medical-5', order: 5, label: 'Safety lead records decisions, contacts, vitals, medications, and next review time in the event log', ownerRole: 'safety' }
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
      swimmers: ['Catherine Breed'],
      location: 'Oregon Border to Mexican Border',
      plannedDistance: '900+ miles',
      plannedStartTime: 'June 29, 2026',
      gpsStart: 'Oregon / California border launch corridor',
      gpsEnd: 'Mexican border finish corridor',
      primaryVessel: 'M/V Catalyst (52ft Beneteau)',
      supportVessels: 'Escort kayak, tender, M/V Catalyst, shore support',
      leadCrew: 'Matthew Sessions, Jonathan Cahill, Sara Sheltz',
      completedBy: 'Sara Sheltz',
      operationsEmail: 'swimcalifornia2026@gmail.com'
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
    medicalChecklist: [
      {
        id: 'med-daily-mh-check',
        protocolArea: 'mental-health',
        cadence: 'daily',
        title: 'Daily mental health check-in completed',
        ownerId: 'crew-medical',
        instructions: 'Capture mood, recovery, outlook, and any concerns for Medical Director trend review.',
        status: 'pending'
      },
      {
        id: 'med-pre-swim-vitals',
        protocolArea: 'daily-monitoring',
        cadence: 'pre-swim',
        title: 'Pre-swim vitals recorded',
        ownerId: 'crew-medical',
        instructions: 'Record weight, blood pressure, oxygen saturation, heart rate, and baseline notes before swim.',
        status: 'pending'
      },
      {
        id: 'med-post-swim-vitals-urine',
        protocolArea: 'daily-monitoring',
        cadence: 'post-swim',
        title: 'Post-swim vitals and urine collection completed',
        ownerId: 'crew-medical',
        instructions: 'Record post-swim vitals, collect urine, note color, and run dipstick when indicated.',
        status: 'pending'
      },
      {
        id: 'med-rhabdo-screen',
        protocolArea: 'rhabdomyolysis',
        cadence: 'post-swim',
        title: 'Rhabdomyolysis screen clear',
        ownerId: 'crew-medical',
        instructions: 'Check for cola-colored urine, dipstick blood, extreme muscle pain, swelling, weakness, or lethargy.',
        status: 'pending'
      },
      {
        id: 'med-hypothermia-screen',
        protocolArea: 'hypothermia',
        cadence: 'as-needed',
        title: 'Hypothermia/cold stress screen clear',
        ownerId: 'crew-medical',
        instructions: 'Watch shivering, umbles, stroke-rate drop, coordination loss, and active rewarming thresholds.',
        status: 'pending'
      },
      {
        id: 'med-weight-loss-review',
        protocolArea: 'weight-loss',
        cadence: 'daily',
        title: 'Weight loss and fueling trend reviewed',
        ownerId: 'crew-medical',
        instructions: 'Flag 5-10 lb below baseline as caution; more than 10 lb requires rest days and nourishment.',
        status: 'pending'
      },
      {
        id: 'med-sipe-screen',
        protocolArea: 'sipe',
        cadence: 'as-needed',
        title: 'Pulmonary edema screen clear',
        ownerId: 'crew-medical',
        instructions: 'Check shortness of breath, SpO2 drop greater than 5%, rales, or crackles; hold swim 24-48h if indicated.',
        status: 'pending'
      },
      {
        id: 'med-skin-soft-tissue-check',
        protocolArea: 'skin-soft-tissue',
        cadence: 'daily',
        title: 'Skin, chafing, and soft tissue check completed',
        ownerId: 'crew-medical',
        instructions: 'Inspect breaks in skin, redness, tenderness, swelling, papules, blistering, wetsuit rub, and infection risk.',
        status: 'pending'
      },
      {
        id: 'med-water-illness-check',
        protocolArea: 'water-illness',
        cadence: 'daily',
        title: 'Water illness symptoms reviewed',
        ownerId: 'crew-medical',
        instructions: 'Check diarrhea, abdominal pain, otitis externa signs, ear pain, itching, hearing loss, or discharge.',
        status: 'pending'
      },
      {
        id: 'med-bites-stings-debris-check',
        protocolArea: 'bites-stings',
        cadence: 'as-needed',
        title: 'Bites, stings, debris, and entanglement risk reviewed',
        ownerId: 'crew-safety',
        instructions: 'Document jellyfish, bites, hooks, lines, debris, bleeding control, and evacuation decisions.',
        status: 'pending'
      },
      {
        id: 'med-crew-binder',
        protocolArea: 'daily-monitoring',
        cadence: 'pre-swim',
        title: 'Crew medical binder confirmed onboard',
        ownerId: 'crew-safety',
        instructions: 'Confirm crew medical questionnaires, insurance information, and prescription medication log are stored onboard.',
        status: 'pending'
      },
      {
        id: 'med-weekly-team-review',
        protocolArea: 'daily-monitoring',
        cadence: 'weekly',
        title: 'Weekly medical team review completed',
        ownerId: 'crew-medical',
        instructions: 'Review daily check-in data, vitals, urine notes, trends, and immediate red flags with the medical team and Catherine.',
        status: 'pending'
      },
      {
        id: 'med-monthly-menses-review',
        protocolArea: 'daily-monitoring',
        cadence: 'weekly',
        title: 'Menses, energy balance, and hormonal health reviewed',
        ownerId: 'crew-medical',
        instructions: 'Monitor monthly bleed or irregularity despite IUD; flag loss or irregularity as possible energy imbalance risk.',
        status: 'pending'
      },
      {
        id: 'med-midpoint-labs',
        protocolArea: 'daily-monitoring',
        cadence: 'as-needed',
        title: 'Midpoint bloodwork plan tracked',
        ownerId: 'crew-medical',
        instructions: 'Repeat labs around midpoint: iron, TSH, CBC, CK/chemistry as indicated, then compare against pre-swim results.',
        status: 'pending'
      },
      {
        id: 'med-post-swim-follow-up',
        protocolArea: 'daily-monitoring',
        cadence: 'post-swim',
        title: 'Post-expedition medical follow-up planned',
        ownerId: 'crew-medical',
        instructions: 'Plan physical, bloodwork, urinalysis, and mental health follow-up after swim completion.',
        status: 'pending'
      },
      {
        id: 'med-prehab-recovery-routine',
        protocolArea: 'skin-soft-tissue',
        cadence: 'daily',
        title: 'Daily pre-hab and recovery routine completed',
        ownerId: 'crew-medical',
        instructions: 'Track priming weights/bands, Theragun, Normatec, back routine, electrolytes, protein, foam roller, lacrosse ball, and soft tissue work.',
        status: 'pending'
      },
      {
        id: 'med-sleep-protocol',
        protocolArea: 'mental-health',
        cadence: 'daily',
        title: 'Sleep protocol confirmed',
        ownerId: 'crew-medical',
        instructions: 'Confirm sleep mask and ear plugs; note sleep quality and recovery impact.',
        status: 'pending'
      },
      {
        id: 'med-prescription-inventory',
        protocolArea: 'daily-monitoring',
        cadence: 'daily',
        title: 'Prescription medication inventory and usage log reviewed',
        ownerId: 'crew-medical',
        instructions: 'Record medication, dosage, amount, usage, reason, and medic signature whenever prescription medication is used.',
        status: 'pending'
      },
      {
        id: 'med-crew-preparticipation-forms',
        protocolArea: 'daily-monitoring',
        cadence: 'pre-swim',
        title: 'Crew medical pre-participation forms complete',
        ownerId: 'crew-safety',
        instructions: 'Confirm crew health statement, medical information, provider physical form, emergency contacts, medications, allergies, and dietary restrictions.',
        status: 'pending'
      }
    ],
    medicalDailyRecords: [],
    medicalSymptomLog: [],
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

export function buildTemplateSeedMission(now = new Date()): Mission {
  const startedAt = subMinutes(now, 58);
  const shiftStart = subHours(now, 2);
  const shiftEnd = addHours(now, 2);
  const nextShiftStart = addHours(now, 2);
  const nextShiftEnd = addHours(now, 6);

  return {
    id: 'mission-template-endurance-swim',
    mode: 'template',
    name: 'Endurance Swim Expedition OS Template',
    status: 'active',
    startedAt: iso(startedAt),
    feedingIntervalMinutes: 30,
    wowsaPhotoIntervalMinutes: 30,
    lastFeedingAt: iso(subMinutes(now, 27)),
    nextFeedingAt: iso(addMinutes(now, 3)),
    feedingPlan: [
      {
        id: 'feed-standard-carb',
        label: 'Primary feed [replace]',
        intervalMinutes: 30,
        calories: 180,
        hydrationOz: 12,
        electrolytesMg: 350,
        notes: 'Primary nutrition option and handoff note.',
        backup: false
      },
      {
        id: 'feed-warm-backup',
        label: 'Warm backup [replace]',
        intervalMinutes: 60,
        calories: 90,
        hydrationOz: 8,
        electrolytesMg: 500,
        notes: 'Backup for cold stress, nausea, or feed refusal.',
        backup: true
      },
      {
        id: 'feed-compact-backup',
        label: 'Compact backup [replace]',
        intervalMinutes: 30,
        calories: 110,
        hydrationOz: 6,
        electrolytesMg: 125,
        notes: 'Small fallback carried by escort.',
        backup: true
      }
    ],
    riskPlan: {
      tideWindow: '[Tide/current window and reassessment cadence]',
      weatherSource: '[Marine forecast source, harbor report, vessel observation]',
      abortConditions: [
        'Sustained swimmer distress or loss of coherent response',
        'Cold stress, medical concern, or repeated feed refusal',
        'Unsafe wind, swell, visibility, lightning, or authority instruction',
        'Support craft cannot maintain safe formation'
      ],
      medicalConcerns: [
        'Cold stress',
        'Nausea or feed refusal',
        'Pain altering stroke mechanics',
        'Confusion or unusual mood shift'
      ],
      mitigationNotes: [
        'Assign medical scan owner and interval',
        'Assign go/no-go decision owner',
        'Stage backup nutrition with escort'
      ]
    },
    position: {
      lat: 36.615,
      lon: -121.91,
      label: '[Current GPS checkpoint label]',
      updatedAt: iso(subMinutes(now, 2))
    },
    conditions: {
      observedAt: iso(subMinutes(now, 5)),
      airTempF: 63,
      waterTempF: 58,
      windKts: 10,
      currentKts: 0.6,
      visibilityNm: 5,
      swellFt: 2,
      summary: 'Sample operating conditions for template walkthrough'
    },
    crew: [
      {
        id: 'crew-captain',
        name: 'Crew Captain [Replace]',
        role: 'captain',
        phone: '+1 000 000 0001',
        shiftStart: iso(shiftStart),
        shiftEnd: iso(shiftEnd),
        responsibilities: ['Command authority', 'Go/no-go decision', 'Broadcast ownership'],
        backupId: 'crew-safety',
        backupPlan: 'Safety lead becomes temporary broadcast owner if captain is unavailable.'
      },
      {
        id: 'crew-safety',
        name: 'Safety Lead [Replace]',
        role: 'safety',
        phone: '+1 000 000 0002',
        shiftStart: iso(shiftStart),
        shiftEnd: iso(shiftEnd),
        responsibilities: ['Hazard watch', 'Check-in cadence', 'Incident documentation'],
        backupId: 'crew-boat',
        backupPlan: 'Boat lead covers hazard watch while safety lead documents or escalates.'
      },
      {
        id: 'crew-medical',
        name: 'Medical Lead [Replace]',
        role: 'medical',
        phone: '+1 000 000 0003',
        shiftStart: iso(shiftStart),
        shiftEnd: iso(nextShiftEnd),
        responsibilities: ['Medical readiness', 'Condition assessments', 'Recovery workflow'],
        backupId: 'crew-captain',
        backupPlan: 'Captain routes swimmer to external medical support if medical lead is unavailable.'
      },
      {
        id: 'crew-kayak-1',
        name: 'Support Kayak 1 [Replace]',
        role: 'kayak-1',
        phone: '+1 000 000 0004',
        shiftStart: iso(shiftStart),
        shiftEnd: iso(shiftEnd),
        responsibilities: ['Primary escort', 'Feeding handoff', 'Stroke observation'],
        backupId: 'crew-kayak-2',
        backupPlan: 'Relief escort takes over feeding and visual support during rotation.'
      },
      {
        id: 'crew-kayak-2',
        name: 'Support Kayak 2 [Replace]',
        role: 'kayak-2',
        phone: '+1 000 000 0005',
        shiftStart: iso(nextShiftStart),
        shiftEnd: iso(nextShiftEnd),
        responsibilities: ['Relief escort', 'Backup nutrition', 'Visual confirmation'],
        backupId: 'crew-kayak-1',
        backupPlan: 'Primary escort keeps backup nutrition if relief escort is repositioning.'
      },
      {
        id: 'crew-boat',
        name: 'Boat Lead [Replace]',
        role: 'boat',
        phone: '+1 000 000 0006',
        shiftStart: iso(shiftStart),
        shiftEnd: iso(nextShiftEnd),
        responsibilities: ['Vessel operations', 'Navigation track', 'Radio watch'],
        backupId: 'crew-captain',
        backupPlan: 'Captain assigns radio watch to safety lead if boat lead is maneuvering.'
      },
      {
        id: 'crew-media',
        name: 'Evidence Lead [Replace]',
        role: 'media',
        phone: '+1 000 000 0007',
        shiftStart: iso(shiftStart),
        shiftEnd: iso(shiftEnd),
        responsibilities: ['Certification photos', 'Partner deliverables', 'Media archive'],
        backupId: 'crew-safety',
        backupPlan: 'Media work pauses and evidence lead becomes spare recorder/lookout when safety needs support.'
      }
    ],
    checklistItems: [
      {
        id: 'pre-boat-ready',
        category: 'pre-swim',
        title: 'Support vessel systems verified (fuel, radio, nav, reserve lighting)',
        ownerId: 'crew-boat',
        completedAt: iso(subMinutes(now, 90)),
        completedBy: 'crew-boat',
        status: 'done'
      },
      {
        id: 'pre-weather-route',
        category: 'pre-swim',
        title: 'Go/no-go weather thresholds documented for this venue',
        ownerId: 'crew-captain',
        completedAt: iso(subMinutes(now, 88)),
        completedBy: 'crew-captain',
        status: 'done'
      },
      {
        id: 'pre-medical-readiness',
        category: 'pre-swim',
        title: 'Medical extraction kit, warming plan, and recovery path confirmed',
        ownerId: 'crew-medical',
        completedAt: iso(subMinutes(now, 86)),
        completedBy: 'crew-medical',
        status: 'done'
      },
      {
        id: 'pre-vhf-channel-16',
        category: 'pre-swim',
        title: 'Primary emergency channel and backup channel assigned',
        ownerId: 'crew-boat',
        completedAt: iso(subMinutes(now, 84)),
        completedBy: 'crew-boat',
        status: 'done'
      },
      {
        id: 'pre-route-loaded',
        category: 'pre-swim',
        title: 'Route map loaded with start, midpoint, and extraction coordinates',
        ownerId: 'crew-boat',
        completedAt: iso(subMinutes(now, 82)),
        completedBy: 'crew-boat',
        status: 'done'
      },
      {
        id: 'pre-float-plan-filed',
        category: 'pre-swim',
        title: 'Float plan submitted to local shore contact or authority',
        ownerId: 'crew-captain',
        completedAt: iso(subMinutes(now, 80)),
        completedBy: 'crew-captain',
        status: 'done'
      },
      {
        id: 'pre-pfds-accounted',
        category: 'pre-swim',
        title: 'Safety gear counted: PFDs, throwable, signaling, fire control',
        ownerId: 'crew-safety',
        completedAt: iso(subMinutes(now, 78)),
        completedBy: 'crew-safety',
        status: 'done'
      },
      {
        id: 'pre-fuel-reserve',
        category: 'pre-swim',
        title: 'Fuel plan includes route, contingency, and reserve margin',
        ownerId: 'crew-boat',
        completedAt: iso(subMinutes(now, 76)),
        completedBy: 'crew-boat',
        status: 'done'
      },
      {
        id: 'pre-marine-forecast',
        category: 'pre-swim',
        title: 'Marine forecast reviewed with abort thresholds and escalation owner',
        ownerId: 'crew-safety',
        completedAt: iso(subMinutes(now, 74)),
        completedBy: 'crew-safety',
        status: 'done'
      },
      {
        id: 'pre-water-temp',
        category: 'pre-swim',
        title: 'Water temperature baseline logged against swimmer prep plan',
        ownerId: 'crew-medical',
        completedAt: iso(subMinutes(now, 72)),
        completedBy: 'crew-medical',
        status: 'done'
      },
      {
        id: 'pre-wildlife-scan',
        category: 'pre-swim',
        title: 'Known local wildlife risk and response protocol reviewed',
        ownerId: 'crew-safety',
        completedAt: iso(subMinutes(now, 70)),
        completedBy: 'crew-safety',
        status: 'done'
      },
      {
        id: 'pre-feeding-schedule',
        category: 'pre-swim',
        title: 'Swimmer nutrition & feeding strategy confirmed with all escort roles',
        ownerId: 'crew-kayak-1',
        completedAt: iso(subMinutes(now, 68)),
        completedBy: 'crew-kayak-1',
        status: 'done'
      },
      {
        id: 'pre-abort-protocol',
        category: 'pre-swim',
        title: 'Abort criteria and extraction sequence acknowledged by full team',
        ownerId: 'crew-captain',
        completedAt: iso(subMinutes(now, 66)),
        completedBy: 'crew-captain',
        status: 'done'
      },
      {
        id: 'pre-swim-gear-packed',
        category: 'pre-swim',
        title: 'Swim gear packed: suit, goggles, caps, grease, towels, warm layers',
        ownerId: 'crew-safety',
        completedAt: iso(subMinutes(now, 64)),
        completedBy: 'crew-safety',
        status: 'done'
      },
      {
        id: 'pre-nutrition-crates',
        category: 'pre-swim',
        title: 'Nutrition crates labeled by interval with backup bottles staged',
        ownerId: 'crew-kayak-1',
        completedAt: iso(subMinutes(now, 62)),
        completedBy: 'crew-kayak-1',
        status: 'done'
      },
      {
        id: 'pre-electronics-charged',
        category: 'pre-swim',
        title: 'Electronics charged: phones, GPS, radios, lights, battery banks',
        ownerId: 'crew-boat',
        completedAt: iso(subMinutes(now, 60)),
        completedBy: 'crew-boat',
        status: 'done'
      },
      {
        id: 'pre-documents-ready',
        category: 'pre-swim',
        title: 'Documents ready: permits, float plan, emergency contacts, observer notes',
        ownerId: 'crew-captain',
        completedAt: iso(subMinutes(now, 58)),
        completedBy: 'crew-captain',
        status: 'done'
      },
      {
        id: 'pre-crew-supplies',
        category: 'pre-swim',
        title: 'Crew supplies packed: water, food, sunscreen, dry bags, seasick meds',
        ownerId: 'crew-safety',
        completedAt: iso(subMinutes(now, 56)),
        completedBy: 'crew-safety',
        status: 'done'
      },
      {
        id: 'in-kayak-check',
        category: 'in-swim',
        title: 'Support crew schedule check-in (rotate roles and confirm readiness)',
        ownerId: 'crew-safety',
        dueAt: iso(addMinutes(now, 8)),
        status: 'pending'
      },
      {
        id: 'in-feeding-readiness',
        category: 'in-swim',
        title: 'Prepare next feeding bottle and backup nutrition option',
        ownerId: 'crew-kayak-1',
        dueAt: iso(addMinutes(now, 1)),
        status: 'pending'
      },
      {
        id: 'in-condition-scan',
        category: 'in-swim',
        title: 'Structured swimmer condition scan with concise note',
        ownerId: 'crew-medical',
        dueAt: iso(addMinutes(now, 6)),
        status: 'pending'
      },
      {
        id: 'post-recovery',
        category: 'post-swim',
        title: 'Post-swim recovery workflow: warming, vitals, nutrition, and observations',
        ownerId: 'crew-medical',
        status: 'pending'
      },
      {
        id: 'post-wowsa-review',
        category: 'post-swim',
        title: 'Certification evidence review (photo + GPS + timestamp + distance)',
        ownerId: 'crew-media',
        status: 'pending'
      },
      {
        id: 'post-debrief',
        category: 'post-swim',
        title: 'Operational debrief: wins, risks, near misses, and next-iteration changes',
        ownerId: 'crew-captain',
        status: 'pending'
      },
      {
        id: 'mental-captain-load',
        category: 'mental-health',
        title: 'Decision-load check: captain confirms cognitive bandwidth and backup plan',
        ownerId: 'crew-safety',
        dueAt: iso(addMinutes(now, 20)),
        status: 'pending'
      },
      {
        id: 'mental-team-rotation',
        category: 'mental-health',
        title: 'Crew rotation wellness check for off-duty decompression window',
        ownerId: 'crew-captain',
        dueAt: iso(addMinutes(now, 32)),
        status: 'pending'
      },
      {
        id: 'mental-swimmer-supported',
        category: 'mental-health',
        title: 'Swimmer emotional support check with agreed communication cue',
        ownerId: 'crew-medical',
        dueAt: iso(addMinutes(now, 40)),
        status: 'pending'
      },
      {
        id: 'mental-concerns-communicated',
        category: 'mental-health',
        title: 'Open concerns captured and routed to the right role in real time',
        ownerId: 'crew-medical',
        dueAt: iso(addMinutes(now, 46)),
        status: 'pending'
      }
    ],
    operationalTimeline: [
      {
        id: 'op-arrival',
        category: 'arrival',
        label: 'Crew arrival and shore staging',
        at: iso(subMinutes(startedAt, 150)),
        ownerId: 'crew-captain',
        status: 'done',
        completedAt: iso(subMinutes(startedAt, 148)),
        completedBy: 'crew-captain',
        notes: 'All crew present, contacts checked, and gear staged by vessel.'
      },
      {
        id: 'op-loadout',
        category: 'loading',
        label: 'Boat loadout and equipment check',
        at: iso(subMinutes(startedAt, 105)),
        ownerId: 'crew-boat',
        status: 'done',
        completedAt: iso(subMinutes(startedAt, 101)),
        completedBy: 'crew-boat',
        notes: 'Fuel, radios, GPS, safety gear, nutrition crates, and recovery bag loaded.'
      },
      {
        id: 'op-observer-brief',
        category: 'observer',
        label: 'Observer timing and rules brief',
        at: iso(subMinutes(startedAt, 75)),
        ownerId: 'crew-captain',
        status: 'done',
        completedAt: iso(subMinutes(startedAt, 73)),
        completedBy: 'crew-captain',
        notes: 'Observer clock, start confirmation, feed rules, and evidence cadence aligned.'
      },
      {
        id: 'op-warmup',
        category: 'warmup',
        label: 'Swimmer warmup and pre-entry condition check',
        at: iso(subMinutes(startedAt, 45)),
        ownerId: 'crew-medical',
        status: 'done',
        completedAt: iso(subMinutes(startedAt, 42)),
        completedBy: 'crew-medical',
        notes: 'Vitals, cold response, goggles, cap, grease, and communication cues confirmed.'
      },
      {
        id: 'op-boat-launch',
        category: 'launch',
        label: 'Boat launch and escort formation',
        at: iso(subMinutes(startedAt, 30)),
        ownerId: 'crew-boat',
        status: 'done',
        completedAt: iso(subMinutes(startedAt, 28)),
        completedBy: 'crew-boat',
        notes: 'Support vessel and kayaks moved into start formation.'
      },
      {
        id: 'op-swim-start',
        category: 'swim',
        label: 'Official swim start and observer clock',
        at: iso(startedAt),
        ownerId: 'crew-captain',
        status: 'done',
        completedAt: iso(startedAt),
        completedBy: 'crew-captain',
        notes: 'Start GPS, observer time, and all-team check-in logged.'
      },
      {
        id: 'op-next-feed',
        category: 'feeding',
        label: 'Next feed handoff window',
        at: iso(addMinutes(now, 3)),
        ownerId: 'crew-kayak-1',
        status: 'pending',
        contingencyWindowMinutes: 5,
        notes: 'Prepare primary feed and backup nutrition.'
      },
      {
        id: 'op-observer-sync',
        category: 'observer',
        label: 'Observer time and GPS sync',
        at: iso(addMinutes(now, 16)),
        ownerId: 'crew-safety',
        status: 'pending',
        contingencyWindowMinutes: 10,
        notes: 'Confirm observer log, feed count, GPS position, and active crew status.'
      },
      {
        id: 'op-risk-window',
        category: 'risk',
        label: 'Weather, current, and abort threshold reassessment',
        at: iso(addMinutes(now, 30)),
        ownerId: 'crew-captain',
        status: 'pending',
        contingencyWindowMinutes: 15,
        notes: 'Captain confirms continue, adjust route, pause, or abort.'
      },
      {
        id: 'op-recovery-standby',
        category: 'recovery',
        label: 'Recovery station standby check',
        at: iso(addHours(now, 2)),
        ownerId: 'crew-medical',
        status: 'pending',
        contingencyWindowMinutes: 30,
        notes: 'Warm handoff, dry layers, vitals station, and recovery nutrition staged.'
      }
    ],
    timeline: [
      {
        id: 'event-template-onboarding',
        type: 'note',
        at: iso(subMinutes(now, 57)),
        actorId: 'crew-captain',
        summary: 'Template loaded for customization',
        detail: 'Replace bracketed fields, assign real contacts, then run Mission Setup before operations.',
        severity: 'info'
      },
      {
        id: 'event-template-strategy',
        type: 'note',
        at: iso(subMinutes(now, 42)),
        actorId: 'crew-captain',
        summary: 'Strategy framework prompt',
        detail: 'Capture route checkpoints, weather thresholds, feeding mix, and abort decision triggers.',
        severity: 'info'
      },
      {
        id: 'event-template-feeding',
        type: 'feeding',
        at: iso(subMinutes(now, 27)),
        actorId: 'crew-kayak-1',
        summary: 'Sample feeding event logged',
        detail: 'Demonstrates cadence tracking and timestamped completion.',
        severity: 'info'
      },
      {
        id: 'event-template-checkin',
        type: 'check-in',
        at: iso(subMinutes(now, 8)),
        actorId: 'crew-safety',
        summary: 'Sample team check-in',
        detail: 'Use this pattern to log every cadence confirmation.',
        severity: 'info'
      }
    ],
    alerts: [],
    swimmerConditions: [
      {
        id: 'condition-template-seed',
        at: iso(subMinutes(now, 14)),
        actorId: 'crew-medical',
        level: 'steady',
        note: 'Sample condition entry. Replace with real swimmer status language.'
      }
    ],
    contacts: [
      {
        id: 'contact-coast-guard',
        name: '[Rescue Coordination Contact]',
        role: 'Emergency Coordination',
        phone: '+1 000 000 0101',
        channel: '[Primary Emergency Channel]'
      },
      {
        id: 'contact-doctor',
        name: '[Primary Medical Contact]',
        role: 'Medical',
        phone: '+1 000 000 0102',
        channel: 'Medical'
      },
      {
        id: 'contact-leadership',
        name: '[Expedition Captain]',
        role: 'Captain',
        phone: '+1 000 000 0103',
        channel: 'Captain'
      }
    ],
    protocols: [
      {
        kind: 'distress',
        title: 'Swimmer Distress Protocol Template',
        steps: [
          { id: 'distress-1', order: 1, label: 'Escort establishes visual control and swimmer communication', ownerRole: 'kayak-1' },
          { id: 'distress-2', order: 2, label: 'Captain freezes non-essential traffic and confirms action plan', ownerRole: 'captain' },
          { id: 'distress-3', order: 3, label: 'Medical lead prepares immediate assessment workflow', ownerRole: 'medical' },
          { id: 'distress-4', order: 4, label: 'Boat lead positions for safe extraction and minimal wake', ownerRole: 'boat' },
          { id: 'distress-5', order: 5, label: 'Safety lead logs timeline and response decisions', ownerRole: 'safety' }
        ]
      },
      {
        kind: 'medical',
        title: 'Medical Issue Protocol Template',
        steps: [
          { id: 'medical-1', order: 1, label: 'Medical lead directs assessment and stabilization steps', ownerRole: 'medical' },
          { id: 'medical-2', order: 2, label: 'Captain confirms pause vs abort criteria', ownerRole: 'captain' },
          { id: 'medical-3', order: 3, label: 'Boat lead sets recovery area and dry handoff path', ownerRole: 'boat' },
          { id: 'medical-4', order: 4, label: 'Safety lead captures vitals, times, and decisions', ownerRole: 'safety' }
        ]
      },
      {
        kind: 'abort',
        title: 'Abort Swim Protocol Template',
        steps: [
          { id: 'abort-1', order: 1, label: 'Captain broadcasts abort and confirms acknowledgement', ownerRole: 'captain' },
          { id: 'abort-2', order: 2, label: 'Escort stabilizes swimmer path to extraction point', ownerRole: 'kayak-1' },
          { id: 'abort-3', order: 3, label: 'Boat lead executes extraction approach', ownerRole: 'boat' },
          { id: 'abort-4', order: 4, label: 'Medical lead runs recovery protocol on boarding', ownerRole: 'medical' },
          { id: 'abort-5', order: 5, label: 'Safety lead closes incident log and next-actions list', ownerRole: 'safety' }
        ]
      }
    ],
    communications: [
      {
        id: 'message-template-seed',
        channel: 'broadcast',
        at: iso(subMinutes(now, 18)),
        actorId: 'crew-captain',
        body: 'Template prompt: confirm all channels and first feeding window.',
        requiresConfirmation: true
      }
    ],
    partnerTasks: [
      {
        id: 'partner-sponsor-midpoint',
        title: 'Certification or partner evidence checkpoint',
        ownerId: 'crew-media',
        dueAt: iso(addMinutes(now, 52)),
        status: 'pending',
        notes: 'Define exactly what needs to be captured and when safety conditions allow it.'
      },
      {
        id: 'partner-post-update',
        title: 'Post-swim stakeholder summary draft',
        ownerId: 'crew-media',
        dueAt: iso(addHours(now, 5)),
        status: 'pending',
        notes: 'Keep messaging operationally accurate and swimmer-first.'
      }
    ],
    session: {
      swimmerName: '[Swimmer Name]',
      swimmers: ['[Swimmer Name]'],
      location: '[Venue / Channel / Course]',
      plannedDistance: '[Distance + expected duration]',
      plannedStartTime: '[HH:MM local]',
      gpsStart: '[Start GPS coordinates]',
      gpsEnd: '[Finish GPS coordinates]',
      primaryVessel: '[Primary support vessel]',
      supportVessels: '[Escort kayaks, boat, standby assets]',
      leadCrew: '[Captain + operations lead]',
      completedBy: '[Prepared by]',
      operationsEmail: 'operations@example.com'
    },
    medicalVitals: {
      heartRateBpm: '',
      bodyTempF: '',
      spo2: '',
      weightLbs: '',
      sleepHours: '',
      sleepQuality: ''
    },
    wellnessRatings: {
      mood: 5,
      motivation: 5,
      stress: 5,
      anxiety: 5,
      confidence: 5
    },
    medicalChecklist: [
      {
        id: 'med-daily-mh-check',
        protocolArea: 'mental-health',
        cadence: 'daily',
        title: 'Daily mental health check-in completed',
        ownerId: 'crew-medical',
        instructions: 'Capture mood, recovery, outlook, and concerns for medical trend review.',
        status: 'pending'
      },
      {
        id: 'med-pre-swim-vitals',
        protocolArea: 'daily-monitoring',
        cadence: 'pre-swim',
        title: 'Pre-swim vitals recorded',
        ownerId: 'crew-medical',
        instructions: 'Record weight, blood pressure, oxygen saturation, heart rate, and baseline notes.',
        status: 'pending'
      },
      {
        id: 'med-post-swim-vitals-urine',
        protocolArea: 'daily-monitoring',
        cadence: 'post-swim',
        title: 'Post-swim vitals and urine collection completed',
        ownerId: 'crew-medical',
        instructions: 'Record post-swim vitals, collect urine, and document color or dipstick results when indicated.',
        status: 'pending'
      },
      {
        id: 'med-rhabdo-screen',
        protocolArea: 'rhabdomyolysis',
        cadence: 'post-swim',
        title: 'Rhabdomyolysis screen clear',
        ownerId: 'crew-medical',
        instructions: 'Check urine color, dipstick blood, severe muscle pain, swelling, weakness, or lethargy.',
        status: 'pending'
      },
      {
        id: 'med-hypothermia-screen',
        protocolArea: 'hypothermia',
        cadence: 'as-needed',
        title: 'Hypothermia/cold stress screen clear',
        ownerId: 'crew-medical',
        instructions: 'Watch shivering, umbles, stroke-rate drop, coordination loss, and active rewarming thresholds.',
        status: 'pending'
      },
      {
        id: 'med-skin-soft-tissue-check',
        protocolArea: 'skin-soft-tissue',
        cadence: 'daily',
        title: 'Skin, chafing, and soft tissue check completed',
        ownerId: 'crew-medical',
        instructions: 'Inspect breaks in skin, redness, tenderness, swelling, blistering, wetsuit rub, and infection risk.',
        status: 'pending'
      },
      {
        id: 'med-crew-binder',
        protocolArea: 'daily-monitoring',
        cadence: 'pre-swim',
        title: 'Crew medical binder confirmed onboard',
        ownerId: 'crew-safety',
        instructions: 'Confirm crew forms, insurance information, and medication log are stored onboard.',
        status: 'pending'
      },
      {
        id: 'med-weekly-team-review',
        protocolArea: 'daily-monitoring',
        cadence: 'weekly',
        title: 'Weekly medical team review completed',
        ownerId: 'crew-medical',
        instructions: 'Review daily medical data, vitals, symptom changes, and trend concerns with the medical team and swimmer.',
        status: 'pending'
      },
      {
        id: 'med-monthly-menses-review',
        protocolArea: 'daily-monitoring',
        cadence: 'weekly',
        title: 'Menses, energy balance, and hormonal health reviewed',
        ownerId: 'crew-medical',
        instructions: 'Monitor menses or irregularity as an energy-balance and bone-stress risk marker.',
        status: 'pending'
      },
      {
        id: 'med-midpoint-labs',
        protocolArea: 'daily-monitoring',
        cadence: 'as-needed',
        title: 'Midpoint bloodwork plan tracked',
        ownerId: 'crew-medical',
        instructions: 'Plan repeat labs and compare to pre-swim results according to the medical protocol.',
        status: 'pending'
      },
      {
        id: 'med-post-swim-follow-up',
        protocolArea: 'daily-monitoring',
        cadence: 'post-swim',
        title: 'Post-expedition medical follow-up planned',
        ownerId: 'crew-medical',
        instructions: 'Plan physical, bloodwork, urinalysis, and mental health follow-up after swim completion.',
        status: 'pending'
      },
      {
        id: 'med-prehab-recovery-routine',
        protocolArea: 'skin-soft-tissue',
        cadence: 'daily',
        title: 'Daily pre-hab and recovery routine completed',
        ownerId: 'crew-medical',
        instructions: 'Track priming, rehab, recovery, soft tissue work, electrolytes, protein, and sleep-support routines.',
        status: 'pending'
      },
      {
        id: 'med-sleep-protocol',
        protocolArea: 'mental-health',
        cadence: 'daily',
        title: 'Sleep protocol confirmed',
        ownerId: 'crew-medical',
        instructions: 'Confirm sleep mask and ear plugs; note sleep quality and recovery impact.',
        status: 'pending'
      },
      {
        id: 'med-prescription-inventory',
        protocolArea: 'daily-monitoring',
        cadence: 'daily',
        title: 'Prescription medication inventory and usage log reviewed',
        ownerId: 'crew-medical',
        instructions: 'Document medication, dosage, amount, usage, reason, and signature whenever prescription medication is used.',
        status: 'pending'
      },
      {
        id: 'med-crew-preparticipation-forms',
        protocolArea: 'daily-monitoring',
        cadence: 'pre-swim',
        title: 'Crew medical pre-participation forms complete',
        ownerId: 'crew-safety',
        instructions: 'Confirm health statement, medical information, provider physical form, emergency contacts, medications, allergies, and restrictions.',
        status: 'pending'
      }
    ],
    medicalDailyRecords: [],
    medicalSymptomLog: [],
    wildlifeSightings: [],
    wowsaPhotos: [],
    expeditionCheckpoints: [
      {
        id: 'checkpoint-template-start',
        at: iso(startedAt),
        lat: 36.61,
        lon: -121.9,
        gps: '[Start checkpoint GPS]',
        accuracyM: 10,
        label: 'Template start checkpoint',
        note: 'Replace with live coordinates captured on launch.',
        actorId: 'crew-captain'
      },
      {
        id: 'checkpoint-template-current',
        at: iso(subMinutes(now, 2)),
        lat: 36.615,
        lon: -121.91,
        gps: '[Current checkpoint GPS]',
        accuracyM: 12,
        label: 'Template current checkpoint',
        note: 'Use this table to preserve ordered evidence for certification.',
        actorId: 'crew-boat'
      }
    ]
  };
}

export function buildSeedMission(now = new Date()): Mission {
  return buildLiveSeedMission(now);
}
