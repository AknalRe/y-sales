import { openDB, type DBSchema } from 'idb';
import type { VisitPayload, VisitCheckOutPayload } from '../api/client';

type QueueStatus = 'pending' | 'syncing' | 'failed';

export type VisitCheckInQueueItem = {
  id: string;
  type: 'check-in';
  accessToken: string;
  payload: VisitPayload;
  status: QueueStatus;
  attempts: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
};

export type VisitCheckOutQueueItem = {
  id: string;
  type: 'check-out';
  accessToken: string;
  payload: VisitCheckOutPayload;
  status: QueueStatus;
  attempts: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
};

export type VisitQueueItem = VisitCheckInQueueItem | VisitCheckOutQueueItem;

interface VisitOfflineDb extends DBSchema {
  visitQueue: {
    key: string;
    value: VisitQueueItem;
    indexes: {
      'by-status': QueueStatus;
    };
  };
}

const dbPromise = openDB<VisitOfflineDb>('yuksales-visits-offline', 1, {
  upgrade(db) {
    const store = db.createObjectStore('visitQueue', { keyPath: 'id' });
    store.createIndex('by-status', 'status');
  },
});

export async function enqueueVisit(item: Omit<VisitQueueItem, 'id' | 'status' | 'attempts' | 'createdAt' | 'updatedAt'>) {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const base = {
    id,
    status: 'pending' as const,
    attempts: 0,
    createdAt: now,
    updatedAt: now,
  };

  const queued = { ...item, ...base } as VisitQueueItem;

  const db = await dbPromise;
  await db.put('visitQueue', queued);
  return queued;
}

export async function getVisitQueue() {
  const db = await dbPromise;
  return db.getAll('visitQueue');
}

export async function getPendingVisitQueue() {
  const db = await dbPromise;
  const pending = await db.getAllFromIndex('visitQueue', 'by-status', 'pending');
  const failed = await db.getAllFromIndex('visitQueue', 'by-status', 'failed');
  return [...pending, ...failed].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function markVisitQueueItemSyncing(id: string) {
  const db = await dbPromise;
  const item = await db.get('visitQueue', id);
  if (!item) return;
  await db.put('visitQueue', { ...item, status: 'syncing', updatedAt: new Date().toISOString() } as VisitQueueItem);
}

export async function markVisitQueueItemFailed(id: string, error: string) {
  const db = await dbPromise;
  const item = await db.get('visitQueue', id);
  if (!item) return;
  await db.put('visitQueue', {
    ...item,
    status: 'failed',
    attempts: item.attempts + 1,
    lastError: error,
    updatedAt: new Date().toISOString(),
  } as VisitQueueItem);
}

export async function deleteVisitQueueItem(id: string) {
  const db = await dbPromise;
  await db.delete('visitQueue', id);
}

export async function getVisitQueueCount() {
  const db = await dbPromise;
  const items = await db.getAll('visitQueue');
  return items.length;
}
