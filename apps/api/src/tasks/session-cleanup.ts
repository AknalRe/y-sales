import { and, lt, isNotNull } from 'drizzle-orm';
import { sessions } from '@yuksales/db/schema';
import { db } from '../plugins/db.js';

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 jam
const REVOKED_RETENTION_MS = 7 * 24 * 60 * 60 * 1000; // 7 hari

/**
 * Menghapus:
 * 1. Session yang sudah expired (expiresAt < now)
 * 2. Session yang sudah direvoke lebih dari 7 hari lalu
 *
 * Ini mencegah tabel sessions membengkak tak terbatas seiring waktu.
 */
async function cleanupExpiredSessions() {
  const now = new Date();
  const revokedBefore = new Date(now.getTime() - REVOKED_RETENTION_MS);

  try {
    // Hapus session expired
    const expiredResult = await db
      .delete(sessions)
      .where(lt(sessions.expiresAt, now));

    // Hapus session revoked yang sudah lama
    const revokedResult = await db
      .delete(sessions)
      .where(and(isNotNull(sessions.revokedAt), lt(sessions.revokedAt, revokedBefore)));

    const expiredCount = (expiredResult as unknown as { count?: number })?.count ?? 0;
    const revokedCount = (revokedResult as unknown as { count?: number })?.count ?? 0;

    if (expiredCount > 0 || revokedCount > 0) {
      console.log(`[${new Date().toISOString()}] [session-cleanup] Cleaned up ${expiredCount} expired + ${revokedCount} old-revoked sessions.`);
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [session-cleanup] Error during cleanup:`, error);
  }
}

export function startSessionCleanupScheduler() {
  // Jalankan segera saat server start
  void cleanupExpiredSessions();

  // Jalankan tiap 1 jam
  const intervalId = setInterval(() => {
    void cleanupExpiredSessions();
  }, CLEANUP_INTERVAL_MS);

  // Pastikan interval tidak menahan proses tetap hidup
  intervalId.unref();

  console.log(`[${new Date().toISOString()}] [session-cleanup] Scheduler started (interval: ${CLEANUP_INTERVAL_MS / 1000 / 60}m).`);
  return intervalId;
}
