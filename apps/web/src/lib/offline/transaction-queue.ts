import { openDB, type DBSchema } from 'idb';

type QueueStatus = 'pending' | 'syncing' | 'failed';

export type TransactionOrderPayload = {
  clientRequestId: string;
  outletId: string;
  visitSessionId: string;
  customerType: 'store' | 'agent' | 'end_user';
  paymentMethod: 'cash' | 'qris' | 'credit' | 'consignment';
  items: Array<{
    productId: string;
    quantity: string;
    unitPrice: string;
  }>;
};

export type TransactionQueueItem = {
  id: string;
  type: 'create-order';
  accessToken: string;
  payload: TransactionOrderPayload;
  status: QueueStatus;
  attempts: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
};

interface TransactionOfflineDb extends DBSchema {
  transactionQueue: {
    key: string;
    value: TransactionQueueItem;
    indexes: {
      'by-status': QueueStatus;
    };
  };
}

const dbPromise = openDB<TransactionOfflineDb>('yuksales-transactions-offline', 1, {
  upgrade(db) {
    const store = db.createObjectStore('transactionQueue', { keyPath: 'id' });
    store.createIndex('by-status', 'status');
  },
});

export async function enqueueTransaction(item: Omit<TransactionQueueItem, 'id' | 'status' | 'attempts' | 'createdAt' | 'updatedAt'>) {
  const now = new Date().toISOString();
  const queued: TransactionQueueItem = {
    ...item,
    id: crypto.randomUUID(),
    status: 'pending',
    attempts: 0,
    createdAt: now,
    updatedAt: now,
  };

  const db = await dbPromise;
  await db.put('transactionQueue', queued);
  return queued;
}

export async function getTransactionQueue() {
  const db = await dbPromise;
  return db.getAll('transactionQueue');
}

export async function getPendingTransactionQueue() {
  const db = await dbPromise;
  const pending = await db.getAllFromIndex('transactionQueue', 'by-status', 'pending');
  const failed = await db.getAllFromIndex('transactionQueue', 'by-status', 'failed');
  return [...pending, ...failed].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function markTransactionQueueItemSyncing(id: string) {
  const db = await dbPromise;
  const item = await db.get('transactionQueue', id);
  if (!item) return;
  await db.put('transactionQueue', { ...item, status: 'syncing', updatedAt: new Date().toISOString() });
}

export async function markTransactionQueueItemFailed(id: string, error: string) {
  const db = await dbPromise;
  const item = await db.get('transactionQueue', id);
  if (!item) return;
  await db.put('transactionQueue', {
    ...item,
    status: 'failed',
    attempts: item.attempts + 1,
    lastError: error,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteTransactionQueueItem(id: string) {
  const db = await dbPromise;
  await db.delete('transactionQueue', id);
}

export async function getTransactionQueueCount() {
  const db = await dbPromise;
  const items = await db.getAll('transactionQueue');
  return items.length;
}
