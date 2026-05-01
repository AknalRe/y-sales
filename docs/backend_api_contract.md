# YukSales Backend API Contract

Base URL lokal:

```txt
http://localhost:4000
```

Semua endpoint protected memakai header:

```http
Authorization: Bearer <accessToken>
X-Company-Id: <companyId>   # bila user/role mendukung konteks tenant eksplisit
Content-Type: application/json
```

> [!IMPORTANT]
> Dokumentasi ini mengikuti kontrak backend yang tersedia saat ini. Endpoint `GET /outlets` dan `GET /transactions` masih placeholder/planned.

---

## Common Types

### Face Capture Payload

```json
{
  "dataUrl": "data:image/jpeg;base64,...",
  "mimeType": "image/jpeg",
  "sizeBytes": 123456,
  "faceDetected": true,
  "faceConfidence": 0.97,
  "capturedAt": "2026-05-01T05:00:00.000Z"
}
```

### Geo Location Payload

```json
{
  "latitude": -7.250445,
  "longitude": 112.768845,
  "accuracyM": 8
}
```

---

# 1. Authentication

## POST `/auth/login`

Login user.

Permission: public.

Body:

```json
{
  "identifier": "admin@yuksales.local",
  "password": "ChangeMe123!",
  "deviceId": "device-001"
}
```

Response:

```json
{
  "accessToken": "jwt",
  "refreshToken": "jwt-or-token",
  "user": {
    "id": "uuid",
    "companyId": "uuid",
    "roleId": "uuid",
    "name": "Admin"
  }
}
```

## POST `/auth/refresh`

Refresh access token.

Body:

```json
{
  "refreshToken": "refresh-token"
}
```

## POST `/auth/logout`

Logout session.

Body:

```json
{
  "refreshToken": "refresh-token"
}
```

## GET `/auth/me`

Ambil profil user login.

---

# 2. General Settings & Integration

## GET `/settings/general`

Ambil konfigurasi umum company.

Permission: `settings.manage`.

Response API key dimasking.

Response contoh:

```json
{
  "settings": {
    "defaultGeofenceRadiusM": 100,
    "maxGpsAccuracyM": 100,
    "requireFaceForAttendance": true,
    "requireFaceForVisit": true,
    "requireFaceIdentityMatchForVisit": true,
    "faceMatchThreshold": 0.85,
    "requireLivenessForVisit": false,
    "rejectVisitOnFaceMismatch": false,
    "faceIntegration": {
      "enabled": true,
      "provider": "custom_http",
      "baseUrl": "https://face-service.example.com/verify",
      "apiKey": "abcd...wxyz",
      "projectId": "",
      "region": "",
      "model": "default",
      "mode": "detect_and_verify",
      "timeoutMs": 5000
    }
  },
  "scope": { "companyId": "uuid" }
}
```

## PUT `/settings/general`

Update konfigurasi umum company.

Permission: `settings.manage`.

Body:

```json
{
  "defaultGeofenceRadiusM": 100,
  "maxGpsAccuracyM": 100,
  "requireFaceForAttendance": true,
  "requireFaceForVisit": true,
  "requireFaceIdentityMatchForVisit": true,
  "faceMatchThreshold": 0.85,
  "requireLivenessForVisit": true,
  "rejectVisitOnFaceMismatch": false,
  "faceIntegration": {
    "enabled": true,
    "provider": "custom_http",
    "baseUrl": "https://face-service.example.com/verify",
    "apiKey": "secret-api-key",
    "projectId": "",
    "region": "asia-southeast2",
    "model": "face-v1",
    "mode": "detect_and_verify",
    "timeoutMs": 5000
  }
}
```

Provider supported:

```txt
mock
custom_http
aws_rekognition
azure_face
google_vertex
```

### Face Integration Behavior

```txt
foto/check-in
→ cek faceDetected
→ jika requireFaceIdentityMatchForVisit = true
  → baca general_settings:<companyId>
  → pilih provider faceIntegration.provider
  → panggil adapter provider jika enabled
  → update face_captures.identityMatchStatus
→ jika face recognition tidak aktif
  → cukup pakai faceDetected dan faceConfidence policy/mock
```

---

# 3. Face Template Enrollment

## GET `/settings/face-templates`

Ambil daftar template wajah company.

Permission: `settings.manage`.

## POST `/settings/face-templates`

Enroll template wajah user.

Permission: `settings.manage`.

Body:

```json
{
  "userId": "uuid-user",
  "dataUrl": "data:image/jpeg;base64,...",
  "mimeType": "image/jpeg",
  "sizeBytes": 123456,
  "embeddingRef": "optional-face-engine-template-ref"
}
```

Behavior:

```txt
validasi user company sama
simpan media face_template
nonaktifkan template aktif lama milik user
buat template baru active dengan companyId/userId/roleId
buat audit log
```

---

# 4. Attendance

## GET `/attendance/today`

Ambil attendance session hari ini.

Permission: `attendance.execute`.

## POST `/attendance/check-in`

Absensi kerja harian.

Permission: `attendance.execute`.

Body:

```json
{
  "clientRequestId": "uuid",
  "outletId": "uuid-optional",
  "capturedAt": "2026-05-01T05:00:00.000Z",
  "location": {
    "latitude": -7.250445,
    "longitude": 112.768845,
    "accuracyM": 8
  },
  "faceCapture": {
    "dataUrl": "data:image/jpeg;base64,...",
    "mimeType": "image/jpeg",
    "sizeBytes": 123456,
    "faceDetected": true,
    "faceConfidence": 0.95
  }
}
```

## POST `/attendance/check-out`

Checkout attendance harian.

Permission: `attendance.execute`.

Body:

```json
{
  "attendanceSessionId": "uuid",
  "clientRequestId": "uuid",
  "outletId": "uuid-optional",
  "capturedAt": "2026-05-01T10:00:00.000Z",
  "location": {
    "latitude": -7.250445,
    "longitude": 112.768845,
    "accuracyM": 8
  },
  "faceCapture": {
    "dataUrl": "data:image/jpeg;base64,...",
    "mimeType": "image/jpeg",
    "sizeBytes": 123456,
    "faceDetected": true,
    "faceConfidence": 0.95
  }
}
```

## GET `/attendance/review`

Review attendance.

Permission: `attendance.review`.

---

# 5. Visit Scheduling & Outlet Visit

## GET `/visits/schedules`

Ambil jadwal kunjungan.

Permission: `visits.review`.

Query params:

```txt
date=YYYY-MM-DD
salesUserId=uuid
```

## POST `/visits/schedules`

Buat jadwal kunjungan sales.

Permission: `visits.review`.

Body:

```json
{
  "salesUserId": "uuid-sales",
  "outletIds": ["uuid-outlet-1", "uuid-outlet-2"],
  "scheduledDate": "2026-05-01",
  "plannedStartTime": "09:00",
  "plannedEndTime": "17:00",
  "targetOutletCount": 2,
  "targetDurationMinutes": 30,
  "targetClosingCount": 1,
  "targetRevenueAmount": "1000000",
  "priority": 3,
  "notes": "Kunjungan area Surabaya"
}
```

Response berisi `schedules` dan `simulation` target.

## PATCH `/visits/schedules/:id`

Update jadwal.

Permission: `visits.review`.

Body: partial dari body create schedule.

## POST `/visits/schedules/:id/approve`

Approve jadwal.

Permission: `visits.review`.

## POST `/visits/schedules/:id/cancel`

Cancel jadwal.

Permission: `visits.review`.

## GET `/visits/today`

Ambil jadwal sales hari ini.

Permission: `visits.execute`.

## POST `/visits/check-in`

Check-in outlet. Durasi kunjungan mulai dihitung dari endpoint ini.

Permission: `visits.execute`.

Body:

```json
{
  "outletId": "uuid-outlet",
  "scheduleId": "uuid-schedule-optional",
  "clientRequestId": "uuid",
  "latitude": -7.250445,
  "longitude": 112.768845,
  "accuracyM": 8,
  "faceCapture": {
    "dataUrl": "data:image/jpeg;base64,...",
    "mimeType": "image/jpeg",
    "sizeBytes": 123456,
    "faceDetected": true,
    "faceConfidence": 0.97,
    "capturedAt": "2026-05-01T05:00:00.000Z"
  }
}
```

Validasi:

```txt
outlet company sama
schedule milik sales jika scheduleId dikirim
GPS dihitung terhadap outlet geofence radius
faceDetected wajib jika requireFaceForVisit = true
face identity match jika requireFaceIdentityMatchForVisit = true
```

Response:

```json
{
  "visit": {},
  "geofence": {
    "valid": true,
    "distanceM": 12.34,
    "radiusM": 100
  },
  "face": {
    "faceCaptureId": "uuid",
    "faceDetected": true,
    "faceConfidence": 0.97,
    "identity": {
      "status": "matched",
      "confidence": 0.92,
      "livenessStatus": "passed",
      "provider": "custom_http",
      "templateId": "uuid"
    }
  }
}
```

## POST `/visits/check-out`

Check-out outlet dan hitung durasi kunjungan.

Permission: `visits.execute`.

Body:

```json
{
  "visitSessionId": "uuid-visit-session",
  "latitude": -7.250445,
  "longitude": 112.768845,
  "accuracyM": 8,
  "outcome": "closed_order",
  "closingNotes": "Order berhasil",
  "faceCapture": {
    "dataUrl": "data:image/jpeg;base64,...",
    "mimeType": "image/jpeg",
    "sizeBytes": 123456,
    "faceDetected": true,
    "faceConfidence": 0.97,
    "capturedAt": "2026-05-01T05:30:00.000Z"
  }
}
```

`outcome`:

```txt
closed_order
no_order
follow_up
outlet_closed
rejected
invalid_location
```

Response:

```json
{
  "visit": {},
  "face": {},
  "result": {
    "durationSeconds": 1800,
    "durationMinutes": 30,
    "hasClosingOrder": true
  }
}
```

## GET `/visits/performance`

Laporan performa kunjungan dan closing.

Permission: `visits.review`.

Query params:

```txt
from=YYYY-MM-DD
to=YYYY-MM-DD
salesUserId=uuid
```

Metrik:

```txt
visitAchievementPercent
closingAchievementPercent
revenueAchievementPercent
effectiveCallRate
averageOrderValue
```

## GET `/visits/review`

Review visit sessions.

Permission: `visits.review`.

---

# 6. Sales Orders

## GET `/sales/orders`

Ambil daftar sales order.

Permission: `sales.view`.

## POST `/sales/orders`

Buat order/POS.

Permission: `sales.order.create`.

Body:

```json
{
  "outletId": "uuid-outlet",
  "visitSessionId": "uuid-visit-session-optional",
  "warehouseId": "uuid-warehouse",
  "transactionType": "order",
  "paymentMethod": "cash",
  "paymentStatus": "paid",
  "totalAmount": "50000",
  "notes": "Catatan order",
  "items": [
    {
      "productId": "uuid-product",
      "quantity": "2",
      "unitPrice": "25000",
      "discountAmount": "0"
    }
  ]
}
```

Enum penting:

```txt
transactionType: order | return | consignment
paymentMethod: cash | qris | credit | consignment
paymentStatus: unpaid | partial | paid
```

## POST `/sales/orders/:id/approve`

Approve order.

Permission: `sales.order.review`.

Behavior:

```txt
status order menjadi approved
stock keluar dari warehouse
jika paymentMethod credit → buat receivable
jika paymentMethod consignment / transactionType consignment → buat consignment
```

---

# 7. Receivables & Consignments

## GET `/receivables`

Ambil daftar piutang.

Permission: `receivables.view`.

## POST `/receivables/:id/payments`

Input pembayaran piutang.

Permission: `receivables.view`.

Body:

```json
{
  "amount": "100000",
  "paymentMethod": "cash",
  "paidAt": "2026-05-01T05:00:00.000Z",
  "notes": "Pembayaran sebagian"
}
```

## GET `/consignments`

Ambil daftar konsinyasi.

Permission: `receivables.view`.

## POST `/consignments/:id/actions`

Aksi konsinyasi.

Permission: `receivables.view`.

Body:

```json
{
  "actionType": "notify_withdrawal",
  "notes": "Barang perlu ditarik"
}
```

`actionType`:

```txt
notify_withdrawal
extend
withdraw
reset_stock_zero
```

---

# 8. Inventory & Warehouse

## GET `/inventory/settings`

Ambil label konfigurasi inventory company.

Permission: `inventory.manage`.

## PUT `/inventory/settings`

Update label konfigurasi inventory.

Permission: `inventory.manage`.

Body contoh:

```json
{
  "warehouseLabel": "Gudang",
  "warehouseTypeLabels": {
    "main": "Gudang Utama",
    "sales": "Gudang Sales",
    "display": "Display Outlet",
    "return": "Retur"
  }
}
```

## GET `/inventory/warehouses`

Ambil gudang.

Permission: `inventory.manage`.

## POST `/inventory/warehouses`

Buat gudang.

Permission: `inventory.manage`.

Body:

```json
{
  "code": "GDG-001",
  "name": "Gudang Utama",
  "type": "main",
  "address": "Surabaya",
  "latitude": -7.25,
  "longitude": 112.76
}
```

## PATCH `/inventory/warehouses/:id`

Update gudang.

Permission: `inventory.manage`.

## DELETE `/inventory/warehouses/:id`

Nonaktifkan gudang jika tidak ada stock.

Permission: `inventory.manage`.

## GET `/inventory/balances`

Ambil saldo stok.

Permission: `inventory.manage`.

Query params:

```txt
warehouseId=uuid
productId=uuid
```

## GET `/inventory/movements`

Ambil movement stok.

Permission: `inventory.manage`.

Query params:

```txt
warehouseId=uuid
productId=uuid
movementType=in|out|adjustment|transfer|reset|reversal
```

## POST `/inventory/adjustments`

Adjustment stok.

Permission: `inventory.manage`.

Body:

```json
{
  "warehouseId": "uuid-warehouse",
  "productId": "uuid-product",
  "quantityDelta": "10",
  "reason": "Stock opname"
}
```

## POST `/inventory/resets`

Reset stok produk di gudang.

Permission: `inventory.manage`.

Body:

```json
{
  "warehouseId": "uuid-warehouse",
  "productId": "uuid-product",
  "newQuantity": "0",
  "reason": "Reset akhir bulan"
}
```

## POST `/inventory/movements/:id/reverse`

Reverse movement stok.

Permission: `inventory.manage`.

Body:

```json
{
  "reason": "Kesalahan input"
}
```

## POST `/inventory/transfers`

Transfer stok antar gudang.

Permission: `inventory.manage`.

Body:

```json
{
  "fromWarehouseId": "uuid-source",
  "toWarehouseId": "uuid-destination",
  "productId": "uuid-product",
  "quantity": "5",
  "reason": "Distribusi ke sales"
}
```

---

# 9. Products

## GET `/products`

Ambil produk aktif.

Permission: `sales.view`.

## POST `/products`

Buat produk.

Permission: `products.manage`.

Body:

```json
{
  "sku": "SKU-001",
  "name": "Produk A",
  "category": "Minuman",
  "unit": "pcs",
  "price": "25000",
  "status": "active"
}
```

---

# 10. Offline Sync

## GET `/sync/manifest`

Ambil metadata sync.

Permission: authenticated.

Response memuat:

```txt
serverTime
companyId
userId
scope
modules
endpoints
maxBatchSize
```

## GET `/sync/pull`

Download kebutuhan offline.

Permission: authenticated.

Query params:

```txt
scope=sales-mobile
date=YYYY-MM-DD
```

Response entities:

```txt
settings
products
visitSchedules
outlets
warehouses
inventoryBalances
```

## POST `/sync/push`

Push event offline.

Permission: authenticated.

Body:

```json
{
  "deviceId": "device-001",
  "events": [
    {
      "clientRequestId": "uuid",
      "entityType": "sales.order",
      "entityId": "uuid-optional",
      "operation": "create",
      "payload": {
        "offline": true
      },
      "createdAtClient": "2026-05-01T05:00:00.000Z"
    }
  ]
}
```

## GET `/sync/status`

Ambil status sync events.

Permission: authenticated.

Query params:

```txt
deviceId=device-001
limit=50
```

---

# 11. Access Control

## GET `/roles`

Ambil roles.

Permission: `roles.manage`.

## GET `/permissions`

Ambil permissions.

Permission: `permissions.manage`.

## POST `/permissions`

Buat permission.

Permission: `permissions.manage`.

Body:

```json
{
  "code": "module.action",
  "name": "Permission Name",
  "module": "module",
  "description": "Description"
}
```

## GET `/roles/:roleId/permissions`

Ambil permission role.

Permission: `roles.manage`.

## POST `/roles/:roleId/permissions`

Assign permission ke role.

Permission: `roles.manage`.

Body:

```json
{
  "permissionId": "uuid-permission"
}
```

---

# 12. Reports

## GET `/reports/summary`

Dashboard summary.

Permission: `reports.view`.

Query params optional tergantung implementasi laporan.

---

# 13. Planned Placeholder

## GET `/outlets`

Status: planned placeholder.

## GET `/transactions`

Status: planned placeholder.

---

# Business Flow Utama

## Sales Visit Flow

```txt
Admin/SPV membuat jadwal
→ sales melihat /visits/today
→ sales check-in outlet dengan GPS + face capture
→ sistem validasi geofence + face detection/recognition
→ sales membuat order bila ada closing
→ sales check-out
→ sistem hitung durasi
→ performance menghitung target outlet/closing/revenue
```

## Face Recognition Flow

```txt
Admin enroll wajah user
→ company mengaktifkan face integration di /settings/general
→ sales check-in dengan foto
→ backend ambil template wajah user login
→ backend panggil provider per company
→ hasil disimpan ke face_captures
→ visit valid/manual_review/reject sesuai setting
```

## Offline Sync Flow

```txt
mobile login
→ GET /sync/manifest
→ GET /sync/pull untuk download data offline
→ user transaksi/check-in offline di local queue
→ saat online POST /sync/push
→ GET /sync/status untuk status event
```
