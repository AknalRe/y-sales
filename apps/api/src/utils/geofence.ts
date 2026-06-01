import { calculateDistanceMeters } from '@yuksales/shared';

export type GeoPoint = {
  latitude: number;
  longitude: number;
};

export function validateGeofence(input: {
  current: GeoPoint;
  target?: GeoPoint | null;
  radiusMeters: number;
  accuracyMeters?: number | null;
  maxAccuracyMeters: number;
}) {
  const accuracyValid = input.accuracyMeters == null || input.accuracyMeters <= input.maxAccuracyMeters;
  const radiusMeters = input.radiusMeters;

  if (!input.target) {
    return {
      valid: accuracyValid,
      accuracyValid,
      accuracyMeters: input.accuracyMeters ?? null,
      maxAccuracyMeters: input.maxAccuracyMeters,
      radiusMeters,
      targetRequired: false,
      distanceMeters: null,
      reason: accuracyValid ? 'no_target_location' : 'poor_gps_accuracy',
    };
  }

  const distanceMeters = calculateDistanceMeters(input.current, input.target);
  const withinRadius = distanceMeters <= radiusMeters;

  return {
    valid: accuracyValid && withinRadius,
    accuracyValid,
    accuracyMeters: input.accuracyMeters ?? null,
    maxAccuracyMeters: input.maxAccuracyMeters,
    radiusMeters,
    targetRequired: true,
    distanceMeters,
    reason: !accuracyValid ? 'poor_gps_accuracy' : withinRadius ? 'within_radius' : 'outside_radius',
  };
}

