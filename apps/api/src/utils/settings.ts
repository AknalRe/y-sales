import { eq } from 'drizzle-orm';
import { appSettings } from '@yuksales/db/schema';
import { db } from '../plugins/db.js';

export const generalSettingsDefaults = {
  defaultGeofenceRadiusM: 100,
  maxGpsAccuracyM: 100,
  requireFaceForAttendance: true,
  requireFaceForVisit: true,
  requireFaceIdentityMatchForVisit: true,
  faceMatchThreshold: 0.8,
  requireLivenessForVisit: false,
  rejectVisitOnFaceMismatch: false,
};

const legacyNumericDefaults = {
  default_geofence_radius_m: 100,
  max_gps_accuracy_m: 100,
};

export type GeneralSettings = typeof generalSettingsDefaults;

export function generalSettingsKey(companyId: string) {
  return `general_settings:${companyId}`;
}

export async function getGeneralSettings(companyId: string): Promise<GeneralSettings> {
  const [setting] = await db.select().from(appSettings).where(eq(appSettings.key, generalSettingsKey(companyId)));
  const value = setting?.value && typeof setting.value === 'object' && !Array.isArray(setting.value) ? setting.value as Partial<GeneralSettings> : {};
  return { ...generalSettingsDefaults, ...value };
}

export async function getNumericSetting(key: keyof typeof legacyNumericDefaults, companyId?: string) {
  if (companyId) {
    const settings = await getGeneralSettings(companyId);
    if (key === 'default_geofence_radius_m') return settings.defaultGeofenceRadiusM;
    if (key === 'max_gps_accuracy_m') return settings.maxGpsAccuracyM;
  }
  const [setting] = await db.select().from(appSettings).where(eq(appSettings.key, key));
  const value = setting?.value;
  return typeof value === 'number' ? value : legacyNumericDefaults[key];
}
