import { db } from '../../plugins/db.js';
import { notifications, userDeviceTokens } from '@yuksales/db/schema';
import { eq, and } from 'drizzle-orm';

export interface SendNotificationParams {
  userId: string;
  companyId?: string | null;
  title: string;
  body: string;
  type: string;
  referenceId?: string | null;
  data?: Record<string, any> | null;
}

/**
 * Service to send and record notifications
 */
export class NotificationService {
  /**
   * Saves a notification to the inbox and attempts to push to devices
   */
  static async sendNotification(params: SendNotificationParams): Promise<void> {
    const { userId, companyId, title, body, type, referenceId, data } = params;

    try {
      // 1. Insert into DB (Notification Inbox)
      const [notification] = await db.insert(notifications).values({
        userId,
        companyId: companyId || null,
        title,
        body,
        type,
        referenceId: referenceId || null,
        data: data || null,
      }).returning();

      // 2. Fetch User Device Tokens
      const tokens = await db.select().from(userDeviceTokens).where(eq(userDeviceTokens.userId, userId));

      // 3. Push to Provider (Expo / FCM)
      // Here we mock the push behavior. In a production app, we would:
      // a. Check company_integrations for active provider (or use a global fallback provider)
      // b. Send HTTP request to Expo Push API or FCM API
      if (tokens.length > 0) {
        console.log(`[NotificationService] Pushing '${title}' to ${tokens.length} devices for user ${userId}`);
        
        // TODO: Implementasi push ke provider eksternal (Expo/FCM)
        // Gunakan expo-server-sdk atau firebase-admin di sini
        console.log(`[NotificationService] ${tokens.length} token(s) siap untuk push (provider belum diimplementasikan)`);
      } else {
        console.log(`[NotificationService] User ${userId} has no active device tokens. Notification stored in inbox only.`);
      }

    } catch (err) {
      console.error('[NotificationService] Failed to send notification:', err);
      // We do not throw here to prevent disrupting the main business logic (e.g. approval process)
    }
  }
}
