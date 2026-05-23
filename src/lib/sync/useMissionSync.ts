import { useEffect, useMemo, useRef, useState } from 'react';
import type { Mission } from '../../state/types';
import { useMissionStore } from '../../state/useMissionStore';
import { getSyncClientId, getSyncMissionId, isRemoteSyncAvailable, supabase } from './supabaseClient';

type SyncState = 'local-only' | 'loading' | 'synced' | 'syncing' | 'offline' | 'error';

interface MissionSnapshotRow {
  id: string;
  payload: Mission;
  updated_at: string;
  updated_by: string;
}

export interface MissionSyncStatus {
  enabled: boolean;
  state: SyncState;
  label: string;
  detail: string;
}

function buildLabel(state: SyncState) {
  if (state === 'loading') {
    return 'SQL loading';
  }

  if (state === 'syncing') {
    return 'SQL syncing';
  }

  if (state === 'synced') {
    return 'SQL synced';
  }

  if (state === 'offline') {
    return 'SQL offline';
  }

  if (state === 'error') {
    return 'SQL error';
  }

  return 'Local only';
}

export function useMissionSync(enabled: boolean): MissionSyncStatus {
  const mission = useMissionStore((state) => state.mission);
  const replaceMissionFromSync = useMissionStore((state) => state.replaceMissionFromSync);
  const [state, setState] = useState<SyncState>('local-only');
  const [detail, setDetail] = useState('Remote sync is not configured.');
  const clientId = useMemo(() => (typeof window === 'undefined' ? 'server' : getSyncClientId()), []);
  const syncMissionId = useMemo(() => getSyncMissionId(mission), [mission]);
  const hydratedRef = useRef(false);
  const applyingRemoteRef = useRef(false);
  const lastPayloadRef = useRef('');
  const enabledSync = enabled && mission.mode === 'live' && isRemoteSyncAvailable();

  useEffect(() => {
    if (!enabledSync || !supabase) {
      hydratedRef.current = false;
      setState('local-only');
      setDetail('Remote sync is not configured.');
      return undefined;
    }

    const client = supabase;
    let cancelled = false;
    hydratedRef.current = false;
    setState('loading');
    setDetail('Checking latest SQL snapshot.');

    async function loadSnapshot() {
      const { data, error } = await client
        .from('mission_snapshots')
        .select('id,payload,updated_at,updated_by')
        .eq('id', syncMissionId)
        .maybeSingle<MissionSnapshotRow>();

      if (cancelled) {
        return;
      }

      if (error) {
        setState('error');
        setDetail(error.message);
        return;
      }

      if (data?.payload) {
        applyingRemoteRef.current = true;
        replaceMissionFromSync(data.payload);
        lastPayloadRef.current = JSON.stringify(data.payload);
        window.setTimeout(() => {
          applyingRemoteRef.current = false;
        }, 0);
        setState('synced');
        setDetail(`Loaded SQL snapshot from ${new Date(data.updated_at).toLocaleTimeString()}.`);
      } else {
        const updatedAt = new Date().toISOString();
        const localPayload = JSON.stringify(mission);
        const { error: upsertError } = await client.from('mission_snapshots').upsert({
          id: syncMissionId,
          payload: mission,
          updated_at: updatedAt,
          updated_by: clientId
        });

        if (upsertError) {
          setState('error');
          setDetail(upsertError.message);
          return;
        }

        lastPayloadRef.current = localPayload;
        setState('synced');
        setDetail(`Created first SQL snapshot at ${new Date(updatedAt).toLocaleTimeString()}.`);
      }

      hydratedRef.current = true;
    }

    loadSnapshot();

    const channel = client
      .channel(`mission-snapshot-${syncMissionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mission_snapshots',
          filter: `id=eq.${syncMissionId}`
        },
        (payload) => {
          const next = payload.new as MissionSnapshotRow | undefined;
          if (!next?.payload || next.updated_by === clientId) {
            return;
          }

          applyingRemoteRef.current = true;
          replaceMissionFromSync(next.payload);
          lastPayloadRef.current = JSON.stringify(next.payload);
          window.setTimeout(() => {
            applyingRemoteRef.current = false;
          }, 0);
          setState('synced');
          setDetail(`Received update from another phone at ${new Date(next.updated_at).toLocaleTimeString()}.`);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      client.removeChannel(channel);
    };
  }, [clientId, enabledSync, replaceMissionFromSync, syncMissionId]);

  useEffect(() => {
    if (!enabledSync || !supabase || !hydratedRef.current || applyingRemoteRef.current) {
      return undefined;
    }

    const client = supabase;
    const payload = JSON.stringify(mission);
    if (payload === lastPayloadRef.current) {
      return undefined;
    }

    setState(navigator.onLine ? 'syncing' : 'offline');
    setDetail(navigator.onLine ? 'Saving SQL snapshot.' : 'Offline. Local changes will retry when this phone reconnects.');

    const timeout = window.setTimeout(async () => {
      const updatedAt = new Date().toISOString();
      const { error } = await client.from('mission_snapshots').upsert({
        id: syncMissionId,
        payload: mission,
        updated_at: updatedAt,
        updated_by: clientId
      });

      if (error) {
        setState('error');
        setDetail(error.message);
        return;
      }

      lastPayloadRef.current = payload;
      setState('synced');
      setDetail(`Saved SQL snapshot at ${new Date(updatedAt).toLocaleTimeString()}.`);
    }, 650);

    return () => window.clearTimeout(timeout);
  }, [clientId, enabledSync, mission, syncMissionId]);

  return {
    enabled: enabledSync,
    state,
    label: buildLabel(state),
    detail
  };
}
