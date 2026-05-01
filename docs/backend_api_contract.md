# YukSales Backend API Contract

Base URL lokal:

```txt
http://localhost:4000
```

Header umum untuk endpoint protected:

```http
Authorization: Bearer <accessToken>
X-Company-Id: <companyId>
Content-Type: application/json
```

> [!IMPORTANT]
> Konfigurasi tenant teknis seperti GPS radius dan face policy ada di `app_settings`.
> Konfigurasi integrasi eksternal seperti Cloudflare R2/S3/Face provider kini ada di tabel `company_integrations`.

---

## Status Implementasi Saat Ini

| Area | Status |
|---|---:|
| Auth login/refresh/logout/me | Ada |
| Company profile | Ada |
| General settings per company | Ada |
| Company integrations table/API | Ada |
| Cloudflare R2/S3-compatible media upload | Ada |
| Face template enrollment | Ada |
| Visit schedule/check-in/check-out/performance | Ada |
| CRUD outlet + foto + verify/reject | Ada |
| Inventory/warehouse | Ada |
| Sales order/approval | Ada |
| Receivable/consignment | Ada |
| Offline sync manifest/pull/push/status | Ada |
| `/transactions` route | Placeholder |

---

# 1. Authentication

## POST `/auth/login`

Body:

```json
{
  "identifier": "admin@yuksales.local",
  "password": "ChangeMe123!",
  "deviceId": "device-001"
}
```

## POST `/auth/refresh`

```json
{
  "refreshToken": "refresh-token"
}
```

## POST `/auth/logout`

```json
{
  "refreshToken": "refresh-token"
}
```

## GET `/auth/me`

Protected. Mengembalikan user login.

---

# 2. Company Profile

Company profile tersimpan di tabel `companies`.

Field tersedia:

```txt
name
slug
status
logoUrl
coverPhotoUrl
legalName
email
phone
address
city
province
postalCode
country
latitude
longitude
taxNumber
websiteUrl
timezone
```

## GET `/company/profile`

Permission: `settings.manage`.

## PUT `/company/profile`

Permission: `settings.manage`.

Body:

```json
{
  "name": "PT Contoh Sales Indonesia",
  "legalName": "PT Contoh Sales Indonesia",
  "email": "admin@contoh.co.id",
  "phone": "08123456789",
  "address": "Jl. Raya Contoh No. 1",
  "city": "Surabaya",
  "province": "Jawa Timur",
  "postalCode": "60111",
  "country": "Indonesia",
  "latitude": -7.250445,
  "longitude": 112.768845,
  "logoUrl": "https://cdn.example.com/logo.png",
  "coverPhotoUrl": "https://cdn.example.com/cover.png",
  "taxNumber": "01.234.567.8-999.000",
  "websiteUrl": "https://contoh.co.id",
  "timezone": "Asia/Jakarta"
}
```

Audit action:

```txt
company.profile.updated
```

---

# 3. General Settings Per Company

Tersimpan di `app_settings` dengan key:

```txt
general_settings:<companyId>
```

## GET `/settings/general`

Permission: `settings.manage`.

## PUT `/settings/general`

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

> [!NOTE]
> Face integration masih tersedia di general settings untuk kompatibilitas flow saat ini.
> Untuk integrasi eksternal jangka panjang, tabel `company_integrations` sudah disiapkan.

---

# 4. Company Integrations

Tabel:

```txt
company_integrations
```

Digunakan untuk menyimpan konfigurasi integrasi eksternal per company agar tidak bercampur dengan general settings.

Enum `type`:

```txt
storage
face_recognition
payment
notification
```

Enum `provider`:

```txt
cloudflare_r2
s3
custom_http
aws_rekognition
azure_face
google_vertex
mock
```

Enum `status`:

```txt
active
inactive
```

## GET `/integrations`

Permission: `settings.manage`.

Query:

```txt
type=storage
```

Secret dimasking di response.

## GET `/integrations/:id`

Permission: `settings.manage`.

## POST `/integrations`

Permission: `settings.manage`.

Body Cloudflare R2:

```json
{
  "type": "storage",
  "provider": "cloudflare_r2",
  "name": "Cloudflare R2 - Main Bucket",
  "status": "active",
  "config": {
    "bucket": "yuksales-assets",
    "region": "auto",
    "endpoint": "https://aea4e2f5c52c669d23de0cc66dfefd9d.r2.cloudflarestorage.com",
    "publicBaseUrl": "",
    "signedUrlExpiresSeconds": 900
  },
  "secretConfig": {
    "accessKeyId": "r2-access-key-id",
    "secretAccessKey": "r2-secret-access-key"
  },
  "description": "Storage asset company di Cloudflare R2"
}
```

## PATCH `/integrations/:id`

Permission: `settings.manage`.

Body partial dari POST.

## DELETE `/integrations/:id`

Permission: `settings.manage`.

Behavior: integrasi dinonaktifkan (`status = inactive`), bukan hard delete.

---

# 5. Media Storage / Cloudflare R2

Storage service membaca konfigurasi dengan urutan:

```txt
1. company_integrations type=storage status=active
2. fallback ke .env global
```

Env fallback:

```env
STORAGE_DRIVER=r2
STORAGE_BUCKET=yuksales-assets
STORAGE_REGION=auto
STORAGE_ENDPOINT=https://aea4e2f5c52c669d23de0cc66dfefd9d.r2.cloudflarestorage.com
STORAGE_ACCESS_KEY_ID=
STORAGE_SECRET_ACCESS_KEY=
STORAGE_PUBLIC_BASE_URL=
STORAGE_SIGNED_URL_EXPIRES_SECONDS=900
```

Object key pattern:

```txt
companies/{companyId}/{ownerType}/{ownerId}/{yyyy}/{mm}/{fileName}-{uuid}.ext
```

Supported owner type:

```txt
user
outlet
transaction
attendance
visit
deposit
face_template
```

## POST `/media/upload-url`

Permission: `media.manage`.

Body:

```json
{
  "ownerType": "outlet",
  "ownerId": "uuid-outlet",
  "fileName": "foto-depan-outlet.jpg",
  "mimeType": "image/jpeg",
  "sizeBytes": 123456
}
```

Response:

```json
{
  "uploadUrl": "https://signed-r2-url",
  "objectKey": "companies/companyId/outlet/outletId/2026/05/foto-depan-outlet-uuid.jpg",
  "publicUrl": "https://.../yuksales-assets/companies/...",
  "expiresIn": 900,
  "provider": "cloudflare_r2"
}
```

Client upload langsung ke R2:

```http
PUT <uploadUrl>
Content-Type: image/jpeg

<binary-file>
```

## POST `/media/complete`

Permission: `media.manage`.

Body:

```json
{
  "ownerType": "outlet",
  "ownerId": "uuid-outlet",
  "objectKey": "companies/companyId/outlet/outletId/2026/05/foto.jpg",
  "mimeType": "image/jpeg",
  "sizeBytes": 123456,
  "fileHash": "optional-sha256",
  "capturedAt": "2026-05-01T06:00:00.000Z"
}
```

Response:

```json
{
  "media": {
    "id": "uuid",
    "ownerType": "outlet",
    "ownerId": "uuid-outlet",
    "fileUrl": "https://...",
    "mimeType": "image/jpeg",
    "sizeBytes": 123456
  }
}
```

## GET `/media/:id`

Permission: `media.manage`.

## DELETE `/media/:id`

Permission: `media.manage`.

Behavior:

```txt
hapus object dari R2/S3
hapus row media_files
buat audit log media.deleted
```

---

# 6. Outlet Management

Tabel utama:

```txt
outlets
outlet_photos
media_files
```

Field outlet:

```txt
code
name
customerType
ownerName
phone
address
latitude
longitude
geofenceRadiusM
status
registeredByUserId
verifiedByUserId
verifiedAt
rejectionReason
deletedAt
```

## GET `/outlets`

Permission: `outlets.manage`.

Query:

```txt
status=active
q=toko
```

## POST `/outlets`

Permission: `outlets.manage`.

Body:

```json
{
  "code": "OUT-001",
  "name": "Toko Sumber Rejeki",
  "customerType": "store",
  "ownerName": "Budi",
  "phone": "08123456789",
  "address": "Jl. Mawar No. 10",
  "latitude": -7.250445,
  "longitude": 112.768845,
  "geofenceRadiusM": 100,
  "status": "pending_verification"
}
```

## GET `/outlets/:id`

Permission: `outlets.manage`.

Response berisi outlet dan photos.

## PATCH `/outlets/:id`

Permission: `outlets.manage`.

Body partial dari create outlet.

## DELETE `/outlets/:id`

Permission: `outlets.manage`.

Behavior: soft delete, status menjadi `inactive`.

## POST `/outlets/:id/photos`

Permission: `outlets.manage`.

Body legacy/base64:

```json
{
  "dataUrl": "data:image/jpeg;base64,...",
  "mimeType": "image/jpeg",
  "sizeBytes": 123456,
  "capturedAt": "2026-05-01T06:00:00.000Z",
  "latitude": -7.250445,
  "longitude": 112.768845,
  "source": "camera"
}
```

> [!TIP]
> Untuk produksi, gunakan flow `/media/upload-url` + `/media/complete` agar file disimpan di Cloudflare R2.

## POST `/outlets/:id/verify`

Permission: `outlets.manage`.

## POST `/outlets/:id/reject`

Permission: `outlets.manage`.

Body:

```json
{
  "reason": "Data alamat tidak sesuai"
}
```

---

# 7. Face Template & Verification

## GET `/settings/face-templates`

Permission: `settings.manage`.

## POST `/settings/face-templates`

Permission: `settings.manage`.

Body legacy/base64:

```json
{
  "userId": "uuid-user",
  "dataUrl": "data:image/jpeg;base64,...",
  "mimeType": "image/jpeg",
  "sizeBytes": 123456,
  "embeddingRef": "optional-provider-template-ref"
}
```

Behavior:

```txt
validasi user company sama
simpan media face_template
nonaktifkan template aktif lama
buat template baru active companyId/userId/roleId
buat audit log
```

Face verification check-in/out:

```txt
foto masuk
cek faceDetected
jika requireFaceIdentityMatchForVisit=true
  ambil template user aktif
  jika faceIntegration.enabled=true → panggil provider
  jika tidak → fallback policy/mock faceConfidence >= threshold
update face_captures identity status/confidence/liveness
```

Provider adapter yang tersedia:

```txt
mock
custom_http
azure_face
google_vertex
aws_rekognition compatible/proxy
```

---

# 8. Visit Scheduling & Execution

## GET `/visits/schedules`

Permission: `visits.review`.

Query:

```txt
date=YYYY-MM-DD
salesUserId=uuid
```

## POST `/visits/schedules`

Permission: `visits.review`.

Body:

```json
{
  "salesUserId": "uuid-sales",
  "outletIds": ["uuid-outlet-1"],
  "scheduledDate": "2026-05-01",
  "plannedStartTime": "09:00",
  "plannedEndTime": "17:00",
  "targetOutletCount": 1,
  "targetDurationMinutes": 30,
  "targetClosingCount": 1,
  "targetRevenueAmount": "1000000",
  "priority": 3,
  "notes": "Kunjungan area Surabaya"
}
```

## PATCH `/visits/schedules/:id`

Permission: `visits.review`.

## POST `/visits/schedules/:id/approve`

Permission: `visits.review`.

## POST `/visits/schedules/:id/cancel`

Permission: `visits.review`.

## GET `/visits/today`

Permission: `visits.execute`.

## POST `/visits/check-in`

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
schedule company/sales sesuai
geofence radius outlet/general settings
GPS accuracy <= maxGpsAccuracyM
faceDetected wajib jika requireFaceForVisit=true
identity match jika requireFaceIdentityMatchForVisit=true
```

## POST `/visits/check-out`

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

Outcome:

```txt
closed_order
no_order
follow_up
outlet_closed
rejected
invalid_location
```

Durasi kunjungan dihitung dari check-in sampai check-out.

## GET `/visits/performance`

Permission: `visits.review`.

Query:

```txt
from=YYYY-MM-DD
to=YYYY-MM-DD
salesUserId=uuid
```

## GET `/visits/review`

Permission: `visits.review`.

---

# 9. Sales Orders

## GET `/sales/orders`

Permission: `sales.view`.

## POST `/sales/orders`

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

## POST `/sales/orders/:id/approve`

Permission: `sales.order.review`.

Behavior:

```txt
approve order
kurangi stok
buat receivable jika credit
buat consignment jika consignment
```

---

# 10. Inventory

## GET `/inventory/settings`

Permission: `inventory.manage`.

## PUT `/inventory/settings`

Permission: `inventory.manage`.

## GET `/inventory/warehouses`

Permission: `inventory.manage`.

## POST `/inventory/warehouses`

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

## DELETE `/inventory/warehouses/:id`

## GET `/inventory/balances`

Query:

```txt
warehouseId=uuid
productId=uuid
```

## GET `/inventory/movements`

Query:

```txt
warehouseId=uuid
productId=uuid
movementType=in|out|adjustment|transfer|reset|reversal
```

## POST `/inventory/adjustments`

```json
{
  "warehouseId": "uuid-warehouse",
  "productId": "uuid-product",
  "quantityDelta": "10",
  "reason": "Stock opname"
}
```

## POST `/inventory/resets`

```json
{
  "warehouseId": "uuid-warehouse",
  "productId": "uuid-product",
  "newQuantity": "0",
  "reason": "Reset akhir bulan"
}
```

## POST `/inventory/movements/:id/reverse`

```json
{
  "reason": "Kesalahan input"
}
```

## POST `/inventory/transfers`

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

# 11. Products

## GET `/products`

Permission: `sales.view`.

## POST `/products`

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

# 12. Receivables & Consignments

## GET `/receivables`

Permission: `receivables.view`.

## POST `/receivables/:id/payments`

```json
{
  "amount": "100000",
  "paymentMethod": "cash",
  "paidAt": "2026-05-01T05:00:00.000Z",
  "notes": "Pembayaran sebagian"
}
```

## GET `/consignments`

Permission: `receivables.view`.

## POST `/consignments/:id/actions`

```json
{
  "actionType": "notify_withdrawal",
  "notes": "Barang perlu ditarik"
}
```

Action type:

```txt
notify_withdrawal
extend
withdraw
reset_stock_zero
```

---

# 13. Offline Sync

## GET `/sync/manifest`

Protected.

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

Protected.

Query:

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

Protected.

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

Query:

```txt
deviceId=device-001
limit=50
```

---

# 14. Access Control

## GET `/roles`

Permission: `roles.manage`.

## GET `/permissions`

Permission: `permissions.manage`.

## POST `/permissions`

```json
{
  "code": "module.action",
  "name": "Permission Name",
  "module": "module",
  "description": "Description"
}
```

## GET `/roles/:roleId/permissions`

Permission: `roles.manage`.

## POST `/roles/:roleId/permissions`

```json
{
  "permissionId": "uuid-permission"
}
```

---

# 15. Reports

## GET `/reports/summary`

Permission: `reports.view`.

---

# 16. Placeholder

## GET `/transactions`

Status: placeholder/planned.

---

# Business Flow Ringkas

## Asset Upload Flow

```txt
Admin/mobile request /media/upload-url
→ backend baca storage integration per company
→ backend generate signed PUT URL R2/S3
→ client upload binary langsung ke R2/S3
→ client call /media/complete
→ backend simpan metadata ke media_files
```

## Outlet Flow

```txt
Admin/sales create outlet
→ upload foto via media R2 atau legacy endpoint
→ verify/reject outlet
→ outlet dipakai pada jadwal visit dan geofence
```

## Visit Flow

```txt
SPV/Admin buat jadwal
→ sales GET /visits/today
→ check-in dengan GPS + face
→ backend validasi GPS radius + face detection/recognition
→ sales order jika closing
→ check-out
→ performance report menghitung target outlet/closing/revenue
```

## Offline Sync Flow

```txt
mobile pull manifest + master data
→ simpan offline lokal
→ saat offline buat event queue
→ saat online upload media dulu ke R2
→ push event domain ke /sync/push
→ cek status via /sync/status
```
