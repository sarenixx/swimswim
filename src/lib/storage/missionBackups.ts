import type { Mission } from '../../state/types';

const backupIndexKey = 'swim-california-mission-backup-index';
const backupRecordKeyPrefix = 'swim-california-mission-backup:';
const maxLocalBackups = 100;

export interface LocalMissionBackupCheckpoint {
  id: string;
  missionId: string;
  createdAt: string;
  reason: string;
  status: Mission['status'];
  startedAt: string;
  observationCount: number;
  readyObservationCount: number;
  timelineCount: number;
  manualEventCount: number;
}

interface LocalMissionBackupRecord {
  checkpoint: LocalMissionBackupCheckpoint;
  mission: Mission;
}

function makeLocalBackupId(missionId: string, createdAt: string) {
  const safeTimestamp = createdAt.replace(/[:.]/g, '-');
  const suffix =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return `${missionId}:local-backup:${safeTimestamp}:${suffix}`;
}

function compactMissionForBackup(mission: Mission): Mission {
  return {
    ...mission,
    wowsaPhotos: (mission.wowsaPhotos ?? []).map((photo) => {
      const { imageDataUrl: _imageDataUrl, ...photoWithoutDataUrl } = photo;
      return photoWithoutDataUrl;
    })
  };
}

function readBackupIndex() {
  try {
    const rawIndex = window.localStorage.getItem(backupIndexKey);
    const parsed = rawIndex ? JSON.parse(rawIndex) : [];
    return Array.isArray(parsed)
      ? (parsed as LocalMissionBackupCheckpoint[])
      : [];
  } catch {
    return [];
  }
}

export function saveLocalMissionBackup(
  mission: Mission,
  options: { missionId?: string; reason?: string } = {}
) {
  if (typeof window === 'undefined') {
    throw new Error('Local backup storage is not available.');
  }

  const missionId = options.missionId ?? mission.id;
  const createdAt = new Date().toISOString();
  const observations = mission.wowsaPhotos ?? [];
  const timeline = mission.timeline ?? [];
  const checkpoint: LocalMissionBackupCheckpoint = {
    id: makeLocalBackupId(missionId, createdAt),
    missionId,
    createdAt,
    reason: options.reason ?? 'manual-checkpoint',
    status: mission.status,
    startedAt: mission.startedAt,
    observationCount: observations.length,
    readyObservationCount: observations.filter(
      (photo) => photo.evidenceStatus === 'ready' || photo.hasPhoto
    ).length,
    timelineCount: timeline.length,
    manualEventCount: timeline.filter(
      (event) => !event.summary.startsWith('Observation #')
    ).length
  };
  const record: LocalMissionBackupRecord = {
    checkpoint,
    mission: compactMissionForBackup(mission)
  };
  const existingIndex = readBackupIndex();
  const nextIndex = [
    checkpoint,
    ...existingIndex.filter((item) => item.id !== checkpoint.id)
  ].slice(0, maxLocalBackups);

  window.localStorage.setItem(
    `${backupRecordKeyPrefix}${checkpoint.id}`,
    JSON.stringify(record)
  );
  window.localStorage.setItem(backupIndexKey, JSON.stringify(nextIndex));

  return checkpoint;
}

export function getLocalMissionBackupIndex() {
  if (typeof window === 'undefined') {
    return [];
  }

  return readBackupIndex();
}
