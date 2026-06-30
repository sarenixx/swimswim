import { createContext, useContext } from 'react';
import type { MissionSyncStatus } from './useMissionSync';

const fallbackSyncStatus: MissionSyncStatus = {
  enabled: false,
  state: 'local-only',
  label: 'Local only',
  detail: 'Remote sync is not configured.'
};

const MissionSyncStatusContext = createContext<MissionSyncStatus>(fallbackSyncStatus);

export const MissionSyncStatusProvider = MissionSyncStatusContext.Provider;

export function useMissionSyncStatus() {
  return useContext(MissionSyncStatusContext);
}
