import { eq } from 'drizzle-orm';
import { appSettings } from '@yuksales/db/schema';
import { db } from '../plugins/db.js';

const defaults = {
  default_geofence_radius_m: 100,
  max_gps_accuracy_m: 100,
};

export async function getNumericSetting(key: keyof typeof defaults) {
  const [setting] = await db.select().from(appSettings).where(eq(appSettings.key, key));
  const value = setting?.value;
  return typeof value === 'number' ? value : defaults[key];
}


