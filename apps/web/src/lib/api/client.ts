const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
const platformCompanyViewKey = 'yuksales.platform.companyView';

export type LoginPayload = {
  identifier: string;
  password: string;
  deviceId?: string;
};

export async function apiRequest<TResponse>(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  const companyView = getPlatformCompanyView();
  if (companyView?.companyId) headers.set('X-Company-Id', companyView.companyId);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));

    // 401 on non-login routes = session expired → trigger global signout
    if (response.status === 401 && !path.includes('/auth/login')) {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }

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


export function setPlatformCompanyView(company: { id: string; name: string; slug: string }) {
  localStorage.setItem(platformCompanyViewKey, JSON.stringify({
    companyId: company.id,
    name: company.name,
    slug: company.slug,
  }));
}

export function clearPlatformCompanyView() {
  localStorage.removeItem(platformCompanyViewKey);
}

export function getPlatformCompanyView() {
  const raw = localStorage.getItem(platformCompanyViewKey);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { companyId: string; name: string; slug: string };
  } catch {
    return null;
  }
}

export function login(payload: LoginPayload) {
  return apiRequest<{
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      name: string;
      email?: string;
      phone?: string;
      roleCode: string;
      isSuperAdmin: boolean;
      company: { id: string; name: string; slug: string } | null;
    };
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

export type VisitPayload = {
  outletId: string;
  scheduleId?: string;
  clientRequestId: string;
  latitude: number;
  longitude: number;
  accuracyM?: number;
  faceCapture: {
    dataUrl: string;
    mimeType: string;
    sizeBytes: number;
    faceDetected: boolean;
    faceConfidence?: number;
    capturedAt?: string;
  };
};

export function checkInVisit(accessToken: string, payload: VisitPayload) {
  return apiRequest<{ session: unknown; geofence: unknown }>('/visits/check-in', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
}

export type VisitCheckOutPayload = {
  visitSessionId: string;
  latitude: number;
  longitude: number;
  accuracyM?: number;
  outcome: 'closed_order' | 'no_order' | 'follow_up' | 'outlet_closed' | 'rejected' | 'invalid_location';
  closingNotes?: string;
  faceCapture: VisitPayload['faceCapture'];
};

export function checkOutVisit(accessToken: string, payload: VisitCheckOutPayload) {
  return apiRequest<{ session: unknown }>('/visits/check-out', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
}

export function createMediaUpload(accessToken: string, payload: { ownerType: string; ownerId?: string; fileName?: string; mimeType: string }) {
  return apiRequest<{ uploadUrl: string; objectKey: string }>('/media/upload-url', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
}

export async function uploadToStorageUrl(uploadUrl: string, file: Blob | File) {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });
  if (!response.ok) throw new Error('Gagal upload ke storage');
}

export function finalizeMediaUpload(accessToken: string, payload: { ownerType: string; ownerId?: string; objectKey: string; mimeType: string; sizeBytes: number }) {
  return apiRequest<{ media: { id: string; fileUrl: string } }>('/media/complete', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
}


// Central API Request function is now the main export.
// Domain-specific functions should be in platform.ts or tenant.ts.


