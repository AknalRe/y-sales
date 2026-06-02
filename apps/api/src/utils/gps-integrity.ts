import { calculateDistanceMeters } from '@yuksales/shared';

export type GpsIntegrityLocation = {
  latitude: number;
  longitude: number;
  accuracyM?: number | null;
  timestamp?: number | null;
  speedMps?: number | null;
  heading?: number | null;
  altitude?: number | null;
  altitudeAccuracyM?: number | null;
  isMocked?: boolean | null;
};

export type GpsIntegrityPreviousPoint = {
  latitude?: string | number | null;
  longitude?: string | number | null;
  capturedAt?: Date | string | null;
};

const maxLocationAgeMs = 60_000;
const maxLocationFutureMs = 10_000;
const maxHumanTravelSpeedMps = 60;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function pointFromPrevious(previous?: GpsIntegrityPreviousPoint | null) {
  if (!previous?.latitude || !previous?.longitude || !previous.capturedAt) return null;
  const latitude = Number(previous.latitude);
  const longitude = Number(previous.longitude);
  const capturedAt = new Date(previous.capturedAt).getTime();
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !Number.isFinite(capturedAt)) return null;
  return { latitude, longitude, capturedAt };
}

export function validateGpsIntegrity(input: {
  location: GpsIntegrityLocation;
  capturedAt?: Date | string | null;
  previousPoint?: GpsIntegrityPreviousPoint | null;
}) {
  const { location } = input;
  const capturedAtMs = input.capturedAt ? new Date(input.capturedAt).getTime() : Date.now();

  if (location.isMocked === true) {
    return { valid: false, reason: 'mock_location_detected', message: 'Fake GPS terdeteksi. Gunakan lokasi asli perangkat.' };
  }

  if (
    !isFiniteNumber(location.latitude) ||
    !isFiniteNumber(location.longitude) ||
    location.latitude < -90 ||
    location.latitude > 90 ||
    location.longitude < -180 ||
    location.longitude > 180
  ) {
    return { valid: false, reason: 'invalid_coordinates', message: 'Koordinat GPS tidak valid.' };
  }

  if (location.accuracyM != null && (!isFiniteNumber(location.accuracyM) || location.accuracyM <= 0)) {
    return { valid: false, reason: 'invalid_accuracy', message: 'Akurasi GPS tidak valid. Ambil ulang lokasi.' };
  }

  if (location.timestamp != null) {
    if (!isFiniteNumber(location.timestamp)) {
      return { valid: false, reason: 'invalid_location_timestamp', message: 'Timestamp GPS tidak valid. Ambil ulang lokasi.' };
    }
    const ageMs = capturedAtMs - location.timestamp;
    if (ageMs > maxLocationAgeMs) {
      return { valid: false, reason: 'stale_location_timestamp', message: 'Lokasi GPS terlalu lama. Ambil ulang lokasi sebelum submit.' };
    }
    if (ageMs < -maxLocationFutureMs) {
      return { valid: false, reason: 'future_location_timestamp', message: 'Timestamp GPS tidak valid. Periksa waktu perangkat.' };
    }
  }

  if (location.speedMps != null && (!isFiniteNumber(location.speedMps) || location.speedMps < 0 || location.speedMps > maxHumanTravelSpeedMps)) {
    return { valid: false, reason: 'impossible_reported_speed', message: 'Pergerakan GPS tidak wajar. Ambil ulang lokasi.' };
  }

  const previous = pointFromPrevious(input.previousPoint);
  if (previous && Number.isFinite(capturedAtMs)) {
    const seconds = Math.max(1, (capturedAtMs - previous.capturedAt) / 1000);
    const distanceMeters = calculateDistanceMeters(
      { latitude: previous.latitude, longitude: previous.longitude },
      { latitude: location.latitude, longitude: location.longitude },
    );
    const speedMps = distanceMeters / seconds;
    if (speedMps > maxHumanTravelSpeedMps) {
      return {
        valid: false,
        reason: 'impossible_location_jump',
        message: 'Perpindahan lokasi tidak wajar. Fake GPS terindikasi, silakan ambil ulang lokasi asli perangkat.',
        distanceMeters,
        speedMps,
      };
    }
  }

  return { valid: true, reason: 'gps_integrity_ok' };
}
