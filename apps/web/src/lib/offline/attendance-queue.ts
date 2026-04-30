import { openDB, type DBSchema } from 'idb';
import type { AttendancePayload } from '../api/client';

type QueueStatus = 'pending' | 'syncing' | 'failed';

export type AttendanceQueueItem = {
  id: string;
  type: 'check-in' | 'check-out';
  accessToken: string;
  payload: AttendancePayload;
  status: QueueStatus;
  attempts: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
};

interface YukSalesOfflineDb extends DBSchema {
  attendanceQueue: {
    key: string;
    value: AttendanceQueueItem;
    indexes: {
      'by-status': QueueStatus;
    };
  };
}

const dbPromise = openDB<YukSalesOfflineDb>('yuksales-offline', 1, {
  upgrade(db) {
    const store = db.createObjectStore('attendanceQueue', { keyPath: 'id' });
    store.createIndex('by-status', 'status');
  },
});

export async function enqueueAttendance(item: Omit<AttendanceQueueItem, 'id' | 'status' | 'attempts' | 'createdAt' | 'updatedAt'>) {
  const now = new Date().toISOString();
  const queued: AttendanceQueueItem = {
    ...item,
    id: crypto.randomUUID(),
    status: 'pending',
    attempts: 0,
    createdAt: now,
    updatedAt: now,
  };

  const db = await dbPromise;
  await db.put('attendanceQueue', queued);
  return queued;
}

export async function getAttendanceQueue() {
  const db = await dbPromise;
  return db.getAll('attendanceQueue');
}

export async function getPendingAttendanceQueue() {
  const db = await dbPromise;
  const pending = await db.getAllFromIndex('attendanceQueue', 'by-status', 'pending');
  const failed = await db.getAllFromIndex('attendanceQueue', 'by-status', 'failed');
  return [...pending, ...failed].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function markQueueItemSyncing(id: string) {
  const db = await dbPromise;
  const item = await db.get('attendanceQueue', id);
  if (!item) return;
  await db.put('attendanceQueue', { ...item, status: 'syncing', updatedAt: new Date().toISOString() });
}

export async function markQueueItemFailed(id: string, error: string) {
  const db = await dbPromise;
  const item = await db.get('attendanceQueue', id);
  if (!item) return;
  await db.put('attendanceQueue', {
    ...item,
    status: 'failed',
    attempts: item.attempts + 1,
    lastError: error,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteQueueItem(id: string) {
  const db = await dbPromise;
  await db.delete('attendanceQueue', id);
}


