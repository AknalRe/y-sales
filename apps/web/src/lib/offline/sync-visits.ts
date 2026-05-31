import { checkInVisit, checkOutVisit } from '../api/client';
import { deleteVisitQueueItem, getPendingVisitQueue, markVisitQueueItemFailed, markVisitQueueItemSyncing } from './visit-queue';

export async function syncVisitQueue() {
  if (!navigator.onLine) return { synced: 0, failed: 0 };

  const items = await getPendingVisitQueue();
  let synced = 0;
  let failed = 0;

  for (const item of items) {
    try {
      await markVisitQueueItemSyncing(item.id);
      if (item.type === 'check-in') {
        await checkInVisit(item.accessToken, item.payload);
      } else if (item.type === 'check-out') {
        await checkOutVisit(item.accessToken, item.payload);
      }
      await deleteVisitQueueItem(item.id);
      synced += 1;
    } catch (error) {
      failed += 1;
      await markVisitQueueItemFailed(item.id, error instanceof Error ? error.message : 'Sync failed');
    }
  }

  return { synced, failed };
}
