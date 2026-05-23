import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Mission } from '../../state/types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const configuredMissionId = import.meta.env.VITE_SYNC_MISSION_ID as string | undefined;
export const evidenceBucket = (import.meta.env.VITE_SUPABASE_EVIDENCE_BUCKET as string | undefined) || 'wowsa-evidence';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

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
