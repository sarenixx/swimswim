import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Mission } from '../../state/types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const configuredMissionId = import.meta.env.VITE_SYNC_MISSION_ID as string | undefined;
const isTestMode = import.meta.env.MODE === 'test';
export const evidenceBucket = (import.meta.env.VITE_SUPABASE_EVIDENCE_BUCKET as string | undefined) || 'wowsa-evidence';

export const isSupabaseConfigured = !isTestMode && Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | undefined = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      },
      realtime: {
        params: {
          eventsPerSecond: 3
        }
      }
    })
  : undefined;

export function getSyncClientId() {
  const key = 'swim-california-sync-client-id';
  const existing = window.localStorage.getItem(key);
  if (existing) {
    return existing;
  }

  const generated = `client-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`}`;
  window.localStorage.setItem(key, generated);
  return generated;
}

export function getSyncMissionId(mission: Mission) {
  return configuredMissionId || mission.id;
}

export function isRemoteSyncAvailable() {
  return Boolean(supabase);
}

function makeBackupId(missionId: string, updatedAt: string, reason: string) {
  const safeReason =
    reason
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'manual';
  const safeTimestamp = updatedAt.replace(/[:.]/g, '-');
  const suffix =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return `${missionId}:backup:${safeReason}:${safeTimestamp}:${suffix}`;
}

export async function backupMissionSnapshot(mission: Mission) {
  if (!supabase) {
    throw new Error('Supabase backup is not configured.');
  }

  const updatedAt = new Date().toISOString();
  const missionId = getSyncMissionId(mission);
  const { error } = await supabase.from('mission_snapshots').upsert({
    id: missionId,
    payload: mission,
    updated_at: updatedAt,
    updated_by: getSyncClientId()
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    missionId,
    updatedAt
  };
}

export async function saveMissionBackupSnapshot(
  mission: Mission,
  reason = 'manual-checkpoint'
) {
  if (!supabase) {
    throw new Error('Supabase backup is not configured.');
  }

  const updatedAt = new Date().toISOString();
  const missionId = getSyncMissionId(mission);
  const backupId = makeBackupId(missionId, updatedAt, reason);
  const { error } = await supabase.from('mission_snapshots').insert({
    id: backupId,
    payload: mission,
    updated_at: updatedAt,
    updated_by: getSyncClientId()
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    missionId,
    backupId,
    updatedAt
  };
}

export async function uploadEvidenceImage(path: string, file: File) {
  if (!supabase) {
    throw new Error('Supabase storage is not configured.');
  }

  const { error } = await supabase.storage.from(evidenceBucket).upload(path, file, {
    upsert: true,
    contentType: file.type || 'image/jpeg'
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function getEvidenceImageUrl(path: string) {
  if (!supabase) {
    return undefined;
  }

  const { data, error } = await supabase.storage.from(evidenceBucket).createSignedUrl(path, 60 * 60);
  if (error) {
    return undefined;
  }

  return data.signedUrl;
}

export async function removeEvidenceImage(path: string) {
  if (!supabase) {
    return;
  }

  await supabase.storage.from(evidenceBucket).remove([path]);
}
