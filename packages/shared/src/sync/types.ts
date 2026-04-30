export type SyncQueueStatus = 'pending' | 'syncing' | 'synced' | 'failed' | 'conflict';

export type SyncQueueItem<TPayload = unknown> = {
  id: string;
  clientRequestId: string;
  entityType: string;
  operation: 'create' | 'update' | 'delete' | 'upload';
  payload: TPayload;
  status: SyncQueueStatus;
  retryCount: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
};


