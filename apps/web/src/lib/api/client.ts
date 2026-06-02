export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'https://localhost:4000').replace(/\/+$/, '');
const platformCompanyViewKey = 'yuksales.platform.companyView';
const refreshTokenKey = 'yuksales.refreshToken';

export type LoginPayload = {
  identifier: string;
  password: string;
  deviceId?: string;
  companySlug?: string;
};

export async function apiRequest<TResponse>(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  if (options.body != null && !headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  const companyView = getPlatformCompanyView();
  if (companyView?.companyId) headers.set('X-Company-Id', companyView.companyId);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));

    // 401 on non-login, non-refresh routes = session expired → trigger global signout
    if (response.status === 401 && !path.includes('/auth/login') && !path.includes('/auth/refresh')) {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }

    const isDebug = String(import.meta.env.VITE_APP_DEBUG ?? '').toLowerCase() === 'true';
    const rawMessage = String(error.message ?? '');

    // Filter technical/DB error patterns that shouldn't be shown to users
    const isTechnical = /failed query|syntax error|relation .* does not exist|column .* does not exist|duplicate key|foreign key|ZodError|ValidationError|ECONNREFUSED|ETIMEDOUT/i.test(rawMessage);

    const message = isDebug
      ? rawMessage
      : response.status === 401
        ? (rawMessage || 'Email/HP/kode karyawan atau password salah.')
        : isTechnical
          ? 'Terjadi kesalahan. Silakan coba lagi.'
          : rawMessage || 'Terjadi kesalahan. Silakan coba lagi.';
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

export function getCompanyBySlug(slug: string) {
  return apiRequest<{ company: { name: string; slug: string; logoUrl?: string | null } }>(`/auth/company/${slug}`);
}

export function storeRefreshToken(token: string) {
  localStorage.setItem(refreshTokenKey, token);
}

export function getStoredRefreshToken() {
  return localStorage.getItem(refreshTokenKey);
}

export function clearStoredRefreshToken() {
  localStorage.removeItem(refreshTokenKey);
}

export function refreshSession() {
  const storedToken = getStoredRefreshToken();
  return apiRequest<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify(storedToken ? { refreshToken: storedToken } : {}),
  });
}

export function logout() {
  clearStoredRefreshToken();
  return apiRequest<{ success: true }>('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export function getMe(accessToken: string) {
  return apiRequest<{
    user: {
      id: string;
      name: string;
      email?: string;
      phone?: string;
      employeeCode?: string;
      roleCode: string;
      isSuperAdmin: boolean;
      company: { id: string; name: string; slug: string } | null;
    };
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
    timestamp?: number;
    speedMps?: number | null;
    heading?: number | null;
    altitude?: number | null;
    altitudeAccuracyM?: number | null;
    isMocked?: boolean;
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
  return apiRequest<{ session: { id: string; status: string; workDate: string } | null }>('/attendance/today', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function checkInAttendance(accessToken: string, payload: AttendancePayload) {
  return apiRequest<{ session: { id: string; status: string }; geofence: { valid: boolean; distanceM: number | null } }>('/attendance/check-in', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
}

export function checkOutAttendance(accessToken: string, payload: AttendancePayload & { attendanceSessionId: string }) {
  return apiRequest<{ session: { id: string; status: string } }>('/attendance/check-out', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
  });
}

export type MobileRuntimeSettings = {
  enableLiveFaceDetectionInCamera: boolean;
  requireFaceForAttendance: boolean;
  requireFaceIdentityMatchForAttendance: boolean;
  requireFaceForVisit: boolean;
  requireFaceIdentityMatchForVisit: boolean;
  faceMatchThreshold: number;
  faceProvider: 'mock' | 'internal_python' | 'custom_http' | 'aws_rekognition' | 'azure_face' | 'google_vertex';
};

export function getMobileRuntimeSettings(accessToken: string) {
  return apiRequest<{ settings: MobileRuntimeSettings }>('/settings/mobile-runtime', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export type AttendanceReviewItem = {
  id: string;
  userId: string;
  workDate: string;
  status: string;
  validationStatus: string;
  checkInAt?: string;
  checkInLatitude?: string;
  checkInLongitude?: string;
  checkInAccuracyM?: string;
  checkInDistanceM?: string;
  checkOutAt?: string;
  checkOutLatitude?: string;
  checkOutLongitude?: string;
  checkOutAccuracyM?: string;
  salesName: string;
  salesEmail?: string;
  salesPhone?: string;
  employeeCode?: string;
  faceDetected?: boolean;
  faceConfidence?: string;
  faceImageUrl?: string;
  workMinutes?: number;
};

export type AttendanceReviewParams = {
  from?: string;
  to?: string;
  status?: string;
  validationStatus?: string;
  q?: string;
};

function buildAttendanceQuery(params?: AttendanceReviewParams) {
  const q = new URLSearchParams();
  if (params?.from) q.set('from', params.from);
  if (params?.to) q.set('to', params.to);
  if (params?.status) q.set('status', params.status);
  if (params?.validationStatus) q.set('validationStatus', params.validationStatus);
  if (params?.q) q.set('q', params.q);
  const query = q.toString();
  return query ? `?${query}` : '';
}

export function getAttendanceReview(accessToken: string, params?: AttendanceReviewParams) {
  return apiRequest<{ attendance: AttendanceReviewItem[] }>(`/attendance/review${buildAttendanceQuery(params)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function updateAttendanceReview(accessToken: string, id: string, action: 'approve' | 'reject' | 'flag_manual_review' | 'reset') {
  return apiRequest<{ session: AttendanceReviewItem }>(`/attendance/review/${id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ action }),
  });
}

export type AttendanceReportRow = {
  userId: string;
  salesName: string;
  salesEmail?: string | null;
  employeeCode?: string | null;
  totalSessions: number;
  validSessions: number;
  issueSessions: number;
  openSessions: number;
  closedSessions: number;
  flaggedSessions: number;
  totalWorkMinutes: number;
  firstCheckInAt?: string | null;
  lastCheckOutAt?: string | null;
};

export type AttendanceReportSummary = {
  totalSessions: number;
  validSessions: number;
  issueSessions: number;
  openSessions: number;
  closedSessions: number;
  flaggedSessions: number;
  totalWorkMinutes: number;
};

export function getAttendanceReport(accessToken: string, params?: AttendanceReviewParams) {
  return apiRequest<{ summary: AttendanceReportSummary; rows: AttendanceReportRow[] }>(`/attendance/report${buildAttendanceQuery(params)}`, {
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
  locationTimestamp?: number;
  speedMps?: number | null;
  heading?: number | null;
  altitude?: number | null;
  altitudeAccuracyM?: number | null;
  isMockedLocation?: boolean;
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
  return apiRequest<{ visit: { id: string; outletId: string; status: string }; geofence: { valid: boolean; distanceM: number | null } }>('/visits/check-in', {
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
  locationTimestamp?: number;
  speedMps?: number | null;
  heading?: number | null;
  altitude?: number | null;
  altitudeAccuracyM?: number | null;
  isMockedLocation?: boolean;
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
