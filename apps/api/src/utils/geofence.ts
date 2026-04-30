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

  if (!input.target) {
    return {
      valid: accuracyValid,
      accuracyValid,
      distanceMeters: null,
      reason: accuracyValid ? 'no_target_location' : 'poor_gps_accuracy',
    };
  }

  const distanceMeters = calculateDistanceMeters(input.current, input.target);
  const withinRadius = distanceMeters <= input.radiusMeters;

  return {
    valid: accuracyValid && withinRadius,
    accuracyValid,
    distanceMeters,
    reason: !accuracyValid ? 'poor_gps_accuracy' : withinRadius ? 'within_radius' : 'outside_radius',
  };
}


