const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

export type LoginPayload = {
  identifier: string;
  password: string;
  deviceId?: string;
};

export async function apiRequest<TResponse>(path: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    const isDebug = String(import.meta.env.VITE_APP_DEBUG ?? '').toLowerCase() === 'true';
    const message = isDebug
      ? (error.message ?? 'Request failed')
      : response.status === 401
        ? 'Email/HP/kode karyawan atau password salah.'
        : (error.message && !String(error.message).toLowerCase().includes('failed query'))
          ? error.message
          : 'Terjadi kesalahan. Silakan coba lagi.';
    throw new Error(message);
  }

  return response.json() as Promise<TResponse>;
}

export function login(payload: LoginPayload) {
  return apiRequest<{
    accessToken: string;
    refreshToken: string;
    user: { id: string; name: string; email?: string; phone?: string; roleCode: string };
  }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getMe(accessToken: string) {
  return apiRequest<{
    user: { id: string; name: string; email?: string; phone?: string; employeeCode?: string; roleCode: string };
    permissions: string[];
  }>('/auth/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export type AttendancePayload = {
  clientRequestId: string;
  outletId?: string;
  attendanceSessionId?: string;
  capturedAt: string;
  location: {
    latitude: number;
    longitude: number;
    accuracyM?: number;
  };
  faceCapture: {
    dataUrl: string;
    mimeType: string;
    sizeBytes: number;
    faceDetected: boolean;
    faceConfidence?: number;
  };
};

export function getTodayAttendance(accessToken: string) {
  return apiRequest<{ session: unknown | null }>('/attendance/today', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function checkInAttendance(accessToken: string, payload: AttendancePayload) {
  return apiRequest<{ session: unknown; geofence: unknown }>('/attendance/check-in', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
}

export function checkOutAttendance(accessToken: string, payload: AttendancePayload & { attendanceSessionId: string }) {
  return apiRequest<{ session: unknown }>('/attendance/check-out', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
}

export type AttendanceReviewItem = {
  id: string;
  workDate: string;
  status: string;
  validationStatus: string;
  checkInAt?: string;
  checkInLatitude?: string;
  checkInLongitude?: string;
  checkInAccuracyM?: string;
  checkInDistanceM?: string;
  checkOutAt?: string;
  salesName: string;
  salesEmail?: string;
  faceDetected?: boolean;
  faceConfidence?: string;
  faceImageUrl?: string;
};

export function getAttendanceReview(accessToken: string) {
  return apiRequest<{ attendance: AttendanceReviewItem[] }>('/attendance/review', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}


