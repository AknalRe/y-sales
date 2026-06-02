export type BrowserLocation = {
  latitude: number;
  longitude: number;
  accuracyM?: number;
  timestamp?: number;
  speedMps?: number | null;
  heading?: number | null;
  altitude?: number | null;
  altitudeAccuracyM?: number | null;
  isMocked?: boolean;
};

export function getCurrentLocation(): Promise<BrowserLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation tidak tersedia di browser ini'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = position.coords as GeolocationCoordinates & {
          mocked?: boolean;
          isMocked?: boolean;
          isFromMockProvider?: boolean;
        };
        resolve({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracyM: coords.accuracy,
          timestamp: position.timestamp,
          speedMps: coords.speed,
          heading: coords.heading,
          altitude: coords.altitude,
          altitudeAccuracyM: coords.altitudeAccuracy,
          isMocked: Boolean(coords.mocked ?? coords.isMocked ?? coords.isFromMockProvider ?? false),
        });
      },
      (error) => reject(new Error(error.message)),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 10_000 },
    );
  });
}
