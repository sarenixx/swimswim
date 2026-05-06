export interface OfflineQueueEntry {
  id: string;
  action: string;
  createdAt: string;
  payload: unknown;
}

export function createOfflineQueueEntry(action: string, payload: unknown, createdAt: string): OfflineQueueEntry {
  return {
    id: `queue-${createdAt}-${Math.random().toString(36).slice(2, 8)}`,
    action,
    createdAt,
    payload
  };
}
