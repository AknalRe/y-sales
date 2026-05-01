# YukSales Database Schema Overview

Dokumen ini merangkum schema utama sesuai kondisi proyek saat ini.

---

## Company & Tenant

### `companies`

Menyimpan profil tenant/company.

Field penting:

```txt
id
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
createdAt
updatedAt
```

### `company_subscriptions`

Menyimpan informasi plan dan subscription company.

---

## Integrations

### `company_integrations`

Menyimpan konfigurasi integrasi eksternal per company.

Digunakan untuk:

```txt
storage
face_recognition
payment
notification
```

Provider:

```txt
cloudflare_r2
s3
custom_http
aws_rekognition
azure_face
google_vertex
mock
```

Field:

```txt
id
companyId
type
provider
name
status
config
secretConfig
description
updatedByUserId
createdAt
updatedAt
```

Catatan:

- `config` berisi konfigurasi non-secret seperti bucket, endpoint, region.
- `secretConfig` berisi access key/API key dan harus dimasking saat response API.

---

## Auth & Access Control

### `users`

User tenant dan administrator.

Field terkait multi-tenant:

```txt
companyId
roleId
status
```

### `roles`, `permissions`, `role_permissions`

RBAC untuk permission backend.

---

## Settings

### `app_settings`

Menyimpan setting umum per company, misalnya:

```txt
general_settings:<companyId>
```

Isi value mencakup:

```txt
defaultGeofenceRadiusM
maxGpsAccuracyM
requireFaceForAttendance
requireFaceForVisit
requireFaceIdentityMatchForVisit
faceMatchThreshold
requireLivenessForVisit
rejectVisitOnFaceMismatch
faceIntegration
```

---

## Media & Storage

### `media_files`

Metadata file/media.

Owner type:

```txt
user
outlet
transaction
attendance
visit
deposit
face_template
```

Field:

```txt
id
ownerType
ownerId
fileUrl
mimeType
sizeBytes
fileHash
capturedAt
uploadedByUserId
createdAt
```

File binary disimpan di storage eksternal seperti Cloudflare R2/S3-compatible.
DB hanya menyimpan metadata dan URL/path.

---

## Outlet

### `outlets`

Master outlet/customer.

Field:

```txt
companyId
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

### `outlet_photos`

Relasi foto outlet ke `media_files`.

Field:

```txt
companyId
outletId
mediaFileId
capturedAt
latitude
longitude
capturedByUserId
source
```

### `sales_outlet_assignments`

Assignment sales ke outlet.

---

## Attendance

### `attendance_sessions`

Absensi kerja harian sales/user.

### `face_captures`

Menyimpan capture wajah untuk attendance/visit.

Field penting:

```txt
mediaFileId
faceDetected
faceConfidence
identityMatchStatus
identityConfidence
livenessStatus
```

### `gps_track_logs`

Log GPS untuk audit lokasi.

---

## Face Templates

### `user_face_templates`

Template wajah aktif user per company/role.

Field:

```txt
companyId
userId
roleId
mediaFileId
embeddingRef
templateHash
status
createdByUserId
createdAt
updatedAt
```

---

## Visits

### `visit_schedules`

Jadwal kunjungan sales.

Target yang tersedia:

```txt
targetOutletCount
targetDurationMinutes
targetClosingCount
targetRevenueAmount
```

### `visit_sessions`

Session check-in/check-out outlet.

Field penting:

```txt
checkInAt
checkOutAt
checkInLatitude
checkInLongitude
checkOutLatitude
checkOutLongitude
checkInFaceCaptureId
checkOutFaceCaptureId
status
outcome
durationSeconds
```

---

## Products & Inventory

### `products`

Master produk.

### `warehouses`

Gudang.

### `inventory_balances`

Saldo stok per warehouse/product.

### `inventory_movements`

Riwayat movement stok.

---

## Sales Transactions

### `sales_transactions`

Header transaksi sales/POS/order.

### `sales_transaction_items`

Detail item transaksi.

### `transaction_note_photos`

Foto nota transaksi.

---

## Finance

### `receivables`

Piutang dari transaksi kredit.

### `receivable_payments`

Pembayaran piutang.

### `consignments`, `consignment_items`, `consignment_actions`

Konsinyasi dan aksi terkait.

### `cash_deposits`, `cash_deposit_items`

Setoran kas.

---

## Audit & Sync

### `audit_logs`

Audit trail perubahan penting.

### `sync_events`

Event offline sync dari mobile.

---

## Migration Terakhir Terkait Fitur Baru

```txt
0007_lumpy_praxagora.sql     # face template / media owner update
0008_mean_falcon.sql         # company profile fields
0009_reflective_lockjaw.sql  # company integrations table
```
