import { checkInAttendance } from '../api/client';
import { deleteQueueItem, getPendingAttendanceQueue, markQueueItemFailed, markQueueItemSyncing } from './attendance-queue';

export async function syncAttendanceQueue() {
  if (!navigator.onLine) return { synced: 0, failed: 0 };

  const items = await getPendingAttendanceQueue();
  let synced = 0;
  let failed = 0;

  for (const item of items) {
    try {
      await markQueueItemSyncing(item.id);
      if (item.type === 'check-in') {
        await checkInAttendance(item.accessToken, item.payload);
      }
      await deleteQueueItem(item.id);
      synced += 1;
    } catch (error) {
      failed += 1;
      await markQueueItemFailed(item.id, error instanceof Error ? error.message : 'Sync failed');
    }
  }

  return { synced, failed };
}


