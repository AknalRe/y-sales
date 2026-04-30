# Rencana Implementasi Mahasura Sales Tracking Order

Dokumen ini adalah rencana implementasi berdasarkan `Requirement Document Mahasura.pdf` dan konfirmasi terbaru.

## Keputusan yang Sudah Dikonfirmasi

- Bahasa utama: **TypeScript**.
- Frontend: **Vite + React + TypeScript**.
- Styling: **Tailwind CSS**.
- PWA: wajib support installable, offline cache, dan sync saat online kembali.
- Database: **PostgreSQL**.
- ORM: **Drizzle ORM**.
- Backend utama yang disarankan: **Node.js + TypeScript**.
- Alternatif backend: Golang/Rust bisa dipertimbangkan, tetapi Drizzle paling natural dengan Node.js/TypeScript.
- Geofence radius: **bisa dikustomisasi lewat setting** dan bisa override per outlet.
- QR login tidak diprioritaskan untuk fase awal.
- Absensi/check-in menggunakan:
  - foto kamera depan/wajah,
  - validasi lokasi GPS,
  - validasi apakah sales berada dalam radius outlet/area yang ditentukan.

## User Review Required

> [!IMPORTANT]
> Saya menyarankan backend **Node.js + TypeScript + Fastify/Express + Drizzle ORM** agar satu bahasa dengan frontend dan schema Drizzle. Jika user ingin Golang/Rust, ORM Drizzle tidak cocok langsung karena Drizzle adalah ekosistem TypeScript.

> [!WARNING]
> Deteksi wajah di PWA bisa dilakukan on-device dengan library seperti MediaPipe/face-api.js untuk memastikan ada wajah pada foto. Namun **identifikasi wajah akurat** membutuhkan enrollment data wajah, model face recognition, consent, keamanan data biometrik, dan validasi server. Untuk MVP, implementasi aman adalah: foto kamera depan + face presence/liveness sederhana + review/admin audit. Face identity matching bisa dibuat sebagai phase lanjutan.

> [!WARNING]
> GPS tracking background penuh di web/PWA tetap terbatas oleh browser, terutama iOS. Tracking lokasi yang paling reliable di PWA adalah saat aplikasi aktif dan saat event penting seperti absensi/check-in/check-out/transaksi.

## Open Questions

1. Backend framework Node.js yang dipilih: **Fastify** atau **Express**?
   - Rekomendasi: Fastify karena cepat, schema validation bagus, dan rapi untuk API modular.
2. Apakah face identity matching harus langsung ada di MVP, atau cukup foto wajah + face detection + audit?
3. Apakah absensi awal hari harus di lokasi outlet pertama, atau cukup di radius area kerja tertentu?
4. Apakah setiap check-in outlet wajib foto wajah, atau hanya absensi awal/akhir shift?

## Proposed Changes

### 1. Arsitektur Monorepo

Project akan dibuat sebagai monorepo TypeScript agar frontend, backend, shared types, dan database schema tersusun rapi.

```txt
sales-tracking/
├─ apps/
│  ├─ web/                  # Vite React TypeScript PWA
│  └─ api/                  # Node.js TypeScript API server
├─ packages/
│  ├─ db/                   # Drizzle schema, migrations, seed
│  ├─ shared/               # Shared types, constants, validators
│  └─ config/               # Shared tsconfig/eslint config jika dibutuhkan
├─ docs/                    # Dokumentasi mapping, database, API, offline sync
├─ scripts/                 # Script helper lokal/deployment
├─ docker-compose.yml       # PostgreSQL lokal
├─ package.json             # Workspace root
├─ pnpm-workspace.yaml      # Workspace manager
└─ README.md
```

Package manager yang disarankan: **pnpm** karena workspace monorepo lebih rapi dan cepat.

---

### 2. Mapping Folder dan File

#### Root

| Path | Tujuan |
|---|---|
| `package.json` | Script workspace: dev web, dev api, db generate/migrate/studio |
| `pnpm-workspace.yaml` | Definisi workspace `apps/*` dan `packages/*` |
| `docker-compose.yml` | PostgreSQL lokal untuk development |
| `.env.example` | Contoh environment root/database |
| `README.md` | Panduan setup awal |

#### Frontend PWA — `apps/web`

| Path | Tujuan |
|---|---|
| `apps/web/index.html` | HTML entry + SEO meta dasar |
| `apps/web/vite.config.ts` | Vite config + PWA plugin |
| `apps/web/tailwind.config.ts` | Tailwind theme/token |
| `apps/web/src/main.tsx` | Entry React |
| `apps/web/src/App.tsx` | Root app + route provider |
| `apps/web/src/styles/index.css` | Tailwind base + design system |
| `apps/web/src/app/router.tsx` | Route mapping role-based |
| `apps/web/src/app/providers.tsx` | Query/client/session providers |
| `apps/web/src/features/auth/` | Login, session, route guard |
| `apps/web/src/features/attendance/` | Absensi kamera depan + GPS |
| `apps/web/src/features/visits/` | Check-in/check-out outlet + geofence |
| `apps/web/src/features/outlets/` | Outlet list, registrasi, foto toko |
| `apps/web/src/features/transactions/` | Form transaksi, foto nota, draft offline |
| `apps/web/src/features/inventory/` | Produk dan stok snapshot |
| `apps/web/src/features/deposits/` | Setoran/tutup kasir |
| `apps/web/src/features/sync/` | Offline queue UI dan retry |
| `apps/web/src/lib/api/` | API client dan error handling |
| `apps/web/src/lib/db/` | IndexedDB wrapper |
| `apps/web/src/lib/geo/` | Haversine/geofence utilities |
| `apps/web/src/lib/camera/` | Camera capture + face detection adapter |
| `apps/web/src/components/` | Shared UI components |
| `apps/web/src/layouts/` | Mobile/admin layouts |
| `apps/web/public/` | Icons, manifest assets |

#### Backend API — `apps/api`

| Path | Tujuan |
|---|---|
| `apps/api/src/server.ts` | Server bootstrap |
| `apps/api/src/app.ts` | App registration, middleware, routes |
| `apps/api/src/config/env.ts` | Validasi ENV |
| `apps/api/src/modules/auth/` | Login, session, token, camera attendance auth flow |
| `apps/api/src/modules/users/` | User dan role management |
| `apps/api/src/modules/outlets/` | Outlet CRUD, assignment, verification |
| `apps/api/src/modules/attendance/` | Absensi foto wajah + GPS |
| `apps/api/src/modules/visits/` | Visit session, geofence validation |
| `apps/api/src/modules/transactions/` | Sales transactions + approval |
| `apps/api/src/modules/inventory/` | Stock balance dan movement ledger |
| `apps/api/src/modules/receivables/` | Piutang dan pembayaran |
| `apps/api/src/modules/consignments/` | Konsinyasi dan trigger >30 hari |
| `apps/api/src/modules/deposits/` | Setoran dan rekonsiliasi |
| `apps/api/src/modules/sync/` | Offline sync endpoint + idempotency |
| `apps/api/src/modules/media/` | Upload foto wajah/toko/nota |
| `apps/api/src/plugins/` | Auth middleware, db plugin, error handler |
| `apps/api/src/utils/` | Utilities backend |

#### Database Package — `packages/db`

| Path | Tujuan |
|---|---|
| `packages/db/src/schema/index.ts` | Export semua schema Drizzle |
| `packages/db/src/schema/auth.ts` | roles, users, permissions, sessions |
| `packages/db/src/schema/settings.ts` | app settings/geofence settings |
| `packages/db/src/schema/outlets.ts` | outlets, photos, assignments |
| `packages/db/src/schema/attendance.ts` | attendance, face captures, GPS logs |
| `packages/db/src/schema/visits.ts` | visit sessions |
| `packages/db/src/schema/products.ts` | products, warehouses, inventory |
| `packages/db/src/schema/transactions.ts` | transactions, items, note photos |
| `packages/db/src/schema/receivables.ts` | receivables dan payments |
| `packages/db/src/schema/consignments.ts` | consignments dan actions |
| `packages/db/src/schema/deposits.ts` | cash deposits dan items |
| `packages/db/src/schema/sync.ts` | sync events dan idempotency |
| `packages/db/src/schema/media.ts` | media files |
| `packages/db/src/schema/audit.ts` | audit logs |
| `packages/db/drizzle.config.ts` | Drizzle Kit config |
| `packages/db/drizzle/` | SQL migrations hasil generate Drizzle |
| `packages/db/src/client.ts` | Database client |
| `packages/db/src/seed.ts` | Seed roles/settings awal |

#### Shared Package — `packages/shared`

| Path | Tujuan |
|---|---|
| `packages/shared/src/constants/roles.ts` | Role constants |
| `packages/shared/src/constants/statuses.ts` | Status constants |
| `packages/shared/src/types/` | Shared TypeScript types |
| `packages/shared/src/validators/` | Zod validators untuk request/form |
| `packages/shared/src/geo/haversine.ts` | Utility geofence shared |
| `packages/shared/src/sync/types.ts` | Sync queue types |

#### Docs — `docs`

| Path | Tujuan |
|---|---|
| `docs/folder-mapping.md` | Dokumentasi mapping folder dan file |
| `docs/database-schema.md` | Dokumentasi skema database |
| `docs/offline-sync.md` | Strategi offline/online sync |
| `docs/gps-attendance.md` | GPS, geofence, dan absensi wajah |
| `docs/api-map.md` | Mapping endpoint API |

---

### 3. Skema Database PostgreSQL + Drizzle ORM

> [!NOTE]
> Schema akan dibuat sebagai TypeScript Drizzle schema, lalu SQL migration di-generate oleh Drizzle Kit.

#### Settings

##### `app_settings`

Untuk konfigurasi radius dan aturan operasional yang bisa diubah tanpa redeploy.

| Kolom | Tipe | Catatan |
|---|---:|---|
| id | uuid | PK |
| key | varchar | Unique, contoh `default_geofence_radius_m` |
| value | jsonb | Nilai setting fleksibel |
| description | text | Opsional |
| updated_by_user_id | uuid | FK user |
| created_at | timestamptz |  |
| updated_at | timestamptz |  |

Default seed:
- `default_geofence_radius_m = 100`
- `max_gps_accuracy_m = 100`
- `daily_visit_target = 20`
- `gps_log_interval_seconds = 300`
- `face_detection_required = true`

#### Core Identity & Authorization

##### `roles`

| Kolom | Tipe | Catatan |
|---|---:|---|
| id | uuid | PK |
| code | varchar | `OWNER`, `OPERATIONAL_MANAGER`, `SUPERVISOR`, `ADMIN`, `SALES_AGENT` |
| name | varchar | Nama role |
| description | text | Opsional |
| created_at | timestamptz |  |
| updated_at | timestamptz |  |

##### `users`

| Kolom | Tipe | Catatan |
|---|---:|---|
| id | uuid | PK |
| role_id | uuid | FK `roles.id` |
| supervisor_id | uuid | FK `users.id`, nullable |
| name | varchar | Nama user |
| email | varchar | Unique nullable |
| phone | varchar | Unique nullable |
| password_hash | varchar | Login normal tetap disediakan |
| employee_code | varchar | Kode sales/karyawan |
| profile_photo_url | text | Foto referensi opsional untuk face identity phase lanjutan |
| status | enum | `active`, `inactive`, `suspended` |
| last_login_at | timestamptz |  |
| created_at | timestamptz |  |
| updated_at | timestamptz |  |
| deleted_at | timestamptz | Soft delete |

##### `sessions`

| Kolom | Tipe | Catatan |
|---|---:|---|
| id | uuid | PK |
| user_id | uuid | FK |
| refresh_token_hash | varchar | Simpan hash token |
| device_id | varchar | Browser/device identifier |
| expires_at | timestamptz |  |
| revoked_at | timestamptz | Nullable |
| created_at | timestamptz |  |

##### `permissions` dan `role_permissions`

Tetap disiapkan untuk granular RBAC.

---

#### Outlet & Assignment

##### `outlets`

| Kolom | Tipe | Catatan |
|---|---:|---|
| id | uuid | PK |
| code | varchar | Unique |
| name | varchar | Nama toko/agen |
| customer_type | enum | `store`, `agent` |
| owner_name | varchar | Opsional |
| phone | varchar | Opsional |
| address | text | Alamat lengkap |
| latitude | numeric | Koordinat outlet |
| longitude | numeric | Koordinat outlet |
| geofence_radius_m | integer | Override radius outlet; fallback ke setting default |
| status | enum | `draft`, `pending_verification`, `active`, `rejected`, `inactive` |
| registered_by_user_id | uuid | FK |
| verified_by_user_id | uuid | FK |
| verified_at | timestamptz |  |
| rejection_reason | text |  |
| created_at | timestamptz |  |
| updated_at | timestamptz |  |
| deleted_at | timestamptz |  |

##### `outlet_photos`

Foto toko dari kamera belakang.

##### `sales_outlet_assignments`

Mapping sales ke outlet yang boleh diakses.

---

#### Attendance, Face Capture, Visit Control & GPS

##### `attendance_sessions`

Absensi shift Sales Agent dengan GPS dan foto kamera depan.

| Kolom | Tipe | Catatan |
|---|---:|---|
| id | uuid | PK |
| user_id | uuid | FK Sales Agent |
| work_date | date |  |
| check_in_at | timestamptz |  |
| check_in_latitude | numeric |  |
| check_in_longitude | numeric |  |
| check_in_accuracy_m | numeric |  |
| check_in_distance_m | numeric | Jarak ke outlet/area bila ada |
| check_in_outlet_id | uuid | Nullable jika absensi di outlet pertama |
| check_in_face_capture_id | uuid | FK `face_captures.id` |
| check_out_at | timestamptz |  |
| check_out_latitude | numeric |  |
| check_out_longitude | numeric |  |
| check_out_accuracy_m | numeric |  |
| check_out_face_capture_id | uuid | FK `face_captures.id` |
| status | enum | `open`, `closed`, `flagged` |
| validation_status | enum | `valid`, `invalid_location`, `face_not_detected`, `manual_review` |
| client_request_id | uuid | Unique idempotency |
| created_at | timestamptz |  |
| updated_at | timestamptz |  |

##### `face_captures`

Metadata foto wajah untuk absensi/check-in.

| Kolom | Tipe | Catatan |
|---|---:|---|
| id | uuid | PK |
| user_id | uuid | FK |
| media_file_id | uuid | FK `media_files.id` |
| capture_context | enum | `attendance_check_in`, `attendance_check_out`, `visit_check_in`, `visit_check_out` |
| captured_at | timestamptz | Waktu capture |
| latitude | numeric | Lokasi capture |
| longitude | numeric | Lokasi capture |
| face_detected | boolean | Hasil deteksi wajah |
| face_confidence | numeric | Confidence jika tersedia |
| identity_match_status | enum | `not_checked`, `matched`, `not_matched`, `manual_review` |
| identity_confidence | numeric | Untuk phase face recognition |
| liveness_status | enum | `not_checked`, `passed`, `failed`, `manual_review` |
| created_at | timestamptz |  |

##### `visit_sessions`

Check-in/check-out outlet dengan GPS dan opsional foto wajah.

Tambahan kolom dari rencana awal:
- `check_in_face_capture_id`
- `check_out_face_capture_id`
- `geofence_radius_m_used`
- `validation_status`

##### `gps_track_logs`

Log lokasi event/periodik saat app aktif.

---

#### Product, Stock & Inventory

Tetap memakai:
- `products`
- `warehouses`
- `inventory_balances`
- `inventory_movements`

Stok dipotong via movement ledger saat transaksi berubah ke status `validated`.

---

#### Sales Transactions

Tetap memakai:
- `sales_transactions`
- `sales_transaction_items`
- `transaction_note_photos`

Aturan utama:
- `payment_method = consignment` tidak boleh untuk `customer_type = end_user`.
- Foto nota wajib sebelum submit.
- Sales hanya bisa transaksi pada outlet assignment aktif.
- Validasi geofence visit jika transaksi terkait outlet.

---

#### Receivables & Consignment

Tetap memakai:
- `receivables`
- `receivable_payments`
- `consignments`
- `consignment_items`
- `consignment_actions`

Job backend akan menandai piutang/konsinyasi > 30 hari:
- `overdue`
- `withdrawal_required`
- trigger `reset_stock_zero` jika sesuai kebijakan.

---

#### Deposit & Reconciliation

Tetap memakai:
- `cash_deposits`
- `cash_deposit_items`
- `approval_logs`

---

#### Sync, Media & Audit

Tetap memakai:
- `sync_events`
- `media_files`
- `audit_logs`

Tambahan penting:
- `client_request_id` wajib unique untuk semua mutation offline.
- Upload media harus terhubung dengan sync event agar retry aman.

---

### 4. API Endpoint Mapping Awal

#### Auth

| Method | Endpoint | Tujuan |
|---|---|---|
| `POST` | `/auth/login` | Login normal |
| `POST` | `/auth/refresh` | Refresh session |
| `POST` | `/auth/logout` | Logout |
| `GET` | `/auth/me` | Profile session |

#### Settings

| Method | Endpoint | Tujuan |
|---|---|---|
| `GET` | `/settings` | Ambil setting aplikasi |
| `PATCH` | `/settings/:key` | Update setting oleh role berwenang |

#### Attendance & Face Capture

| Method | Endpoint | Tujuan |
|---|---|---|
| `POST` | `/attendance/check-in` | Absensi masuk dengan GPS + face capture |
| `POST` | `/attendance/check-out` | Absensi pulang |
| `GET` | `/attendance/today` | Sesi hari ini |
| `GET` | `/attendance/reports` | Laporan absensi |

#### Visits

| Method | Endpoint | Tujuan |
|---|---|---|
| `POST` | `/visits/check-in` | Check-in outlet + geofence |
| `POST` | `/visits/check-out` | Check-out outlet |
| `GET` | `/visits/today` | Visit hari ini |

#### Sync

| Method | Endpoint | Tujuan |
|---|---|---|
| `POST` | `/sync/push` | Push queue offline |
| `GET` | `/sync/pull` | Pull master/incremental data |
| `GET` | `/sync/status` | Status sync user/device |

Endpoint lain akan didokumentasikan di `docs/api-map.md`.

---

### 5. Offline-First Sync Plan

Semua aksi lapangan disimpan dulu ke IndexedDB sebagai queue item, lalu dikirim ketika online.

Queue item minimal:

```ts
type SyncQueueItem = {
  id: string;
  clientRequestId: string;
  entityType: string;
  operation: 'create' | 'update' | 'delete' | 'upload';
  payload: unknown;
  status: 'pending' | 'syncing' | 'synced' | 'failed' | 'conflict';
  retryCount: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
};
```

Rules:
- Server memakai `client_request_id` untuk idempotency.
- Media upload dapat di-retry tanpa membuat dokumen ganda.
- Master data server authoritative.
- Stok server authoritative.
- Client menampilkan snapshot stok terakhir saat offline.

---

### 6. GPS, Geofence, Absensi Wajah

#### Radius Customizable

Prioritas radius:

1. `outlets.geofence_radius_m` jika diisi.
2. `app_settings.default_geofence_radius_m` jika outlet tidak punya override.
3. Fallback hardcoded hanya untuk development.

#### Validasi Lokasi

- Client menghitung jarak cepat dengan Haversine untuk UX.
- Server menghitung ulang untuk validasi final.
- Lokasi dinilai valid jika:
  - GPS permission granted,
  - accuracy <= `max_gps_accuracy_m`,
  - distance <= radius aktif.

#### Foto Wajah

MVP:
- kamera depan wajib untuk absensi,
- deteksi ada wajah pada foto,
- simpan foto + metadata GPS,
- flag `manual_review` jika tidak ada wajah/akurasi buruk.

Phase lanjutan:
- enrollment foto referensi user,
- face embedding/matching,
- liveness detection lebih kuat,
- kebijakan retensi data biometrik.

---

### 7. Tahapan Implementasi

#### Phase 1 — Foundation Monorepo

- Buat Vite React TypeScript di `apps/web`.
- Buat Node.js TypeScript API di `apps/api`.
- Buat package `packages/db` untuk Drizzle ORM.
- Buat package `packages/shared`.
- Setup Tailwind CSS.
- Setup PWA plugin.
- Setup PostgreSQL docker compose.
- Buat dokumentasi `docs/folder-mapping.md`.

#### Phase 2 — Database & ORM

- Implement Drizzle schema PostgreSQL.
- Generate SQL migration awal.
- Seed roles dan app settings.
- Dokumentasi `docs/database-schema.md`.

#### Phase 3 — Auth, Session, Role Guard

- Login normal.
- Session refresh.
- Role guard frontend/backend.
- Menu berdasarkan role.

#### Phase 4 — Attendance, Camera & GPS

- Kamera depan untuk absensi.
- Face detection adapter.
- GPS capture.
- Geofence validation.
- Offline attendance queue.

#### Phase 5 — Outlet & Visit

- Outlet assignment.
- Outlet registration + foto toko.
- Check-in/check-out outlet.
- Target 20 outlet/hari dari setting.

#### Phase 6 — Transactions, Inventory, Approval

- Draft transaksi offline.
- Foto nota wajib.
- Approval supervisor/admin.
- Stock movement saat validated.

#### Phase 7 — Receivable, Consignment, Deposit

- Piutang dan konsinyasi >30 hari.
- Setoran harian.
- Rekonsiliasi.

#### Phase 8 — Reports & Polish

- Dashboard role-based.
- Reports.
- UX premium mobile-first.
- PWA install/refresh/offline polish.

## Verification Plan

### Automated Tests

- `pnpm lint`
- `pnpm typecheck`
- `pnpm --filter @mahasura/db db:generate`
- `pnpm --filter @mahasura/db db:migrate`
- Unit test untuk:
  - Haversine/geofence,
  - payment method validation,
  - sync idempotency,
  - status transition transaksi/stok.

### Manual Verification

- Jalankan PostgreSQL lokal.
- Jalankan API dan web.
- Install PWA di mobile browser.
- Test absensi dengan kamera depan + GPS.
- Test check-in outlet dalam/luar radius.
- Test mode offline: absensi, visit, transaksi, foto nota.
- Online kembali: queue tersinkron tanpa duplikasi.
- Test radius bisa diubah dari setting/outlet.
- Test konsinyasi diblokir untuk End User.
- Test approval memotong stok.

## Next Step Setelah Approval

Jika rencana ini disetujui, saya akan mulai eksekusi Phase 1 dan Phase 2:

1. Inisialisasi monorepo TypeScript.
2. Buat Vite React TypeScript PWA di `apps/web`.
3. Setup Tailwind CSS.
4. Buat API Node.js TypeScript di `apps/api`.
5. Setup Drizzle ORM PostgreSQL di `packages/db`.
6. Buat schema dan migration awal.
7. Buat `docs/folder-mapping.md` dan `docs/database-schema.md`.
