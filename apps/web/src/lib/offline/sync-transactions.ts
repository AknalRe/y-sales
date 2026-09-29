import { createOrder } from '../api/tenant';
import { deleteTransactionQueueItem, getPendingTransactionQueue, markTransactionQueueItemFailed, markTransactionQueueItemSyncing } from './transaction-queue';

export async function syncTransactionQueue(activeToken?: string) {
  if (!navigator.onLine) return { synced: 0, failed: 0 };

  const items = await getPendingTransactionQueue();
  let synced = 0;
  let failed = 0;

  for (const item of items) {
    try {
      await markTransactionQueueItemSyncing(item.id);
      const token = activeToken || item.accessToken;
      if (item.type === 'create-order') {
        await createOrder(token, item.payload);
      }
      await deleteTransactionQueueItem(item.id);
      synced += 1;
    } catch (error) {
      failed += 1;
      await markTransactionQueueItemFailed(item.id, error instanceof Error ? error.message : 'Sync failed');
    }
  }

  return { synced, failed };
}
