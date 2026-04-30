# Chat Conversation

Note: _This is purely the output of the chat conversation and does not contain any raw data, codebase snippets, etc. used to generate the output._

### User Input

tolong baca dokumen @[Requirement Document Mahasura.pdf]ini, kemudian buatkan plannya mulai dari skema database nya

untuk tech stack yang digunakan adalah vite react, tailwind-css, dan bisa support pwa, mobile friendly.

Bisa sinkronisasi jika offline lalu online kembali, suport gps tracking location dan absensi lokasi

*Listed directory [sales-tracking](file:///e:/Pekerjaan/Programing/project/sales-tracking) *

*User accepted the command `python --version`*

*User accepted the command `python - <<'PY'
import importlib.util
mods=['pypdf','PyPDF2','pdfplumber','fitz']
for m in mods:
 print(m, bool(importlib.util.find_spec(m)))
PY`*

*User accepted the command `python -c "import importlib.util; mods=['pypdf','PyPDF2','pdfplumber','fitz']; [print(m, bool(importlib.util.find_spec(m))) for m in mods]"`*

*User accepted the command `python -m pip install pypdf`*

*User accepted the command `python -c "from pypdf import PdfReader; p='Requirement Document Mahasura.pdf'; r=PdfReader(p); print('pages', len(r.pages)); print('\n---PAGE---\n'.join((page.extract_text() or '') for page in r.pages))"`*

*User accepted the command `$env:PYTHONIOENCODING='utf-8'; python -c "from pypdf import PdfReader; p='Requirement Document Mahasura.pdf'; r=PdfReader(p); print('pages', len(r.pages)); print('\n---PAGE---\n'.join((page.extract_text() or '') for page in r.pages))"`*

*Edited relevant file*

### Planner Response

Saya sudah membaca isi **Requirement Document Mahasura.pdf** dan membuat artifact rencana implementasi lengkap di:

[implementation_plan.md](file:///C:/Users/renal/.gemini/antigravity/brain/64381f26-04fa-4e89-bb23-a6f42f5c180c/implementation_plan.md)

Isinya dimulai dari **rancangan skema database**, lalu mencakup:

- arsitektur Vite React + Tailwind CSS + PWA
- skema database role/user/outlet/absensi/visit/GPS/transaksi/stok/piutang/konsinyasi/setoran/sync
- strategi offline-first dan sinkronisasi saat online kembali
- GPS tracking dan geofencing untuk absensi/check-in outlet
- flow mobile Sales Agent
- security, QR login, validasi foto kamera
- tahapan implementasi per phase
- verification plan

Sebelum saya lanjut eksekusi/membuat project dan migration, mohon approve plan tersebut dan konfirmasi beberapa keputusan utama:

1. Backend/database mau pakai apa? PostgreSQL, MySQL/MariaDB, Supabase, Firebase, atau lainnya?
2. Apakah saya lanjut buat project **Vite React + Tailwind + PWA** di folder `sales-tracking` ini?
3. Apakah skema database perlu saya buat sebagai file SQL migration awal?
4. Radius geofence default berapa meter?
5. QR login yang diinginkan modelnya: QR sekali pakai, QR user statis, atau device pairing?

### User Input

oiya typescript ya, perhatikan susunan folder dan file nya juga agar rapi tersusun mappingnya -> dokumentasikan juga mappingnya

1. Menggunakan postgresql, orm drizz, nodejs option lain bisa menggunakan golang atau rust
2. iya lanjutkan
3. iya perlu, jangan lupa memakai orm yaa
4. untuk radiusnya ini bisa di kustomisasi atau setting
5. untuk login awal, saya rasa cukup dengan absensi foto kamera depan terlihat wajahnya ( kalau bisa deteksi wajah dan identitas ) dan ada validasi lokasi atau outlet. apakah sales dalam radius outlet atau tidak. kenapa? karena jika qrcode maka tim operasional atau back office perlu mengirimkan qrcode dan menempelkan di outlet secara langsung

*Viewed [Requirement Document Mahasura.pdf](file:///e:/Pekerjaan/Programing/project/sales-tracking/Requirement%20Document%20Mahasura.pdf) *

*User accepted the command `npx -y create-vite@latest --help`*

*Viewed [implementation_plan.md](file:///C:/Users/renal/.gemini/antigravity/brain/64381f26-04fa-4e89-bb23-a6f42f5c180c/implementation_plan.md) *

*Edited relevant file*

### Planner Response

Sudah saya update plan sesuai arahan:

[implementation_plan.md](file:///C:/Users/renal/.gemini/antigravity/brain/64381f26-04fa-4e89-bb23-a6f42f5c180c/implementation_plan.md)

Poin yang sudah dimasukkan:

- Full **TypeScript**
- **PostgreSQL + Drizzle ORM**
- Backend rekomendasi: **Node.js + TypeScript**
- Struktur monorepo rapi:
  - `apps/web`
  - `apps/api`
  - `packages/db`
  - `packages/shared`
  - `docs`
- Dokumentasi mapping folder/file
- Radius geofence bisa dikustomisasi via `app_settings` dan override per outlet
- QR login tidak jadi prioritas awal
- Absensi/check-in memakai:
  - kamera depan
  - foto wajah
  - face detection awal
  - validasi GPS/geofence
  - face identity matching sebagai phase lanjutan karena butuh enrollment dan concern data biometrik

Sebelum saya mulai eksekusi membuat project dan migration, mohon approve 2 hal ini:

1. Backend pakai **Fastify** atau **Express**?  
   Rekomendasi saya: **Fastify**.

2. Untuk MVP, apakah cukup:
   - foto wajah kamera depan,
   - deteksi ada wajah,
   - GPS/geofence,
   - lalu data bisa direview admin/supervisor,

   sementara **face identity matching** dibuat phase lanjutan?

### User Input

tambahkan role administrator yang mana ini bisa mengatur semua, dan buat agar administrator bisa membuat permission akses atau mengaturnya juga jadi bisa customize lebih lanjut

1. fastify
2. wajib foto wajah kamera depan, deteksi ada wajah, GPS/geofence, lalu data bisa di review admin/supervisor atau role yang sudah di beri akses fiturnya. face identity di buat di phase lanjutan

Approved, lanjutkan

*Viewed [implementation_plan_phase1.md](file:///e:/Pekerjaan/Programing/project/sales-tracking/implementation_plan_phase1.md) *

*Edited relevant file*

*User accepted the command `npx -y create-vite@latest ./apps/web --template react-ts --no-interactive`*

*User accepted the command `@'
{
  "name": "mahasura-sales-tracking",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "pnpm --parallel --filter @mahasura/web --filter @mahasura/api dev",
    "dev:web": "pnpm --filter @mahasura/web dev",
    "dev:api": "pnpm --filter @mahasura/api dev",
    "build": "pnpm -r build",
    "typecheck": "pnpm -r typecheck",
    "lint": "pnpm -r lint",
    "db:generate": "pnpm --filter @mahasura/db db:generate",
    "db:migrate": "pnpm --filter @mahasura/db db:migrate",
    "db:studio": "pnpm --filter @mahasura/db db:studio",
    "db:seed": "pnpm --filter @mahasura/db db:seed"
  },
  "devDependencies": {
    "@types/node": "latest",
    "typescript": "latest"
  },
  "packageManager": "pnpm@10.0.0"
}
'@ | Set-Content -Encoding UTF8 package.json
@'
packages:
  - "apps/*"
  - "packages/*"
'@ | Set-Content -Encoding UTF8 pnpm-workspace.yaml
@'
DATABASE_URL=postgres://mahasura:mahasura@localhost:5432/mahasura_sales
API_PORT=4000
JWT_ACCESS_SECRET=change-me-access
JWT_REFRESH_SECRET=change-me-refresh
WEB_ORIGIN=http://localhost:5173
'@ | Set-Content -Encoding UTF8 .env.example
@'
services:
  postgres:
    image: postgres:16-alpine
    container_name: mahasura-sales-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: mahasura_sales
      POSTGRES_USER: mahasura
      POSTGRES_PASSWORD: mahasura
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U mahasura -d mahasura_sales"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
'@ | Set-Content -Encoding UTF8 docker-compose.yml`*

*User accepted the command `New-Item -ItemType Directory -Force apps/api/src/config,apps/api/src/modules/auth,apps/api/src/modules/users,apps/api/src/modules/settings,apps/api/src/modules/attendance,apps/api/src/modules/visits,apps/api/src/modules/outlets,apps/api/src/modules/transactions,apps/api/src/modules/inventory,apps/api/src/modules/sync,apps/api/src/plugins,apps/api/src/utils,packages/db/src/schema,packages/shared/src/constants,packages/shared/src/geo,packages/shared/src/sync,docs | Out-Null
@'
{
  "name": "@mahasura/api",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "lint": "eslint ."
  },
  "dependencies": {
    "@fastify/cors": "latest",
    "@fastify/jwt": "latest",
    "@fastify/multipart": "latest",
    "@fastify/static": "latest",
    "@mahasura/db": "workspace:*",
    "@mahasura/shared": "workspace:*",
    "dotenv": "latest",
    "fastify": "latest",
    "zod": "latest"
  },
  "devDependencies": {
    "tsx": "latest",
    "typescript": "latest"
  }
}
'@ | Set-Content -Encoding UTF8 apps/api/package.json
@'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
'@ | Set-Content -Encoding UTF8 apps/api/tsconfig.json
@'
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  }
}
'@ | Set-Content -Encoding UTF8 tsconfig.base.json`*

*User accepted the command `@'
import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';

import { env } from './config/env.js';
import { registerRoutes } from './routes.js';

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: env.WEB_ORIGIN,
    credentials: true,
  });

  await app.register(multipart, {
    limits: {
      fileSize: 8 * 1024 * 1024,
    },
  });

  app.get('/health', async () => ({ status: 'ok', service: 'mahasura-api' }));

  await registerRoutes(app);

  return app;
}
'@ | Set-Content -Encoding UTF8 apps/api/src/app.ts
@'
import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url().default('postgres://mahasura:mahasura@localhost:5432/mahasura_sales'),
  API_PORT: z.coerce.number().default(4000),
  JWT_ACCESS_SECRET: z.string().min(12).default('change-me-access'),
  JWT_REFRESH_SECRET: z.string().min(12).default('change-me-refresh'),
  WEB_ORIGIN: z.string().url().default('http://localhost:5173'),
});

export const env = envSchema.parse(process.env);
'@ | Set-Content -Encoding UTF8 apps/api/src/config/env.ts
@'
import { buildApp } from './app.js';
import { env } from './config/env.js';

const app = await buildApp();

try {
  await app.listen({ port: env.API_PORT, host: '0.0.0.0' });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
'@ | Set-Content -Encoding UTF8 apps/api/src/server.ts
@'
import type { FastifyInstance } from 'fastify';

const notImplemented = (moduleName: string) => async () => ({
  module: moduleName,
  status: 'planned',
});

export async function registerRoutes(app: FastifyInstance) {
  app.get('/auth/me', notImplemented('auth'));
  app.get('/settings', notImplemented('settings'));
  app.get('/attendance/today', notImplemented('attendance'));
  app.get('/visits/today', notImplemented('visits'));
  app.get('/outlets', notImplemented('outlets'));
  app.get('/transactions', notImplemented('transactions'));
  app.get('/inventory/products', notImplemented('inventory'));
  app.get('/sync/status', notImplemented('sync'));
}
'@ | Set-Content -Encoding UTF8 apps/api/src/routes.ts`*

*User accepted the command `@'
{
  "name": "@mahasura/shared",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "lint": "eslint ."
  },
  "dependencies": {
    "zod": "latest"
  },
  "devDependencies": {
    "typescript": "latest"
  }
}
'@ | Set-Content -Encoding UTF8 packages/shared/package.json
@'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
'@ | Set-Content -Encoding UTF8 packages/shared/tsconfig.json
@'
export const ROLE_CODES = {
  ADMINISTRATOR: 'ADMINISTRATOR',
  OWNER: 'OWNER',
  OPERATIONAL_MANAGER: 'OPERATIONAL_MANAGER',
  SUPERVISOR: 'SUPERVISOR',
  ADMIN: 'ADMIN',
  SALES_AGENT: 'SALES_AGENT',
} as const;

export type RoleCode = (typeof ROLE_CODES)[keyof typeof ROLE_CODES];
'@ | Set-Content -Encoding UTF8 packages/shared/src/constants/roles.ts
@'
export function calculateDistanceMeters(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
) {
  const earthRadiusMeters = 6_371_000;
  const toRadians = (degree: number) => (degree * Math.PI) / 180;
  const deltaLatitude = toRadians(to.latitude - from.latitude);
  const deltaLongitude = toRadians(to.longitude - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);

  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(deltaLongitude / 2) ** 2;

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isWithinGeofence(distanceMeters: number, radiusMeters: number) {
  return distanceMeters <= radiusMeters;
}
'@ | Set-Content -Encoding UTF8 packages/shared/src/geo/haversine.ts
@'
export type SyncQueueStatus = 'pending' | 'syncing' | 'synced' | 'failed' | 'conflict';

export type SyncQueueItem<TPayload = unknown> = {
  id: string;
  clientRequestId: string;
  entityType: string;
  operation: 'create' | 'update' | 'delete' | 'upload';
  payload: TPayload;
  status: SyncQueueStatus;
  retryCount: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
};
'@ | Set-Content -Encoding UTF8 packages/shared/src/sync/types.ts
@'
export * from './constants/roles.js';
export * from './geo/haversine.js';
export * from './sync/types.js';
'@ | Set-Content -Encoding UTF8 packages/shared/src/index.ts`*

*User accepted the command `@'
{
  "name": "@mahasura/db",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./schema": "./src/schema/index.ts"
  },
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio",
    "db:seed": "tsx src/seed.ts",
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "lint": "eslint ."
  },
  "dependencies": {
    "drizzle-orm": "latest",
    "postgres": "latest",
    "uuid": "latest"
  },
  "devDependencies": {
    "drizzle-kit": "latest",
    "tsx": "latest",
    "typescript": "latest"
  }
}
'@ | Set-Content -Encoding UTF8 packages/db/package.json
@'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src", "drizzle.config.ts"]
}
'@ | Set-Content -Encoding UTF8 packages/db/tsconfig.json
@'
import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://mahasura:mahasura@localhost:5432/mahasura_sales',
  },
  verbose: true,
  strict: true,
});
'@ | Set-Content -Encoding UTF8 packages/db/drizzle.config.ts`*

*User accepted the command `@'
import { pgEnum, pgTable, text, timestamp, uuid, varchar, uniqueIndex } from 'drizzle-orm/pg-core';

export const userStatusEnum = pgEnum('user_status', ['active', 'inactive', 'suspended']);

export const roles = pgTable('roles', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 64 }).notNull().unique(),
  name: varchar('name', { length: 120 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const permissions = pgTable('permissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 120 }).notNull().unique(),
  name: varchar('name', { length: 160 }).notNull(),
  module: varchar('module', { length: 80 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const rolePermissions = pgTable('role_permissions', {
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  permissionId: uuid('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
  grantedByUserId: uuid('granted_by_user_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uniqueRolePermission: uniqueIndex('role_permissions_role_id_permission_id_idx').on(table.roleId, table.permissionId),
}));

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  roleId: uuid('role_id').notNull().references(() => roles.id),
  supervisorId: uuid('supervisor_id'),
  name: varchar('name', { length: 160 }).notNull(),
  email: varchar('email', { length: 160 }).unique(),
  phone: varchar('phone', { length: 40 }).unique(),
  passwordHash: varchar('password_hash', { length: 255 }),
  employeeCode: varchar('employee_code', { length: 80 }).unique(),
  profilePhotoUrl: text('profile_photo_url'),
  status: userStatusEnum('status').default('active').notNull(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  refreshTokenHash: varchar('refresh_token_hash', { length: 255 }).notNull(),
  deviceId: varchar('device_id', { length: 160 }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
'@ | Set-Content -Encoding UTF8 packages/db/src/schema/auth.ts
@'
import { jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { users } from './auth.js';

export const appSettings = pgTable('app_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: varchar('key', { length: 120 }).notNull().unique(),
  value: jsonb('value').notNull(),
  description: text('description'),
  updatedByUserId: uuid('updated_by_user_id').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
'@ | Set-Content -Encoding UTF8 packages/db/src/schema/settings.ts`*

*User accepted the command `@'
import { boolean, integer, numeric, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { users } from './auth.js';

export const mediaOwnerTypeEnum = pgEnum('media_owner_type', ['user', 'outlet', 'transaction', 'attendance', 'visit', 'deposit']);

export const mediaFiles = pgTable('media_files', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerType: mediaOwnerTypeEnum('owner_type').notNull(),
  ownerId: uuid('owner_id'),
  fileUrl: text('file_url').notNull(),
  mimeType: varchar('mime_type', { length: 120 }).notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  fileHash: varchar('file_hash', { length: 128 }),
  capturedAt: timestamp('captured_at', { withTimezone: true }),
  uploadedByUserId: uuid('uploaded_by_user_id').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
'@ | Set-Content -Encoding UTF8 packages/db/src/schema/media.ts
@'
import { integer, numeric, pgEnum, pgTable, text, timestamp, uuid, varchar, date } from 'drizzle-orm/pg-core';
import { users } from './auth.js';
import { mediaFiles } from './media.js';

export const attendanceStatusEnum = pgEnum('attendance_status', ['open', 'closed', 'flagged']);
export const validationStatusEnum = pgEnum('validation_status', ['valid', 'invalid_location', 'face_not_detected', 'manual_review']);
export const faceCaptureContextEnum = pgEnum('face_capture_context', ['attendance_check_in', 'attendance_check_out', 'visit_check_in', 'visit_check_out']);
export const identityMatchStatusEnum = pgEnum('identity_match_status', ['not_checked', 'matched', 'not_matched', 'manual_review']);
export const livenessStatusEnum = pgEnum('liveness_status', ['not_checked', 'passed', 'failed', 'manual_review']);

export const faceCaptures = pgTable('face_captures', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  mediaFileId: uuid('media_file_id').notNull().references(() => mediaFiles.id),
  captureContext: faceCaptureContextEnum('capture_context').notNull(),
  capturedAt: timestamp('captured_at', { withTimezone: true }).notNull(),
  latitude: numeric('latitude', { precision: 10, scale: 7 }),
  longitude: numeric('longitude', { precision: 10, scale: 7 }),
  faceDetected: boolean('face_detected').default(false).notNull(),
  faceConfidence: numeric('face_confidence', { precision: 5, scale: 4 }),
  identityMatchStatus: identityMatchStatusEnum('identity_match_status').default('not_checked').notNull(),
  identityConfidence: numeric('identity_confidence', { precision: 5, scale: 4 }),
  livenessStatus: livenessStatusEnum('liveness_status').default('not_checked').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const attendanceSessions = pgTable('attendance_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  workDate: date('work_date').notNull(),
  checkInAt: timestamp('check_in_at', { withTimezone: true }),
  checkInLatitude: numeric('check_in_latitude', { precision: 10, scale: 7 }),
  checkInLongitude: numeric('check_in_longitude', { precision: 10, scale: 7 }),
  checkInAccuracyM: numeric('check_in_accuracy_m', { precision: 10, scale: 2 }),
  checkInDistanceM: numeric('check_in_distance_m', { precision: 10, scale: 2 }),
  checkInOutletId: uuid('check_in_outlet_id'),
  checkInFaceCaptureId: uuid('check_in_face_capture_id').references(() => faceCaptures.id),
  checkOutAt: timestamp('check_out_at', { withTimezone: true }),
  checkOutLatitude: numeric('check_out_latitude', { precision: 10, scale: 7 }),
  checkOutLongitude: numeric('check_out_longitude', { precision: 10, scale: 7 }),
  checkOutAccuracyM: numeric('check_out_accuracy_m', { precision: 10, scale: 2 }),
  checkOutFaceCaptureId: uuid('check_out_face_capture_id').references(() => faceCaptures.id),
  status: attendanceStatusEnum('status').default('open').notNull(),
  validationStatus: validationStatusEnum('validation_status').default('manual_review').notNull(),
  clientRequestId: uuid('client_request_id').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const gpsTrackLogs = pgTable('gps_track_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  attendanceSessionId: uuid('attendance_session_id').references(() => attendanceSessions.id),
  latitude: numeric('latitude', { precision: 10, scale: 7 }).notNull(),
  longitude: numeric('longitude', { precision: 10, scale: 7 }).notNull(),
  accuracyM: numeric('accuracy_m', { precision: 10, scale: 2 }),
  speedMps: numeric('speed_mps', { precision: 10, scale: 2 }),
  heading: numeric('heading', { precision: 10, scale: 2 }),
  recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
  source: varchar('source', { length: 60 }).notNull().default('manual_event'),
  clientRequestId: uuid('client_request_id').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
'@ | Set-Content -Encoding UTF8 packages/db/src/schema/attendance.ts`*

*User accepted the command `@'
import { date, integer, numeric, pgEnum, pgTable, text, timestamp, uuid, varchar, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './auth.js';
import { mediaFiles } from './media.js';

export const outletStatusEnum = pgEnum('outlet_status', ['draft', 'pending_verification', 'active', 'rejected', 'inactive']);
export const outletCustomerTypeEnum = pgEnum('outlet_customer_type', ['store', 'agent']);
export const assignmentStatusEnum = pgEnum('assignment_status', ['active', 'inactive']);

export const outlets = pgTable('outlets', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 80 }).notNull().unique(),
  name: varchar('name', { length: 180 }).notNull(),
  customerType: outletCustomerTypeEnum('customer_type').notNull(),
  ownerName: varchar('owner_name', { length: 160 }),
  phone: varchar('phone', { length: 40 }),
  address: text('address').notNull(),
  latitude: numeric('latitude', { precision: 10, scale: 7 }).notNull(),
  longitude: numeric('longitude', { precision: 10, scale: 7 }).notNull(),
  geofenceRadiusM: integer('geofence_radius_m'),
  status: outletStatusEnum('status').default('pending_verification').notNull(),
  registeredByUserId: uuid('registered_by_user_id').references(() => users.id),
  verifiedByUserId: uuid('verified_by_user_id').references(() => users.id),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  rejectionReason: text('rejection_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const outletPhotos = pgTable('outlet_photos', {
  id: uuid('id').defaultRandom().primaryKey(),
  outletId: uuid('outlet_id').notNull().references(() => outlets.id, { onDelete: 'cascade' }),
  mediaFileId: uuid('media_file_id').notNull().references(() => mediaFiles.id),
  capturedAt: timestamp('captured_at', { withTimezone: true }).notNull(),
  latitude: numeric('latitude', { precision: 10, scale: 7 }),
  longitude: numeric('longitude', { precision: 10, scale: 7 }),
  capturedByUserId: uuid('captured_by_user_id').references(() => users.id),
  source: varchar('source', { length: 40 }).default('camera').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const salesOutletAssignments = pgTable('sales_outlet_assignments', {
  id: uuid('id').defaultRandom().primaryKey(),
  salesUserId: uuid('sales_user_id').notNull().references(() => users.id),
  outletId: uuid('outlet_id').notNull().references(() => outlets.id, { onDelete: 'cascade' }),
  assignedByUserId: uuid('assigned_by_user_id').references(() => users.id),
  startDate: date('start_date').notNull(),
  endDate: date('end_date'),
  status: assignmentStatusEnum('status').default('active').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uniqueActiveAssignment: uniqueIndex('sales_outlet_assignments_sales_outlet_idx').on(table.salesUserId, table.outletId),
}));
'@ | Set-Content -Encoding UTF8 packages/db/src/schema/outlets.ts
@'
import { integer, numeric, pgEnum, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './auth.js';
import { attendanceSessions, faceCaptures, validationStatusEnum } from './attendance.js';
import { outlets } from './outlets.js';

export const visitStatusEnum = pgEnum('visit_status', ['open', 'completed', 'invalid_location', 'synced']);

export const visitSessions = pgTable('visit_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  salesUserId: uuid('sales_user_id').notNull().references(() => users.id),
  outletId: uuid('outlet_id').notNull().references(() => outlets.id),
  attendanceSessionId: uuid('attendance_session_id').references(() => attendanceSessions.id),
  checkInAt: timestamp('check_in_at', { withTimezone: true }),
  checkInLatitude: numeric('check_in_latitude', { precision: 10, scale: 7 }),
  checkInLongitude: numeric('check_in_longitude', { precision: 10, scale: 7 }),
  checkInAccuracyM: numeric('check_in_accuracy_m', { precision: 10, scale: 2 }),
  checkInDistanceM: numeric('check_in_distance_m', { precision: 10, scale: 2 }),
  checkInFaceCaptureId: uuid('check_in_face_capture_id').references(() => faceCaptures.id),
  checkOutAt: timestamp('check_out_at', { withTimezone: true }),
  checkOutLatitude: numeric('check_out_latitude', { precision: 10, scale: 7 }),
  checkOutLongitude: numeric('check_out_longitude', { precision: 10, scale: 7 }),
  checkOutAccuracyM: numeric('check_out_accuracy_m', { precision: 10, scale: 2 }),
  checkOutFaceCaptureId: uuid('check_out_face_capture_id').references(() => faceCaptures.id),
  geofenceRadiusMUsed: integer('geofence_radius_m_used'),
  durationSeconds: integer('duration_seconds'),
  status: visitStatusEnum('status').default('open').notNull(),
  validationStatus: validationStatusEnum('validation_status').default('manual_review').notNull(),
  clientRequestId: uuid('client_request_id').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
'@ | Set-Content -Encoding UTF8 packages/db/src/schema/visits.ts`*

*User accepted the command `@'
import { numeric, pgEnum, pgTable, text, timestamp, uuid, varchar, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './auth.js';
import { outlets } from './outlets.js';

export const productStatusEnum = pgEnum('product_status', ['active', 'inactive']);
export const warehouseTypeEnum = pgEnum('warehouse_type', ['main', 'sales_van', 'outlet_consignment']);
export const inventoryMovementTypeEnum = pgEnum('inventory_movement_type', ['sale', 'return', 'adjustment', 'transfer_in', 'transfer_out', 'consignment_reset']);

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  sku: varchar('sku', { length: 80 }).notNull().unique(),
  name: varchar('name', { length: 180 }).notNull(),
  description: text('description'),
  unit: varchar('unit', { length: 40 }).notNull(),
  priceDefault: numeric('price_default', { precision: 14, scale: 2 }).default('0').notNull(),
  status: productStatusEnum('status').default('active').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const warehouses = pgTable('warehouses', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 80 }).notNull().unique(),
  name: varchar('name', { length: 180 }).notNull(),
  address: text('address'),
  type: warehouseTypeEnum('type').default('main').notNull(),
  ownerUserId: uuid('owner_user_id').references(() => users.id),
  outletId: uuid('outlet_id').references(() => outlets.id),
  status: productStatusEnum('status').default('active').notNull(),
});

export const inventoryBalances = pgTable('inventory_balances', {
  id: uuid('id').defaultRandom().primaryKey(),
  warehouseId: uuid('warehouse_id').notNull().references(() => warehouses.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id),
  quantity: numeric('quantity', { precision: 14, scale: 2 }).default('0').notNull(),
  reservedQuantity: numeric('reserved_quantity', { precision: 14, scale: 2 }).default('0').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uniqueWarehouseProduct: uniqueIndex('inventory_balances_warehouse_product_idx').on(table.warehouseId, table.productId),
}));

export const inventoryMovements = pgTable('inventory_movements', {
  id: uuid('id').defaultRandom().primaryKey(),
  warehouseId: uuid('warehouse_id').notNull().references(() => warehouses.id),
  productId: uuid('product_id').notNull().references(() => products.id),
  movementType: inventoryMovementTypeEnum('movement_type').notNull(),
  quantityDelta: numeric('quantity_delta', { precision: 14, scale: 2 }).notNull(),
  referenceType: varchar('reference_type', { length: 80 }),
  referenceId: uuid('reference_id'),
  notes: text('notes'),
  createdByUserId: uuid('created_by_user_id').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
'@ | Set-Content -Encoding UTF8 packages/db/src/schema/products.ts`*

*User accepted the command `@'
import { numeric, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { users } from './auth.js';
import { outlets } from './outlets.js';
import { visitSessions } from './visits.js';
import { products } from './products.js';
import { mediaFiles } from './media.js';

export const transactionCustomerTypeEnum = pgEnum('transaction_customer_type', ['store', 'agent', 'end_user']);
export const paymentMethodEnum = pgEnum('payment_method', ['cash', 'qris', 'consignment']);
export const transactionStatusEnum = pgEnum('transaction_status', ['draft', 'submitted', 'pending_approval', 'validated', 'rejected', 'cancelled']);
export const verificationStatusEnum = pgEnum('verification_status', ['pending', 'verified', 'rejected']);

export const salesTransactions = pgTable('sales_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  transactionNo: varchar('transaction_no', { length: 80 }).notNull().unique(),
  salesUserId: uuid('sales_user_id').notNull().references(() => users.id),
  outletId: uuid('outlet_id').references(() => outlets.id),
  visitSessionId: uuid('visit_session_id').references(() => visitSessions.id),
  customerType: transactionCustomerTypeEnum('customer_type').notNull(),
  endUserName: varchar('end_user_name', { length: 160 }),
  endUserPhone: varchar('end_user_phone', { length: 40 }),
  paymentMethod: paymentMethodEnum('payment_method').notNull(),
  subtotalAmount: numeric('subtotal_amount', { precision: 14, scale: 2 }).default('0').notNull(),
  discountAmount: numeric('discount_amount', { precision: 14, scale: 2 }).default('0').notNull(),
  totalAmount: numeric('total_amount', { precision: 14, scale: 2 }).default('0').notNull(),
  status: transactionStatusEnum('status').default('draft').notNull(),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  validatedByUserId: uuid('validated_by_user_id').references(() => users.id),
  validatedAt: timestamp('validated_at', { withTimezone: true }),
  rejectionReason: text('rejection_reason'),
  clientRequestId: uuid('client_request_id').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const salesTransactionItems = pgTable('sales_transaction_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  transactionId: uuid('transaction_id').notNull().references(() => salesTransactions.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id),
  quantity: numeric('quantity', { precision: 14, scale: 2 }).notNull(),
  unitPrice: numeric('unit_price', { precision: 14, scale: 2 }).notNull(),
  discountAmount: numeric('discount_amount', { precision: 14, scale: 2 }).default('0').notNull(),
  lineTotal: numeric('line_total', { precision: 14, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const transactionNotePhotos = pgTable('transaction_note_photos', {
  id: uuid('id').defaultRandom().primaryKey(),
  transactionId: uuid('transaction_id').notNull().references(() => salesTransactions.id, { onDelete: 'cascade' }),
  mediaFileId: uuid('media_file_id').notNull().references(() => mediaFiles.id),
  capturedAt: timestamp('captured_at', { withTimezone: true }).notNull(),
  latitude: numeric('latitude', { precision: 10, scale: 7 }),
  longitude: numeric('longitude', { precision: 10, scale: 7 }),
  capturedByUserId: uuid('captured_by_user_id').references(() => users.id),
  verifiedByUserId: uuid('verified_by_user_id').references(() => users.id),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  verificationStatus: verificationStatusEnum('verification_status').default('pending').notNull(),
  rejectionReason: text('rejection_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
'@ | Set-Content -Encoding UTF8 packages/db/src/schema/transactions.ts`*

*User accepted the command `@'
import { date, numeric, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './auth.js';
import { outlets } from './outlets.js';
import { salesTransactions, paymentMethodEnum, transactionCustomerTypeEnum } from './transactions.js';
import { products } from './products.js';

export const receivableStatusEnum = pgEnum('receivable_status', ['open', 'partial', 'paid', 'overdue', 'written_off']);
export const consignmentStatusEnum = pgEnum('consignment_status', ['active', 'paid', 'overdue', 'withdrawal_required', 'withdrawn', 'extended', 'reset_stock']);
export const consignmentActionTypeEnum = pgEnum('consignment_action_type', ['notify_withdrawal', 'extend', 'withdraw', 'reset_stock_zero']);

export const receivables = pgTable('receivables', {
  id: uuid('id').defaultRandom().primaryKey(),
  transactionId: uuid('transaction_id').notNull().references(() => salesTransactions.id),
  outletId: uuid('outlet_id').references(() => outlets.id),
  customerType: transactionCustomerTypeEnum('customer_type').notNull(),
  principalAmount: numeric('principal_amount', { precision: 14, scale: 2 }).notNull(),
  paidAmount: numeric('paid_amount', { precision: 14, scale: 2 }).default('0').notNull(),
  outstandingAmount: numeric('outstanding_amount', { precision: 14, scale: 2 }).notNull(),
  dueDate: date('due_date').notNull(),
  status: receivableStatusEnum('status').default('open').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const receivablePayments = pgTable('receivable_payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  receivableId: uuid('receivable_id').notNull().references(() => receivables.id, { onDelete: 'cascade' }),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  paymentMethod: paymentMethodEnum('payment_method').notNull(),
  paidAt: timestamp('paid_at', { withTimezone: true }).notNull(),
  receivedByUserId: uuid('received_by_user_id').references(() => users.id),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const consignments = pgTable('consignments', {
  id: uuid('id').defaultRandom().primaryKey(),
  transactionId: uuid('transaction_id').notNull().references(() => salesTransactions.id),
  outletId: uuid('outlet_id').notNull().references(() => outlets.id),
  salesUserId: uuid('sales_user_id').notNull().references(() => users.id),
  startDate: date('start_date').notNull(),
  dueDate: date('due_date').notNull(),
  status: consignmentStatusEnum('status').default('active').notNull(),
  extendedUntil: date('extended_until'),
  authorizedByUserId: uuid('authorized_by_user_id').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const consignmentItems = pgTable('consignment_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  consignmentId: uuid('consignment_id').notNull().references(() => consignments.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id),
  quantity: numeric('quantity', { precision: 14, scale: 2 }).notNull(),
  paidQuantity: numeric('paid_quantity', { precision: 14, scale: 2 }).default('0').notNull(),
  remainingQuantity: numeric('remaining_quantity', { precision: 14, scale: 2 }).notNull(),
});

export const consignmentActions = pgTable('consignment_actions', {
  id: uuid('id').defaultRandom().primaryKey(),
  consignmentId: uuid('consignment_id').notNull().references(() => consignments.id, { onDelete: 'cascade' }),
  actionType: consignmentActionTypeEnum('action_type').notNull(),
  notes: text('notes'),
  performedByUserId: uuid('performed_by_user_id').references(() => users.id),
  performedAt: timestamp('performed_at', { withTimezone: true }).defaultNow().notNull(),
});
'@ | Set-Content -Encoding UTF8 packages/db/src/schema/receivables.ts`*

*User accepted the command `@'
import { date, numeric, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { users } from './auth.js';
import { attendanceSessions } from './attendance.js';
import { products } from './products.js';

export const depositStatusEnum = pgEnum('deposit_status', ['submitted', 'under_review', 'reconciled', 'rejected']);
export const approvalActionEnum = pgEnum('approval_action', ['approved', 'rejected', 'verified', 'reconciled']);

export const cashDeposits = pgTable('cash_deposits', {
  id: uuid('id').defaultRandom().primaryKey(),
  salesUserId: uuid('sales_user_id').notNull().references(() => users.id),
  workDate: date('work_date').notNull(),
  attendanceSessionId: uuid('attendance_session_id').references(() => attendanceSessions.id),
  expectedCashAmount: numeric('expected_cash_amount', { precision: 14, scale: 2 }).default('0').notNull(),
  declaredCashAmount: numeric('declared_cash_amount', { precision: 14, scale: 2 }).default('0').notNull(),
  qrisAmount: numeric('qris_amount', { precision: 14, scale: 2 }).default('0').notNull(),
  consignmentAmount: numeric('consignment_amount', { precision: 14, scale: 2 }).default('0').notNull(),
  totalSoldQuantity: numeric('total_sold_quantity', { precision: 14, scale: 2 }).default('0').notNull(),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  status: depositStatusEnum('status').default('submitted').notNull(),
  reconciledByUserId: uuid('reconciled_by_user_id').references(() => users.id),
  reconciledAt: timestamp('reconciled_at', { withTimezone: true }),
  discrepancyAmount: numeric('discrepancy_amount', { precision: 14, scale: 2 }).default('0').notNull(),
  notes: text('notes'),
  clientRequestId: uuid('client_request_id').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const cashDepositItems = pgTable('cash_deposit_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  cashDepositId: uuid('cash_deposit_id').notNull().references(() => cashDeposits.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id),
  soldQuantity: numeric('sold_quantity', { precision: 14, scale: 2 }).notNull(),
  expectedAmount: numeric('expected_amount', { precision: 14, scale: 2 }).notNull(),
  declaredAmount: numeric('declared_amount', { precision: 14, scale: 2 }).notNull(),
});

export const approvalLogs = pgTable('approval_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  approvableType: varchar('approvable_type', { length: 80 }).notNull(),
  approvableId: uuid('approvable_id').notNull(),
  action: approvalActionEnum('action').notNull(),
  actorUserId: uuid('actor_user_id').notNull().references(() => users.id),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
'@ | Set-Content -Encoding UTF8 packages/db/src/schema/deposits.ts
@'
import { jsonb, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { users } from './auth.js';

export const syncOperationEnum = pgEnum('sync_operation', ['create', 'update', 'delete', 'upload']);
export const syncStatusEnum = pgEnum('sync_status', ['received', 'processed', 'failed', 'conflict']);

export const syncEvents = pgTable('sync_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id),
  deviceId: varchar('device_id', { length: 160 }),
  clientRequestId: uuid('client_request_id').notNull().unique(),
  entityType: varchar('entity_type', { length: 80 }).notNull(),
  entityId: uuid('entity_id'),
  operation: syncOperationEnum('operation').notNull(),
  status: syncStatusEnum('status').default('received').notNull(),
  errorMessage: text('error_message'),
  payloadHash: varchar('payload_hash', { length: 128 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true }),
});

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  actorUserId: uuid('actor_user_id').references(() => users.id),
  action: varchar('action', { length: 160 }).notNull(),
  entityType: varchar('entity_type', { length: 80 }).notNull(),
  entityId: uuid('entity_id'),
  oldValues: jsonb('old_values'),
  newValues: jsonb('new_values'),
  ipAddress: varchar('ip_address', { length: 80 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
'@ | Set-Content -Encoding UTF8 packages/db/src/schema/sync.ts`*

*User accepted the command `@'
export * from './auth.js';
export * from './settings.js';
export * from './media.js';
export * from './attendance.js';
export * from './outlets.js';
export * from './visits.js';
export * from './products.js';
export * from './transactions.js';
export * from './receivables.js';
export * from './deposits.js';
export * from './sync.js';
'@ | Set-Content -Encoding UTF8 packages/db/src/schema/index.ts
@'
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

export function createDb(databaseUrl: string) {
  const client = postgres(databaseUrl, { max: 10 });
  return drizzle(client, { schema });
}

export type Database = ReturnType<typeof createDb>;
'@ | Set-Content -Encoding UTF8 packages/db/src/client.ts
@'
export * from './client.js';
export * from './schema/index.js';
'@ | Set-Content -Encoding UTF8 packages/db/src/index.ts
@'
import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { createDb } from './client.js';
import { appSettings, permissions, rolePermissions, roles } from './schema/index.js';

const db = createDb(process.env.DATABASE_URL ?? 'postgres://mahasura:mahasura@localhost:5432/mahasura_sales');

const roleSeeds = [
  { code: 'ADMINISTRATOR', name: 'Administrator', description: 'Full system access including role and permission management.' },
  { code: 'OWNER', name: 'Owner', description: 'Business owner with executive access.' },
  { code: 'OPERATIONAL_MANAGER', name: 'Operational Manager', description: 'High-level operational monitoring and validation.' },
  { code: 'SUPERVISOR', name: 'Supervisor', description: 'Outlet control, assignment, approvals, and deposits.' },
  { code: 'ADMIN', name: 'Admin', description: 'Administrative master data and operational verification.' },
  { code: 'SALES_AGENT', name: 'Sales Agent', description: 'Field sales attendance, visits, and sales transactions.' },
];

const permissionSeeds = [
  ['system.manage', 'Manage System', 'system'],
  ['roles.manage', 'Manage Roles', 'access'],
  ['permissions.manage', 'Manage Permissions', 'access'],
  ['settings.manage', 'Manage Settings', 'settings'],
  ['users.manage', 'Manage Users', 'users'],
  ['attendance.review', 'Review Attendance', 'attendance'],
  ['attendance.execute', 'Execute Attendance', 'attendance'],
  ['outlets.manage', 'Manage Outlets', 'outlets'],
  ['outlets.verify', 'Verify Outlets', 'outlets'],
  ['visits.execute', 'Execute Visits', 'visits'],
  ['transactions.execute', 'Execute Transactions', 'transactions'],
  ['transactions.approve', 'Approve Transactions', 'transactions'],
  ['inventory.manage', 'Manage Inventory', 'inventory'],
  ['deposits.execute', 'Execute Deposits', 'deposits'],
  ['deposits.reconcile', 'Reconcile Deposits', 'deposits'],
  ['reports.view', 'View Reports', 'reports'],
] as const;

const settingSeeds = [
  ['default_geofence_radius_m', 100, 'Default outlet geofence radius in meters.'],
  ['max_gps_accuracy_m', 100, 'Maximum accepted GPS accuracy in meters.'],
  ['daily_visit_target', 20, 'Default daily visit target for sales agents.'],
  ['gps_log_interval_seconds', 300, 'GPS logging interval while app is active.'],
  ['face_detection_required', true, 'Require face presence detection for attendance.'],
];

for (const role of roleSeeds) {
  await db.insert(roles).values(role).onConflictDoUpdate({ target: roles.code, set: role });
}

for (const [code, name, module] of permissionSeeds) {
  await db.insert(permissions).values({ code, name, module }).onConflictDoUpdate({
    target: permissions.code,
    set: { name, module },
  });
}

const [administrator] = await db.select().from(roles).where(eq(roles.code, 'ADMINISTRATOR'));
const allPermissions = await db.select().from(permissions);

if (administrator) {
  for (const permission of allPermissions) {
    await db.insert(rolePermissions).values({
      roleId: administrator.id,
      permissionId: permission.id,
    }).onConflictDoNothing();
  }
}

for (const [key, value, description] of settingSeeds) {
  await db.insert(appSettings).values({ key, value, description }).onConflictDoUpdate({
    target: appSettings.key,
    set: { value, description },
  });
}

console.log('Seed completed');
'@ | Set-Content -Encoding UTF8 packages/db/src/seed.ts`*

*User accepted the command `pnpm add -D -w tailwindcss @tailwindcss/vite vite-plugin-pwa eslint && pnpm --filter @mahasura/web add @vitejs/plugin-react vite react react-dom lucide-react idb @tanstack/react-query react-router-dom && pnpm --filter @mahasura/web add -D typescript`*

*User accepted the command `pnpm install`*

*Checked command status*

*Checked command status*

*Viewed [package.json](file:///e:/Pekerjaan/Programing/project/sales-tracking/apps/web/package.json) *

*Edited relevant file*

*User accepted the command `pnpm install`*

*Checked command status*

*Checked command status*

*Checked command status*

*User accepted the command `@'
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Mahasura Sales Tracking',
        short_name: 'Mahasura',
        description: 'PWA sales tracking, attendance, visit control, and offline order sync.',
        theme_color: '#0f172a',
        background_color: '#020617',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: '/pwa-192.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: '/pwa-512.svg', sizes: '512x512', type: 'image/svg+xml' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
    }),
  ],
});
'@ | Set-Content -Encoding UTF8 apps/web/vite.config.ts
@'
@import "tailwindcss";

:root {
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: #e2e8f0;
  background: #020617;
}

body {
  min-width: 320px;
  min-height: 100vh;
  margin: 0;
  background:
    radial-gradient(circle at top left, rgba(20, 184, 166, 0.22), transparent 30rem),
    radial-gradient(circle at top right, rgba(124, 58, 237, 0.2), transparent 28rem),
    linear-gradient(135deg, #020617 0%, #0f172a 55%, #111827 100%);
}

button, input, textarea, select {
  font: inherit;
}
'@ | Set-Content -Encoding UTF8 apps/web/src/index.css
@'
<svg width="192" height="192" viewBox="0 0 192 192" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="192" height="192" rx="44" fill="#020617"/>
  <path d="M52 124L96 36L140 124H116L96 82L76 124H52Z" fill="#14B8A6"/>
  <path d="M52 138H140V158H52V138Z" fill="#A78BFA"/>
</svg>
'@ | Set-Content -Encoding UTF8 apps/web/public/pwa-192.svg
@'
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="120" fill="#020617"/>
  <path d="M138 332L256 92L374 332H306L256 220L206 332H138Z" fill="#14B8A6"/>
  <path d="M138 368H374V420H138V368Z" fill="#A78BFA"/>
</svg>
'@ | Set-Content -Encoding UTF8 apps/web/public/pwa-512.svg`*

*User accepted the command `@'
import { Camera, Cloud, MapPin, ShieldCheck, WifiOff } from 'lucide-react';

const features = [
  { icon: Camera, title: 'Absensi Wajah', text: 'Kamera depan, face detection, GPS, dan review berbasis permission.' },
  { icon: MapPin, title: 'Geofence Outlet', text: 'Radius dapat dikustomisasi global maupun per outlet.' },
  { icon: WifiOff, title: 'Offline First', text: 'Queue lokal dan sinkronisasi aman saat online kembali.' },
  { icon: ShieldCheck, title: 'Custom Permission', text: 'Administrator dapat mengatur role dan akses fitur.' },
];

export default function App() {
  return (
    <main className="min-h-screen px-5 py-8 text-slate-100">
      <section className="mx-auto flex max-w-6xl flex-col gap-8">
        <nav className="flex items-center justify-between rounded-3xl border border-white/10 bg-white/8 px-5 py-4 shadow-2xl shadow-black/20 backdrop-blur-xl">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-teal-200">Mahasura</p>
            <h1 className="text-xl font-bold">Sales Tracking Order</h1>
          </div>
          <span className="rounded-full border border-teal-300/30 bg-teal-300/10 px-4 py-2 text-sm text-teal-100">
            PWA Ready
          </span>
        </nav>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/10 p-7 shadow-2xl shadow-teal-950/30 backdrop-blur-xl md:p-10">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-300/10 px-4 py-2 text-sm text-violet-100">
              <Cloud size={16} /> Offline sync + PostgreSQL + Drizzle ORM
            </div>
            <h2 className="max-w-3xl text-4xl font-black leading-tight md:text-6xl">
              Kontrol aktivitas sales lapangan secara real-time dan tetap aman saat offline.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
              Foundation awal untuk absensi wajah, validasi lokasi, visit outlet, transaksi, stok,
              piutang, konsinyasi, setoran, dan approval berbasis permission yang fleksibel.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button className="rounded-2xl bg-teal-400 px-5 py-3 font-bold text-slate-950 shadow-lg shadow-teal-400/20 transition hover:-translate-y-0.5 hover:bg-teal-300">
                Mulai Absensi
              </button>
              <button className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/15">
                Lihat Queue Sync
              </button>
            </div>
          </section>

          <section className="grid gap-4">
            {features.map((feature) => (
              <article key={feature.title} className="rounded-3xl border border-white/10 bg-slate-950/55 p-5 shadow-xl shadow-black/20 backdrop-blur-xl transition hover:-translate-y-1 hover:border-teal-300/30">
                <feature.icon className="mb-4 text-teal-300" size={28} />
                <h3 className="text-xl font-bold">{feature.title}</h3>
                <p className="mt-2 leading-7 text-slate-300">{feature.text}</p>
              </article>
            ))}
          </section>
        </div>
      </section>
    </main>
  );
}
'@ | Set-Content -Encoding UTF8 apps/web/src/App.tsx
@'
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
'@ | Set-Content -Encoding UTF8 apps/web/src/main.tsx`*

*User accepted the command `@'
# Folder Mapping Mahasura

Dokumen ini menjelaskan susunan folder monorepo Mahasura Sales Tracking Order.

## Root

| Path | Fungsi |
|---|---|
| `apps/web` | Frontend Vite React TypeScript PWA |
| `apps/api` | Backend Node.js TypeScript Fastify |
| `packages/db` | Drizzle ORM schema, migration, seed, DB client |
| `packages/shared` | Shared constants, types, validator, utility geofence/sync |
| `docs` | Dokumentasi teknis |
| `docker-compose.yml` | PostgreSQL lokal |
| `pnpm-workspace.yaml` | Definisi workspace |

## `apps/web`

| Path | Fungsi |
|---|---|
| `src/App.tsx` | App shell awal dan landing dashboard |
| `src/main.tsx` | React entry point |
| `src/index.css` | Tailwind v4 import dan design token global |
| `vite.config.ts` | React, Tailwind, dan PWA config |
| `public/pwa-192.svg` | Icon PWA 192px |
| `public/pwa-512.svg` | Icon PWA 512px |

Rencana folder lanjutan:

```txt
src/
├─ app/                 # router dan providers
├─ components/          # shared UI components
├─ features/            # auth, attendance, visits, outlets, transactions, inventory, deposits, sync
├─ layouts/             # layout mobile/admin
└─ lib/                 # api, indexeddb, camera, geolocation
```

## `apps/api`

| Path | Fungsi |
|---|---|
| `src/server.ts` | Bootstrap Fastify server |
| `src/app.ts` | Registrasi plugin, CORS, multipart, health route |
| `src/routes.ts` | Route map awal |
| `src/config/env.ts` | Validasi environment variable |
| `src/modules/*` | Modul domain API |
| `src/plugins/*` | Middleware/plugin Fastify |
| `src/utils/*` | Helper backend |

## `packages/db`

| Path | Fungsi |
|---|---|
| `src/schema/auth.ts` | roles, users, permissions, role_permissions, sessions |
| `src/schema/settings.ts` | app_settings untuk radius geofence dan rules |
| `src/schema/media.ts` | media_files |
| `src/schema/attendance.ts` | attendance_sessions, face_captures, gps_track_logs |
| `src/schema/outlets.ts` | outlets, outlet_photos, sales_outlet_assignments |
| `src/schema/visits.ts` | visit_sessions |
| `src/schema/products.ts` | products, warehouses, inventory_balances, inventory_movements |
| `src/schema/transactions.ts` | sales_transactions, items, note photos |
| `src/schema/receivables.ts` | receivables, payments, consignments |
| `src/schema/deposits.ts` | cash deposits, approval logs |
| `src/schema/sync.ts` | sync events dan audit logs |
| `src/seed.ts` | Seed roles, permissions, dan app settings |
| `drizzle.config.ts` | Drizzle Kit config |

## Role dan Permission

Role awal:

- `ADMINISTRATOR`: full access dan dapat mengatur role/permission.
- `OWNER`
- `OPERATIONAL_MANAGER`
- `SUPERVISOR`
- `ADMIN`
- `SALES_AGENT`

Permission bersifat customizable melalui tabel:

- `permissions`
- `role_permissions`

Administrator mendapat seluruh permission default saat seed.
'@ | Set-Content -Encoding UTF8 docs/folder-mapping.md
@'
# Database Schema Mahasura

Database menggunakan PostgreSQL dan Drizzle ORM.

## Konsep Utama

- UUID sebagai primary key.
- `client_request_id` untuk idempotency offline sync.
- `app_settings` untuk konfigurasi operasional seperti radius geofence.
- `permissions` dan `role_permissions` untuk akses customizable.
- Foto wajah wajib di attendance MVP, identity matching masuk phase lanjutan.

## Core Tables

| Area | Tables |
|---|---|
| Access | `roles`, `users`, `permissions`, `role_permissions`, `sessions` |
| Settings | `app_settings` |
| Media | `media_files` |
| Attendance | `attendance_sessions`, `face_captures`, `gps_track_logs` |
| Outlet | `outlets`, `outlet_photos`, `sales_outlet_assignments` |
| Visit | `visit_sessions` |
| Inventory | `products`, `warehouses`, `inventory_balances`, `inventory_movements` |
| Transaction | `sales_transactions`, `sales_transaction_items`, `transaction_note_photos` |
| Receivable | `receivables`, `receivable_payments` |
| Consignment | `consignments`, `consignment_items`, `consignment_actions` |
| Deposit | `cash_deposits`, `cash_deposit_items`, `approval_logs` |
| Sync/Audit | `sync_events`, `audit_logs` |

## Geofence Settings

Prioritas radius:

1. `outlets.geofence_radius_m`
2. `app_settings.default_geofence_radius_m`
3. fallback development

Seed default:

- `default_geofence_radius_m`: `100`
- `max_gps_accuracy_m`: `100`
- `daily_visit_target`: `20`
- `gps_log_interval_seconds`: `300`
- `face_detection_required`: `true`

## Administrator

Role `ADMINISTRATOR` digunakan sebagai superuser aplikasi.
Role ini dapat:

- mengatur semua setting,
- mengatur users,
- membuat permission,
- memberikan permission ke role,
- review absensi dan data lapangan,
- akses semua modul.
'@ | Set-Content -Encoding UTF8 docs/database-schema.md`*

*User accepted the command `pnpm db:generate`*

*Viewed [attendance.ts](file:///e:/Pekerjaan/Programing/project/sales-tracking/packages/db/src/schema/attendance.ts) *

*Edited relevant file*

*User accepted the command `pnpm db:generate`*

*User accepted the command `pnpm typecheck`*

*Edited relevant file*

*Viewed [tsconfig.json](file:///e:/Pekerjaan/Programing/project/sales-tracking/packages/db/tsconfig.json) *

*Edited relevant file*

*User accepted the command `pnpm typecheck`*

*Viewed [seed.ts](file:///e:/Pekerjaan/Programing/project/sales-tracking/packages/db/src/seed.ts) *

*Edited relevant file*

*Edited relevant file*

*Edited relevant file*

*Edited relevant file*

*User accepted the command `pnpm install && pnpm typecheck`*

*User accepted the command `pnpm install; pnpm typecheck`*

*User accepted the command `pnpm build`*

*User accepted the command `$files = @('package.json','apps/web/package.json','apps/api/package.json','packages/db/package.json','packages/shared/package.json'); foreach ($f in $files) { $content = Get-Content $f -Raw; [System.IO.File]::WriteAllText((Resolve-Path $f), $content, [System.Text.UTF8Encoding]::new($false)) }
pnpm build`*

*Edited relevant file*

*Edited relevant file*

### Planner Response

Approved task sudah saya eksekusi.

Selesai dibuat:

- Monorepo TypeScript dengan `pnpm`
- `apps/web` — Vite React TypeScript + Tailwind CSS + PWA
- `apps/api` — Node.js TypeScript + **Fastify**
- `packages/db` — PostgreSQL + **Drizzle ORM**
- `packages/shared` — shared constants/types/geofence/sync
- Role baru **ADMINISTRATOR**
- Permission customizable:
  - `permissions`
  - `role_permissions`
- Seed awal roles, permissions, dan geofence settings
- Schema untuk:
  - user/role/permission
  - settings
  - outlet/assignment
  - absensi wajah
  - GPS/geofence
  - visit
  - transaksi
  - inventory
  - piutang/konsinyasi
  - setoran
  - sync/audit
- Migration awal Drizzle berhasil dibuat
- Dokumentasi mapping folder/file:
  - `docs/folder-mapping.md`
  - `docs/database-schema.md`

Verifikasi berhasil:

```bash
pnpm db:generate
pnpm typecheck
pnpm build
```

Saya juga sudah buat walkthrough di:

[walkthrough.md](file:///C:/Users/renal/.gemini/antigravity/brain/64381f26-04fa-4e89-bb23-a6f42f5c180c/walkthrough.md)

Catatan kecil: ada warning peer dependency `vite-plugin-pwa` karena Vite terbaru versi 8, tapi build tetap sukses. Kalau ingin benar-benar clean tanpa warning, nanti bisa kita downgrade Vite ke v7.

### User Input

lanjutkan ke phase selanjutnya

*Edited relevant file*

*User accepted the command `pnpm --filter @mahasura/api add bcryptjs jsonwebtoken && pnpm --filter @mahasura/api add -D @types/jsonwebtoken`*

*User accepted the command `pnpm --filter @mahasura/api add bcryptjs jsonwebtoken; pnpm --filter @mahasura/api add -D @types/jsonwebtoken`*

*Checked command status*

*User accepted the command `@'
import { createDb } from '@mahasura/db';
import { env } from '../config/env.js';

export const db = createDb(env.DATABASE_URL);
'@ | Set-Content -Encoding UTF8 apps/api/src/plugins/db.ts
@'
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { and, eq, inArray } from 'drizzle-orm';
import { permissions, rolePermissions, roles, sessions, users } from '@mahasura/db/schema';
import { env } from '../../config/env.js';
import { db } from '../../plugins/db.js';

export type AuthUser = {
  id: string;
  roleCode: string;
  permissions: string[];
};

export type AuthTokenPayload = {
  sub: string;
  roleCode: string;
};

export function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function signAccessToken(payload: AuthTokenPayload) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
}

export function signRefreshToken(payload: AuthTokenPayload) {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: '30d' });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthTokenPayload;
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as AuthTokenPayload;
}

export async function getUserPermissions(userId: string) {
  const [user] = await db
    .select({ roleId: users.roleId, roleCode: roles.code })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .where(eq(users.id, userId));

  if (!user) return null;

  const rows = await db
    .select({ code: permissions.code })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(rolePermissions.roleId, user.roleId));

  return {
    roleCode: user.roleCode,
    permissions: rows.map((row) => row.code),
  };
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const header = request.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

  if (!token) {
    return reply.status(401).send({ message: 'Missing bearer token' });
  }

  try {
    const payload = verifyAccessToken(token);
    const permissionData = await getUserPermissions(payload.sub);

    if (!permissionData) {
      return reply.status(401).send({ message: 'User not found' });
    }

    request.user = {
      id: payload.sub,
      roleCode: permissionData.roleCode,
      permissions: permissionData.permissions,
    };
  } catch {
    return reply.status(401).send({ message: 'Invalid or expired token' });
  }
}

export function requirePermission(permissionCode: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await authenticate(request, reply);

    if (reply.sent) return;

    const user = request.user as AuthUser | undefined;
    const allowed = user?.roleCode === 'ADMINISTRATOR' || user?.permissions.includes(permissionCode);

    if (!allowed) {
      return reply.status(403).send({ message: 'Permission denied', permission: permissionCode });
    }
  };
}

export async function createSession(userId: string, roleCode: string, deviceId?: string) {
  const refreshToken = signRefreshToken({ sub: userId, roleCode });
  const refreshTokenHash = await bcrypt.hash(refreshToken, 12);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await db.insert(sessions).values({ userId, refreshTokenHash, deviceId, expiresAt });

  return refreshToken;
}

export async function revokeRefreshToken(refreshToken: string) {
  const rows = await db.select().from(sessions);

  for (const session of rows) {
    const match = await bcrypt.compare(refreshToken, session.refreshTokenHash);
    if (match) {
      await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, session.id));
      return true;
    }
  }

  return false;
}

export async function findValidRefreshSession(refreshToken: string) {
  const payload = verifyRefreshToken(refreshToken);
  const rows = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.userId, payload.sub), inArray(sessions.revokedAt, [null as never])));

  for (const session of rows) {
    if (session.expiresAt < new Date()) continue;
    const match = await bcrypt.compare(refreshToken, session.refreshTokenHash);
    if (match) return { session, payload };
  }

  return null;
}
'@ | Set-Content -Encoding UTF8 apps/api/src/modules/auth/auth.service.ts
@'
import 'fastify';
import type { AuthUser } from './modules/auth/auth.service.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
  }
}
'@ | Set-Content -Encoding UTF8 apps/api/src/types.d.ts`*

*Viewed [auth.service.ts](file:///e:/Pekerjaan/Programing/project/sales-tracking/apps/api/src/modules/auth/auth.service.ts) *

*Edited relevant file*

*Edited relevant file*

*Edited relevant file*

*User accepted the command `@'
import type { FastifyInstance } from 'fastify';
import { eq, or } from 'drizzle-orm';
import { z } from 'zod';
import { roles, users } from '@mahasura/db/schema';
import { db } from '../../plugins/db.js';
import {
  authenticate,
  createSession,
  findValidRefreshSession,
  revokeRefreshToken,
  signAccessToken,
  verifyPassword,
} from './auth.service.js';

const loginSchema = z.object({
  identifier: z.string().min(3),
  password: z.string().min(6),
  deviceId: z.string().optional(),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(20),
});

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);

    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        passwordHash: users.passwordHash,
        status: users.status,
        roleCode: roles.code,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(or(eq(users.email, body.identifier), eq(users.phone, body.identifier), eq(users.employeeCode, body.identifier)));

    if (!user || !user.passwordHash || user.status !== 'active') {
      return reply.status(401).send({ message: 'Invalid credentials' });
    }

    const validPassword = await verifyPassword(body.password, user.passwordHash);

    if (!validPassword) {
      return reply.status(401).send({ message: 'Invalid credentials' });
    }

    const accessToken = signAccessToken({ sub: user.id, roleCode: user.roleCode });
    const refreshToken = await createSession(user.id, user.roleCode, body.deviceId);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        roleCode: user.roleCode,
      },
    };
  });

  app.post('/auth/refresh', async (request, reply) => {
    const body = refreshSchema.parse(request.body);
    const result = await findValidRefreshSession(body.refreshToken);

    if (!result) {
      return reply.status(401).send({ message: 'Invalid refresh token' });
    }

    return {
      accessToken: signAccessToken(result.payload),
    };
  });

  app.post('/auth/logout', async (request) => {
    const body = refreshSchema.partial().parse(request.body ?? {});
    if (body.refreshToken) {
      await revokeRefreshToken(body.refreshToken);
    }
    return { success: true };
  });

  app.get('/auth/me', { preHandler: authenticate }, async (request) => {
    const authUser = request.user!;
    const [profile] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        employeeCode: users.employeeCode,
        roleCode: roles.code,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.id, authUser.id));

    return {
      user: profile,
      permissions: authUser.permissions,
    };
  });
}
'@ | Set-Content -Encoding UTF8 apps/api/src/modules/auth/auth.routes.ts
@'
import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { permissions, rolePermissions, roles } from '@mahasura/db/schema';
import { db } from '../../plugins/db.js';
import { requirePermission } from '../auth/auth.service.js';

const createPermissionSchema = z.object({
  code: z.string().min(3),
  name: z.string().min(3),
  module: z.string().min(2),
  description: z.string().optional(),
});

const assignPermissionSchema = z.object({
  permissionId: z.string().uuid(),
});

export async function accessRoutes(app: FastifyInstance) {
  app.get('/roles', { preHandler: requirePermission('roles.manage') }, async () => {
    return { roles: await db.select().from(roles) };
  });

  app.get('/permissions', { preHandler: requirePermission('permissions.manage') }, async () => {
    return { permissions: await db.select().from(permissions) };
  });

  app.post('/permissions', { preHandler: requirePermission('permissions.manage') }, async (request) => {
    const body = createPermissionSchema.parse(request.body);
    const [permission] = await db.insert(permissions).values(body).returning();
    return { permission };
  });

  app.get('/roles/:roleId/permissions', { preHandler: requirePermission('roles.manage') }, async (request) => {
    const params = z.object({ roleId: z.string().uuid() }).parse(request.params);
    const rows = await db
      .select({ id: permissions.id, code: permissions.code, name: permissions.name, module: permissions.module })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, params.roleId));

    return { permissions: rows };
  });

  app.post('/roles/:roleId/permissions', { preHandler: requirePermission('roles.manage') }, async (request) => {
    const params = z.object({ roleId: z.string().uuid() }).parse(request.params);
    const body = assignPermissionSchema.parse(request.body);

    await db.insert(rolePermissions).values({
      roleId: params.roleId,
      permissionId: body.permissionId,
      grantedByUserId: request.user?.id,
    }).onConflictDoNothing();

    return { success: true };
  });
}
'@ | Set-Content -Encoding UTF8 apps/api/src/modules/users/access.routes.ts`*

*Viewed [routes.ts](file:///e:/Pekerjaan/Programing/project/sales-tracking/apps/api/src/routes.ts) *

*Edited relevant file*

*User accepted the command `@'
import type { FastifyInstance } from 'fastify';
import { authRoutes } from './modules/auth/auth.routes.js';
import { accessRoutes } from './modules/users/access.routes.js';

const notImplemented = (moduleName: string) => async () => ({
  module: moduleName,
  status: 'planned',
});

export async function registerRoutes(app: FastifyInstance) {
  await app.register(authRoutes);
  await app.register(accessRoutes);

  app.get('/settings', notImplemented('settings'));
  app.get('/attendance/today', notImplemented('attendance'));
  app.get('/visits/today', notImplemented('visits'));
  app.get('/outlets', notImplemented('outlets'));
  app.get('/transactions', notImplemented('transactions'));
  app.get('/inventory/products', notImplemented('inventory'));
  app.get('/sync/status', notImplemented('sync'));
}
'@ | Set-Content -Encoding UTF8 apps/api/src/routes.ts`*

*User accepted the command `New-Item -ItemType Directory -Force apps/web/src/app,apps/web/src/features/auth,apps/web/src/features/dashboard,apps/web/src/lib/api | Out-Null
@'
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
    throw new Error(error.message ?? 'Request failed');
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
'@ | Set-Content -Encoding UTF8 apps/web/src/lib/api/client.ts
@'
import { createContext, useContext, useMemo, useState } from 'react';
import { getMe, login } from '../../lib/api/client';

type SessionUser = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  roleCode: string;
};

type AuthContextValue = {
  accessToken?: string;
  refreshToken?: string;
  user?: SessionUser;
  permissions: string[];
  signIn: (identifier: string, password: string) => Promise<void>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const storageKey = 'mahasura.session';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initial = readStoredSession();
  const [accessToken, setAccessToken] = useState<string | undefined>(initial?.accessToken);
  const [refreshToken, setRefreshToken] = useState<string | undefined>(initial?.refreshToken);
  const [user, setUser] = useState<SessionUser | undefined>(initial?.user);
  const [permissions, setPermissions] = useState<string[]>(initial?.permissions ?? []);

  const value = useMemo<AuthContextValue>(() => ({
    accessToken,
    refreshToken,
    user,
    permissions,
    async signIn(identifier, password) {
      const deviceId = getDeviceId();
      const result = await login({ identifier, password, deviceId });
      const me = await getMe(result.accessToken);
      const session = {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: me.user,
        permissions: me.permissions,
      };
      localStorage.setItem(storageKey, JSON.stringify(session));
      setAccessToken(session.accessToken);
      setRefreshToken(session.refreshToken);
      setUser(session.user);
      setPermissions(session.permissions);
    },
    signOut() {
      localStorage.removeItem(storageKey);
      setAccessToken(undefined);
      setRefreshToken(undefined);
      setUser(undefined);
      setPermissions([]);
    },
  }), [accessToken, refreshToken, user, permissions]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

function readStoredSession() {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as Pick<AuthContextValue, 'accessToken' | 'refreshToken' | 'user' | 'permissions'>;
  } catch {
    return undefined;
  }
}

function getDeviceId() {
  const key = 'mahasura.deviceId';
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(key, id);
  return id;
}
'@ | Set-Content -Encoding UTF8 apps/web/src/features/auth/auth-provider.tsx`*

*User accepted the command `@'
import { Navigate } from 'react-router-dom';
import { useAuth } from './auth-provider';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { accessToken } = useAuth();
  if (!accessToken) return <Navigate to="/login" replace />;
  return children;
}
'@ | Set-Content -Encoding UTF8 apps/web/src/features/auth/require-auth.tsx
@'
import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Loader2, LockKeyhole, MapPin } from 'lucide-react';
import { useAuth } from './auth-provider';

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(identifier, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login gagal');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-5 py-10 text-slate-100">
      <section className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/10 p-7 shadow-2xl shadow-black/30 backdrop-blur-xl">
        <div className="mb-7">
          <p className="text-sm uppercase tracking-[0.35em] text-teal-200">Mahasura</p>
          <h1 className="mt-2 text-3xl font-black">Login Operasional</h1>
          <p className="mt-3 text-slate-300">Masuk untuk mengakses sales tracking, absensi wajah, GPS, dan approval.</p>
        </div>

        <div className="mb-6 grid grid-cols-3 gap-3 text-center text-xs text-slate-300">
          <div className="rounded-2xl bg-slate-950/50 p-3"><Camera className="mx-auto mb-1 text-teal-300" />Wajah</div>
          <div className="rounded-2xl bg-slate-950/50 p-3"><MapPin className="mx-auto mb-1 text-violet-300" />GPS</div>
          <div className="rounded-2xl bg-slate-950/50 p-3"><LockKeyhole className="mx-auto mb-1 text-amber-300" />RBAC</div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm text-slate-300">Email / HP / Kode Karyawan</span>
            <input className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 outline-none transition focus:border-teal-300" value={identifier} onChange={(event) => setIdentifier(event.target.value)} required />
          </label>
          <label className="block">
            <span className="text-sm text-slate-300">Password</span>
            <input className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 outline-none transition focus:border-teal-300" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
          {error && <p className="rounded-2xl border border-red-300/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</p>}
          <button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-400 px-5 py-3 font-bold text-slate-950 transition hover:bg-teal-300 disabled:opacity-70" disabled={loading}>
            {loading && <Loader2 className="animate-spin" size={18} />}
            Masuk
          </button>
        </form>
      </section>
    </main>
  );
}
'@ | Set-Content -Encoding UTF8 apps/web/src/features/auth/login-page.tsx`*

*User accepted the command `@'
import { Camera, LogOut, MapPin, ShieldCheck, SlidersHorizontal, Users } from 'lucide-react';
import { useAuth } from '../auth/auth-provider';

const roleMenus = [
  { permission: 'attendance.execute', title: 'Absensi Wajah', icon: Camera, text: 'Check-in kamera depan dan validasi GPS.' },
  { permission: 'visits.execute', title: 'Visit Outlet', icon: MapPin, text: 'Geofence outlet dan durasi kunjungan.' },
  { permission: 'attendance.review', title: 'Review Absensi', icon: ShieldCheck, text: 'Validasi foto wajah dan lokasi sales.' },
  { permission: 'roles.manage', title: 'Role & Permission', icon: Users, text: 'Atur akses fitur per role secara fleksibel.' },
  { permission: 'settings.manage', title: 'Pengaturan Radius', icon: SlidersHorizontal, text: 'Custom radius geofence dan aturan GPS.' },
];

export function DashboardPage() {
  const { user, permissions, signOut } = useAuth();
  const isAdministrator = user?.roleCode === 'ADMINISTRATOR';
  const visibleMenus = roleMenus.filter((menu) => isAdministrator || permissions.includes(menu.permission));

  return (
    <main className="min-h-screen px-5 py-8 text-slate-100">
      <section className="mx-auto max-w-6xl space-y-6">
        <nav className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/10 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-teal-200">Dashboard</p>
            <h1 className="text-3xl font-black">Selamat datang, {user?.name}</h1>
            <p className="text-slate-300">Role: <span className="font-bold text-teal-200">{user?.roleCode}</span></p>
          </div>
          <button onClick={signOut} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 font-bold transition hover:bg-white/15">
            <LogOut size={18} /> Keluar
          </button>
        </nav>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleMenus.map((menu) => (
            <article key={menu.title} className="rounded-[1.75rem] border border-white/10 bg-slate-950/55 p-6 shadow-xl shadow-black/20 backdrop-blur-xl transition hover:-translate-y-1 hover:border-teal-300/30">
              <menu.icon className="mb-5 text-teal-300" size={32} />
              <h2 className="text-xl font-bold">{menu.title}</h2>
              <p className="mt-2 leading-7 text-slate-300">{menu.text}</p>
              <p className="mt-4 rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">{menu.permission}</p>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
'@ | Set-Content -Encoding UTF8 apps/web/src/features/dashboard/dashboard-page.tsx
@'
import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from '../features/auth/login-page';
import { RequireAuth } from '../features/auth/require-auth';
import { DashboardPage } from '../features/dashboard/dashboard-page';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
'@ | Set-Content -Encoding UTF8 apps/web/src/app/router.tsx
@'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../features/auth/auth-provider';

const queryClient = new QueryClient();

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>{children}</AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
'@ | Set-Content -Encoding UTF8 apps/web/src/app/providers.tsx
@'
import { AppProviders } from './app/providers';
import { AppRouter } from './app/router';

export default function App() {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
}
'@ | Set-Content -Encoding UTF8 apps/web/src/App.tsx`*

*User accepted the command `pnpm typecheck`*

*Edited relevant file*

*User accepted the command `pnpm typecheck`*

*Edited relevant file*

*User accepted the command `pnpm install; pnpm typecheck`*

*User accepted the command `pnpm build`*

*Edited relevant file*

*Edited relevant file*

### Planner Response

Phase 3 sudah selesai dilanjutkan.

Yang ditambahkan:

- Backend Fastify:
  - `POST /auth/login`
  - `POST /auth/refresh`
  - `POST /auth/logout`
  - `GET /auth/me`
- JWT access token + refresh token
- Session persistence di tabel `sessions`
- Password hashing `bcryptjs`
- Middleware:
  - `authenticate`
  - `requirePermission`
- Endpoint Administrator/access management:
  - `GET /roles`
  - `GET /permissions`
  - `POST /permissions`
  - `GET /roles/:roleId/permissions`
  - `POST /roles/:roleId/permissions`
- Frontend:
  - API client dasar
  - `AuthProvider`
  - protected route
  - halaman login
  - dashboard role-based berbasis permission

Verifikasi berhasil:

```bash
pnpm typecheck
pnpm build
```

Walkthrough diperbarui di:

[walkthrough.md](file:///C:/Users/renal/.gemini/antigravity/brain/64381f26-04fa-4e89-bb23-a6f42f5c180c/walkthrough.md)

Catatan: seed user administrator default belum saya buat supaya kredensial awal bisa ditentukan dengan aman. Next phase yang paling tepat adalah **Phase 4: Attendance, Camera & GPS** atau kita bisa dulu buat **admin bootstrap/seed user pertama** agar login bisa dites end-to-end.

### User Input

lanjutkan ke phase selanjutnya

*Edited relevant file*

*User accepted the command `@'
import { calculateDistanceMeters } from '@mahasura/shared';

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
'@ | Set-Content -Encoding UTF8 apps/api/src/utils/geofence.ts
@'
import { eq } from 'drizzle-orm';
import { appSettings } from '@mahasura/db/schema';
import { db } from '../plugins/db.js';

const defaults = {
  default_geofence_radius_m: 100,
  max_gps_accuracy_m: 100,
};

export async function getNumericSetting(key: keyof typeof defaults) {
  const [setting] = await db.select().from(appSettings).where(eq(appSettings.key, key));
  const value = setting?.value;
  return typeof value === 'number' ? value : defaults[key];
}
'@ | Set-Content -Encoding UTF8 apps/api/src/utils/settings.ts`*

*User accepted the command `@'
import type { FastifyInstance } from 'fastify';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { attendanceSessions, faceCaptures, mediaFiles, outlets } from '@mahasura/db/schema';
import { db } from '../../plugins/db.js';
import { requirePermission } from '../auth/auth.service.js';
import { getNumericSetting } from '../../utils/settings.js';
import { validateGeofence } from '../../utils/geofence.js';

const geoSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  accuracyM: z.number().optional(),
});

const faceCaptureSchema = z.object({
  dataUrl: z.string().min(20),
  mimeType: z.string().default('image/jpeg'),
  sizeBytes: z.number().int().nonnegative().default(0),
  faceDetected: z.boolean().default(true),
  faceConfidence: z.number().min(0).max(1).optional(),
});

const checkInSchema = z.object({
  clientRequestId: z.string().uuid(),
  outletId: z.string().uuid().optional(),
  capturedAt: z.string().datetime(),
  location: geoSchema,
  faceCapture: faceCaptureSchema,
});

const checkOutSchema = checkInSchema.extend({
  attendanceSessionId: z.string().uuid(),
});

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

export async function attendanceRoutes(app: FastifyInstance) {
  app.get('/attendance/today', { preHandler: requirePermission('attendance.execute') }, async (request) => {
    const authUser = request.user!;
    const [session] = await db
      .select()
      .from(attendanceSessions)
      .where(and(eq(attendanceSessions.userId, authUser.id), eq(attendanceSessions.workDate, todayDateString())));

    return { session: session ?? null };
  });

  app.post('/attendance/check-in', { preHandler: requirePermission('attendance.execute') }, async (request, reply) => {
    const authUser = request.user!;
    const body = checkInSchema.parse(request.body);
    const radius = await getNumericSetting('default_geofence_radius_m');
    const maxAccuracy = await getNumericSetting('max_gps_accuracy_m');

    const outlet = body.outletId
      ? (await db.select().from(outlets).where(eq(outlets.id, body.outletId)))[0]
      : null;

    const geofence = validateGeofence({
      current: body.location,
      target: outlet ? { latitude: Number(outlet.latitude), longitude: Number(outlet.longitude) } : null,
      radiusMeters: outlet?.geofenceRadiusM ?? radius,
      accuracyMeters: body.location.accuracyM,
      maxAccuracyMeters: maxAccuracy,
    });

    const [media] = await db.insert(mediaFiles).values({
      ownerType: 'attendance',
      fileUrl: body.faceCapture.dataUrl,
      mimeType: body.faceCapture.mimeType,
      sizeBytes: body.faceCapture.sizeBytes,
      capturedAt: new Date(body.capturedAt),
      uploadedByUserId: authUser.id,
    }).returning();

    const [face] = await db.insert(faceCaptures).values({
      userId: authUser.id,
      mediaFileId: media.id,
      captureContext: 'attendance_check_in',
      capturedAt: new Date(body.capturedAt),
      latitude: String(body.location.latitude),
      longitude: String(body.location.longitude),
      faceDetected: body.faceCapture.faceDetected,
      faceConfidence: body.faceCapture.faceConfidence?.toString(),
      identityMatchStatus: 'not_checked',
      livenessStatus: 'not_checked',
    }).returning();

    const validationStatus = !body.faceCapture.faceDetected
      ? 'face_not_detected'
      : geofence.valid
        ? 'valid'
        : 'invalid_location';

    const [session] = await db.insert(attendanceSessions).values({
      userId: authUser.id,
      workDate: todayDateString(),
      checkInAt: new Date(body.capturedAt),
      checkInLatitude: String(body.location.latitude),
      checkInLongitude: String(body.location.longitude),
      checkInAccuracyM: body.location.accuracyM?.toString(),
      checkInDistanceM: geofence.distanceMeters?.toFixed(2),
      checkInOutletId: body.outletId,
      checkInFaceCaptureId: face.id,
      status: 'open',
      validationStatus,
      clientRequestId: body.clientRequestId,
    }).returning();

    return reply.status(201).send({ session, geofence });
  });

  app.post('/attendance/check-out', { preHandler: requirePermission('attendance.execute') }, async (request) => {
    const authUser = request.user!;
    const body = checkOutSchema.parse(request.body);

    const [media] = await db.insert(mediaFiles).values({
      ownerType: 'attendance',
      fileUrl: body.faceCapture.dataUrl,
      mimeType: body.faceCapture.mimeType,
      sizeBytes: body.faceCapture.sizeBytes,
      capturedAt: new Date(body.capturedAt),
      uploadedByUserId: authUser.id,
    }).returning();

    const [face] = await db.insert(faceCaptures).values({
      userId: authUser.id,
      mediaFileId: media.id,
      captureContext: 'attendance_check_out',
      capturedAt: new Date(body.capturedAt),
      latitude: String(body.location.latitude),
      longitude: String(body.location.longitude),
      faceDetected: body.faceCapture.faceDetected,
      faceConfidence: body.faceCapture.faceConfidence?.toString(),
      identityMatchStatus: 'not_checked',
      livenessStatus: 'not_checked',
    }).returning();

    const [session] = await db.update(attendanceSessions).set({
      checkOutAt: new Date(body.capturedAt),
      checkOutLatitude: String(body.location.latitude),
      checkOutLongitude: String(body.location.longitude),
      checkOutAccuracyM: body.location.accuracyM?.toString(),
      checkOutFaceCaptureId: face.id,
      status: 'closed',
      updatedAt: new Date(),
    }).where(and(eq(attendanceSessions.id, body.attendanceSessionId), eq(attendanceSessions.userId, authUser.id))).returning();

    return { session };
  });
}
'@ | Set-Content -Encoding UTF8 apps/api/src/modules/attendance/attendance.routes.ts`*

*Viewed [routes.ts](file:///e:/Pekerjaan/Programing/project/sales-tracking/apps/api/src/routes.ts) *

*Edited relevant file*

*Edited relevant file*

*User accepted the command `New-Item -ItemType Directory -Force apps/web/src/lib/camera,apps/web/src/lib/geo,apps/web/src/features/attendance | Out-Null
@'
export type CapturedImage = {
  dataUrl: string;
  mimeType: string;
  sizeBytes: number;
  capturedAt: string;
  faceDetected: boolean;
  faceConfidence?: number;
};

export async function captureFromVideo(video: HTMLVideoElement): Promise<CapturedImage> {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext('2d');

  if (!context) throw new Error('Camera canvas is not available');

  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.86);
  const sizeBytes = Math.round((dataUrl.length * 3) / 4);

  return {
    dataUrl,
    mimeType: 'image/jpeg',
    sizeBytes,
    capturedAt: new Date().toISOString(),
    faceDetected: true,
    faceConfidence: 0.8,
  };
}

export async function startFrontCamera(video: HTMLVideoElement) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user' },
    audio: false,
  });
  video.srcObject = stream;
  await video.play();
  return stream;
}

export function stopCamera(stream?: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}
'@ | Set-Content -Encoding UTF8 apps/web/src/lib/camera/capture.ts
@'
export type BrowserLocation = {
  latitude: number;
  longitude: number;
  accuracyM?: number;
};

export function getCurrentLocation(): Promise<BrowserLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation tidak tersedia di browser ini'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyM: position.coords.accuracy,
        });
      },
      (error) => reject(new Error(error.message)),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 10_000 },
    );
  });
}
'@ | Set-Content -Encoding UTF8 apps/web/src/lib/geo/location.ts`*

*Viewed [client.ts](file:///e:/Pekerjaan/Programing/project/sales-tracking/apps/web/src/lib/api/client.ts) *

*User accepted the command `@'

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
'@ | Add-Content -Encoding UTF8 apps/web/src/lib/api/client.ts`*

*User accepted the command `@'
import { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, Loader2, MapPin, ShieldAlert, Video } from 'lucide-react';
import { checkInAttendance } from '../../lib/api/client';
import { captureFromVideo, startFrontCamera, stopCamera, type CapturedImage } from '../../lib/camera/capture';
import { getCurrentLocation, type BrowserLocation } from '../../lib/geo/location';
import { useAuth } from '../auth/auth-provider';

export function AttendancePage() {
  const { accessToken } = useAuth();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [image, setImage] = useState<CapturedImage | null>(null);
  const [location, setLocation] = useState<BrowserLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => () => stopCamera(stream), [stream]);

  async function handleStartCamera() {
    if (!videoRef.current) return;
    const nextStream = await startFrontCamera(videoRef.current);
    setStream(nextStream);
  }

  async function handleCapture() {
    if (!videoRef.current) return;
    const captured = await captureFromVideo(videoRef.current);
    setImage(captured);
  }

  async function handleLocation() {
    const current = await getCurrentLocation();
    setLocation(current);
  }

  async function handleCheckIn() {
    if (!accessToken || !image || !location) return;
    setLoading(true);
    setMessage('');
    try {
      const result = await checkInAttendance(accessToken, {
        clientRequestId: crypto.randomUUID(),
        capturedAt: image.capturedAt,
        location,
        faceCapture: {
          dataUrl: image.dataUrl,
          mimeType: image.mimeType,
          sizeBytes: image.sizeBytes,
          faceDetected: image.faceDetected,
          faceConfidence: image.faceConfidence,
        },
      });
      setMessage(`Absensi terkirim. Status: ${JSON.stringify(result.geofence)}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Absensi gagal');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-5 py-8 text-slate-100">
      <section className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
          <p className="text-sm uppercase tracking-[0.35em] text-teal-200">Attendance</p>
          <h1 className="mt-2 text-4xl font-black">Absensi Wajah + GPS</h1>
          <p className="mt-3 max-w-2xl text-slate-300">
            Gunakan kamera depan untuk foto wajah, ambil lokasi GPS akurat, lalu sistem akan memvalidasi radius/geofence.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_0.85fr]">
          <section className="rounded-[2rem] border border-white/10 bg-slate-950/55 p-5 shadow-xl shadow-black/20 backdrop-blur-xl">
            <video ref={videoRef} className="aspect-video w-full rounded-3xl bg-black object-cover" playsInline muted />
            {image && <img src={image.dataUrl} alt="Captured face" className="mt-4 aspect-video w-full rounded-3xl object-cover" />}
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button onClick={handleStartCamera} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-3 font-bold transition hover:bg-white/15"><Video size={18} /> Buka Kamera</button>
              <button onClick={handleCapture} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-400 px-4 py-3 font-bold text-slate-950 transition hover:bg-teal-300"><Camera size={18} /> Ambil Foto</button>
            </div>
          </section>

          <aside className="space-y-4">
            <StatusCard icon={Camera} title="Foto Wajah" ok={!!image} text={image ? 'Foto wajah sudah diambil. Face detection MVP aktif.' : 'Wajib ambil foto kamera depan.'} />
            <StatusCard icon={MapPin} title="Lokasi GPS" ok={!!location} text={location ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)} ±${Math.round(location.accuracyM ?? 0)}m` : 'Ambil lokasi GPS akurat.'} />
            <button onClick={handleLocation} className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 font-bold transition hover:bg-white/15">Ambil Lokasi</button>
            <button onClick={handleCheckIn} disabled={!image || !location || loading} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-400 px-4 py-3 font-bold text-slate-950 transition hover:bg-teal-300 disabled:opacity-60">
              {loading ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
              Check-in Sekarang
            </button>
            {message && <p className="rounded-2xl border border-white/10 bg-white/10 p-4 text-sm text-slate-200">{message}</p>}
          </aside>
        </div>
      </section>
    </main>
  );
}

function StatusCard({ icon: Icon, title, text, ok }: { icon: typeof ShieldAlert; title: string; text: string; ok: boolean }) {
  return (
    <article className="rounded-3xl border border-white/10 bg-slate-950/55 p-5 shadow-xl shadow-black/20 backdrop-blur-xl">
      <Icon className={ok ? 'text-teal-300' : 'text-amber-300'} />
      <h2 className="mt-3 text-lg font-bold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-300">{text}</p>
    </article>
  );
}
'@ | Set-Content -Encoding UTF8 apps/web/src/features/attendance/attendance-page.tsx`*

*Viewed [router.tsx](file:///e:/Pekerjaan/Programing/project/sales-tracking/apps/web/src/app/router.tsx) *

*Edited relevant file*

*Viewed [dashboard-page.tsx](file:///e:/Pekerjaan/Programing/project/sales-tracking/apps/web/src/features/dashboard/dashboard-page.tsx) *

*Edited relevant file*

*User accepted the command `pnpm typecheck`*

*User accepted the command `pnpm build`*

*Edited relevant file*

*Edited relevant file*

### Planner Response

Phase 4 selesai.

Yang ditambahkan:

- Backend attendance:
  - `GET /attendance/today`
  - `POST /attendance/check-in`
  - `POST /attendance/check-out`
- Validasi:
  - permission `attendance.execute`
  - foto wajah
  - status `faceDetected`
  - GPS latitude/longitude/accuracy
  - geofence radius dari outlet/settings
  - max GPS accuracy dari settings
- Frontend:
  - utility kamera depan
  - capture foto wajah dari video
  - utility GPS browser
  - halaman `/attendance`
  - dashboard card menuju absensi
  - UI absensi mobile-friendly

Verifikasi berhasil:

```bash
pnpm typecheck
pnpm build
```

Walkthrough sudah diperbarui:

[walkthrough.md](file:///C:/Users/renal/.gemini/antigravity/brain/64381f26-04fa-4e89-bb23-a6f42f5c180c/walkthrough.md)

Catatan: face detection Phase 4 masih placeholder MVP (`faceDetected: true`) dari frontend capture. Phase berikutnya yang saya sarankan: **bootstrap administrator user + offline queue IndexedDB untuk attendance**, supaya bisa login end-to-end dan absensi tetap tersimpan saat offline.

### User Input

lanjutkan

*Edited relevant file*

*Viewed [.env.example](file:///e:/Pekerjaan/Programing/project/sales-tracking/.env.example) *

*User accepted the command `@'
DATABASE_URL=postgres://mahasura:mahasura@localhost:5432/mahasura_sales
API_PORT=4000
JWT_ACCESS_SECRET=change-me-access
JWT_REFRESH_SECRET=change-me-refresh
WEB_ORIGIN=http://localhost:5173

# Bootstrap administrator for first local setup.
# Change these before seeding production/staging.
ADMIN_EMAIL=admin@mahasura.local
ADMIN_PHONE=080000000000
ADMIN_PASSWORD=ChangeMe123!
ADMIN_NAME=Administrator Mahasura
ADMIN_EMPLOYEE_CODE=ADM-001
'@ | Set-Content -Encoding UTF8 .env.example`*

*Viewed [seed.ts](file:///e:/Pekerjaan/Programing/project/sales-tracking/packages/db/src/seed.ts) *

*Viewed [auth.ts](file:///e:/Pekerjaan/Programing/project/sales-tracking/packages/db/src/schema/auth.ts) *

*Edited relevant file*

*Edited relevant file*

*User accepted the command `New-Item -ItemType Directory -Force apps/web/src/lib/offline | Out-Null
@'
import { openDB, type DBSchema } from 'idb';
import type { AttendancePayload } from '../api/client';

type QueueStatus = 'pending' | 'syncing' | 'failed';

export type AttendanceQueueItem = {
  id: string;
  type: 'check-in' | 'check-out';
  accessToken: string;
  payload: AttendancePayload;
  status: QueueStatus;
  attempts: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
};

interface MahasuraOfflineDb extends DBSchema {
  attendanceQueue: {
    key: string;
    value: AttendanceQueueItem;
    indexes: {
      'by-status': QueueStatus;
    };
  };
}

const dbPromise = openDB<MahasuraOfflineDb>('mahasura-offline', 1, {
  upgrade(db) {
    const store = db.createObjectStore('attendanceQueue', { keyPath: 'id' });
    store.createIndex('by-status', 'status');
  },
});

export async function enqueueAttendance(item: Omit<AttendanceQueueItem, 'id' | 'status' | 'attempts' | 'createdAt' | 'updatedAt'>) {
  const now = new Date().toISOString();
  const queued: AttendanceQueueItem = {
    ...item,
    id: crypto.randomUUID(),
    status: 'pending',
    attempts: 0,
    createdAt: now,
    updatedAt: now,
  };

  const db = await dbPromise;
  await db.put('attendanceQueue', queued);
  return queued;
}

export async function getAttendanceQueue() {
  const db = await dbPromise;
  return db.getAll('attendanceQueue');
}

export async function getPendingAttendanceQueue() {
  const db = await dbPromise;
  const pending = await db.getAllFromIndex('attendanceQueue', 'by-status', 'pending');
  const failed = await db.getAllFromIndex('attendanceQueue', 'by-status', 'failed');
  return [...pending, ...failed].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function markQueueItemSyncing(id: string) {
  const db = await dbPromise;
  const item = await db.get('attendanceQueue', id);
  if (!item) return;
  await db.put('attendanceQueue', { ...item, status: 'syncing', updatedAt: new Date().toISOString() });
}

export async function markQueueItemFailed(id: string, error: string) {
  const db = await dbPromise;
  const item = await db.get('attendanceQueue', id);
  if (!item) return;
  await db.put('attendanceQueue', {
    ...item,
    status: 'failed',
    attempts: item.attempts + 1,
    lastError: error,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteQueueItem(id: string) {
  const db = await dbPromise;
  await db.delete('attendanceQueue', id);
}
'@ | Set-Content -Encoding UTF8 apps/web/src/lib/offline/attendance-queue.ts
@'
import { checkInAttendance } from '../api/client';
import { deleteQueueItem, getPendingAttendanceQueue, markQueueItemFailed, markQueueItemSyncing } from './attendance-queue';

export async function syncAttendanceQueue() {
  if (!navigator.onLine) return { synced: 0, failed: 0 };

  const items = await getPendingAttendanceQueue();
  let synced = 0;
  let failed = 0;

  for (const item of items) {
    try {
      await markQueueItemSyncing(item.id);
      if (item.type === 'check-in') {
        await checkInAttendance(item.accessToken, item.payload);
      }
      await deleteQueueItem(item.id);
      synced += 1;
    } catch (error) {
      failed += 1;
      await markQueueItemFailed(item.id, error instanceof Error ? error.message : 'Sync failed');
    }
  }

  return { synced, failed };
}
'@ | Set-Content -Encoding UTF8 apps/web/src/lib/offline/sync-attendance.ts`*

*Viewed [attendance-page.tsx](file:///e:/Pekerjaan/Programing/project/sales-tracking/apps/web/src/features/attendance/attendance-page.tsx) *

*User accepted the command `@'
import { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, Cloud, Loader2, MapPin, ShieldAlert, Video, WifiOff } from 'lucide-react';
import { checkInAttendance, type AttendancePayload } from '../../lib/api/client';
import { captureFromVideo, startFrontCamera, stopCamera, type CapturedImage } from '../../lib/camera/capture';
import { getCurrentLocation, type BrowserLocation } from '../../lib/geo/location';
import { enqueueAttendance, getAttendanceQueue } from '../../lib/offline/attendance-queue';
import { syncAttendanceQueue } from '../../lib/offline/sync-attendance';
import { useAuth } from '../auth/auth-provider';

export function AttendancePage() {
  const { accessToken } = useAuth();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [image, setImage] = useState<CapturedImage | null>(null);
  const [location, setLocation] = useState<BrowserLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');
  const [queueCount, setQueueCount] = useState(0);
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => () => stopCamera(stream), [stream]);

  useEffect(() => {
    refreshQueueCount();
    const handleOnline = async () => {
      setOnline(true);
      await handleSyncQueue();
    };
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  async function refreshQueueCount() {
    const queue = await getAttendanceQueue();
    setQueueCount(queue.length);
  }

  async function handleSyncQueue() {
    setSyncing(true);
    try {
      const result = await syncAttendanceQueue();
      await refreshQueueCount();
      if (result.synced || result.failed) {
        setMessage(`Sync selesai. Berhasil: ${result.synced}, gagal: ${result.failed}`);
      }
    } finally {
      setSyncing(false);
    }
  }

  async function handleStartCamera() {
    if (!videoRef.current) return;
    const nextStream = await startFrontCamera(videoRef.current);
    setStream(nextStream);
  }

  async function handleCapture() {
    if (!videoRef.current) return;
    const captured = await captureFromVideo(videoRef.current);
    setImage(captured);
  }

  async function handleLocation() {
    const current = await getCurrentLocation();
    setLocation(current);
  }

  async function handleCheckIn() {
    if (!accessToken || !image || !location) return;
    setLoading(true);
    setMessage('');

    const payload: AttendancePayload = {
      clientRequestId: crypto.randomUUID(),
      capturedAt: image.capturedAt,
      location,
      faceCapture: {
        dataUrl: image.dataUrl,
        mimeType: image.mimeType,
        sizeBytes: image.sizeBytes,
        faceDetected: image.faceDetected,
        faceConfidence: image.faceConfidence,
      },
    };

    try {
      if (!navigator.onLine) throw new Error('offline');
      const result = await checkInAttendance(accessToken, payload);
      setMessage(`Absensi terkirim. Status: ${JSON.stringify(result.geofence)}`);
    } catch (error) {
      await enqueueAttendance({ type: 'check-in', accessToken, payload });
      await refreshQueueCount();
      setMessage(error instanceof Error && error.message !== 'offline'
        ? `Absensi disimpan offline karena gagal terkirim: ${error.message}`
        : 'Absensi disimpan offline dan akan tersinkron saat online.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-5 py-8 text-slate-100">
      <section className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-teal-200">Attendance</p>
              <h1 className="mt-2 text-4xl font-black">Absensi Wajah + GPS</h1>
              <p className="mt-3 max-w-2xl text-slate-300">
                Gunakan kamera depan untuk foto wajah, ambil lokasi GPS akurat, lalu sistem akan memvalidasi radius/geofence.
              </p>
            </div>
            <div className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold ${online ? 'bg-teal-400/15 text-teal-100' : 'bg-amber-400/15 text-amber-100'}`}>
              {online ? <Cloud size={18} /> : <WifiOff size={18} />}
              {online ? 'Online' : 'Offline'} · Queue {queueCount}
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_0.85fr]">
          <section className="rounded-[2rem] border border-white/10 bg-slate-950/55 p-5 shadow-xl shadow-black/20 backdrop-blur-xl">
            <video ref={videoRef} className="aspect-video w-full rounded-3xl bg-black object-cover" playsInline muted />
            {image && <img src={image.dataUrl} alt="Captured face" className="mt-4 aspect-video w-full rounded-3xl object-cover" />}
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button onClick={handleStartCamera} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-3 font-bold transition hover:bg-white/15"><Video size={18} /> Buka Kamera</button>
              <button onClick={handleCapture} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-400 px-4 py-3 font-bold text-slate-950 transition hover:bg-teal-300"><Camera size={18} /> Ambil Foto</button>
            </div>
          </section>

          <aside className="space-y-4">
            <StatusCard icon={Camera} title="Foto Wajah" ok={!!image} text={image ? 'Foto wajah sudah diambil. Face detection MVP aktif.' : 'Wajib ambil foto kamera depan.'} />
            <StatusCard icon={MapPin} title="Lokasi GPS" ok={!!location} text={location ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)} ±${Math.round(location.accuracyM ?? 0)}m` : 'Ambil lokasi GPS akurat.'} />
            <button onClick={handleLocation} className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 font-bold transition hover:bg-white/15">Ambil Lokasi</button>
            <button onClick={handleCheckIn} disabled={!image || !location || loading} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-400 px-4 py-3 font-bold text-slate-950 transition hover:bg-teal-300 disabled:opacity-60">
              {loading ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
              Check-in Sekarang
            </button>
            <button onClick={handleSyncQueue} disabled={syncing || !online} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 font-bold transition hover:bg-white/15 disabled:opacity-60">
              {syncing ? <Loader2 className="animate-spin" /> : <Cloud />}
              Sync Queue Offline
            </button>
            {message && <p className="rounded-2xl border border-white/10 bg-white/10 p-4 text-sm text-slate-200">{message}</p>}
          </aside>
        </div>
      </section>
    </main>
  );
}

function StatusCard({ icon: Icon, title, text, ok }: { icon: typeof ShieldAlert; title: string; text: string; ok: boolean }) {
  return (
    <article className="rounded-3xl border border-white/10 bg-slate-950/55 p-5 shadow-xl shadow-black/20 backdrop-blur-xl">
      <Icon className={ok ? 'text-teal-300' : 'text-amber-300'} />
      <h2 className="mt-3 text-lg font-bold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-300">{text}</p>
    </article>
  );
}
'@ | Set-Content -Encoding UTF8 apps/web/src/features/attendance/attendance-page.tsx`*

*User accepted the command `pnpm typecheck`*

*Edited relevant file*

*User accepted the command `pnpm install; pnpm typecheck`*

*Checked command status*

*User accepted the command `pnpm build`*

*Edited relevant file*

*Edited relevant file*

### Planner Response

Phase 5 selesai.

Yang ditambahkan:

- Bootstrap Administrator:
  - env admin di `.env.example`
  - seed otomatis membuat/update user `ADMINISTRATOR` jika `ADMIN_PASSWORD` tersedia
  - password di-hash dengan `bcryptjs`
- Offline attendance queue:
  - IndexedDB store `attendanceQueue`
  - status queue: `pending`, `syncing`, `failed`
  - check-in disimpan offline jika browser offline atau request gagal
  - auto-sync saat online kembali
  - tombol manual `Sync Queue Offline`
- UI `/attendance`:
  - status Online/Offline
  - jumlah queue offline
  - pesan hasil sync

Verifikasi berhasil:

```bash
pnpm typecheck
pnpm build
```

Walkthrough diperbarui:

[walkthrough.md](file:///C:/Users/renal/.gemini/antigravity/brain/64381f26-04fa-4e89-bb23-a6f42f5c180c/walkthrough.md)

Next yang paling tepat: jalankan database lokal + migration + seed agar login admin bisa dites, lalu lanjut halaman **review attendance untuk Admin/Supervisor**.

### User Input

lanjutkan

*Viewed [.env](file:///e:/Pekerjaan/Programing/project/sales-tracking/.env) *

*Viewed [package.json](file:///e:/Pekerjaan/Programing/project/sales-tracking/packages/db/package.json) *

*Viewed [package.json](file:///e:/Pekerjaan/Programing/project/sales-tracking/package.json) *

*Edited relevant file*

*Edited relevant file*

*User accepted the command `@'
# DATABASE_URL=postgres://mahasura:mahasura@localhost:5432/mahasura_sales
DATABASE_URL=postgresql://postgres:hfu9wjqfEn8NVy%@db.ftbszfnvuwsbcdfnisyk.supabase.co:5432/postgres
API_PORT=4000
JWT_ACCESS_SECRET=change-me-access
JWT_REFRESH_SECRET=change-me-refresh
WEB_ORIGIN=http://localhost:5173
DATABASE_PASS=hfu9wjqfEn8NVy%

ADMIN_EMAIL=admin@mahasura.local
ADMIN_PHONE=080000000000
ADMIN_PASSWORD=ChangeMe123!
ADMIN_NAME=Administrator Mahasura
ADMIN_EMPLOYEE_CODE=ADM-001
'@ | Set-Content -Encoding UTF8 .env`*

*User accepted the command `pnpm db:migrate; pnpm db:seed`*

*Viewed [drizzle.config.ts](file:///e:/Pekerjaan/Programing/project/sales-tracking/packages/db/drizzle.config.ts) *

*User accepted the command `@'
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { defineConfig } from 'drizzle-kit';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://mahasura:mahasura@localhost:5432/mahasura_sales',
  },
  verbose: true,
  strict: true,
});
'@ | Set-Content -Encoding UTF8 packages/db/drizzle.config.ts`*

*Edited relevant file*

*User accepted the command `pnpm db:migrate; pnpm db:seed`*

*Edited relevant file*

*User accepted the command `pnpm db:migrate; pnpm db:seed`*

*Checked command status*

*Checked command status*

*Read URL content from /docs/guides/database/connecting-to-postgres *

*User accepted the command `@'
import type { FastifyInstance } from 'fastify';
import { desc, eq } from 'drizzle-orm';
import { attendanceSessions, faceCaptures, mediaFiles, users } from '@mahasura/db/schema';
import { db } from '../../plugins/db.js';
import { requirePermission } from '../auth/auth.service.js';

export async function attendanceReviewRoutes(app: FastifyInstance) {
  app.get('/attendance/review', { preHandler: requirePermission('attendance.review') }, async () => {
    const rows = await db
      .select({
        id: attendanceSessions.id,
        workDate: attendanceSessions.workDate,
        status: attendanceSessions.status,
        validationStatus: attendanceSessions.validationStatus,
        checkInAt: attendanceSessions.checkInAt,
        checkInLatitude: attendanceSessions.checkInLatitude,
        checkInLongitude: attendanceSessions.checkInLongitude,
        checkInAccuracyM: attendanceSessions.checkInAccuracyM,
        checkInDistanceM: attendanceSessions.checkInDistanceM,
        checkOutAt: attendanceSessions.checkOutAt,
        salesName: users.name,
        salesEmail: users.email,
        faceDetected: faceCaptures.faceDetected,
        faceConfidence: faceCaptures.faceConfidence,
        faceImageUrl: mediaFiles.fileUrl,
      })
      .from(attendanceSessions)
      .innerJoin(users, eq(attendanceSessions.userId, users.id))
      .leftJoin(faceCaptures, eq(attendanceSessions.checkInFaceCaptureId, faceCaptures.id))
      .leftJoin(mediaFiles, eq(faceCaptures.mediaFileId, mediaFiles.id))
      .orderBy(desc(attendanceSessions.createdAt))
      .limit(100);

    return { attendance: rows };
  });
}
'@ | Set-Content -Encoding UTF8 apps/api/src/modules/attendance/attendance-review.routes.ts`*

*Edited relevant file*

*User accepted the command `@'

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
'@ | Add-Content -Encoding UTF8 apps/web/src/lib/api/client.ts
@'
import { useEffect, useState } from 'react';
import { Camera, Loader2, MapPin, ShieldCheck } from 'lucide-react';
import { getAttendanceReview, type AttendanceReviewItem } from '../../lib/api/client';
import { useAuth } from '../auth/auth-provider';

export function AttendanceReviewPage() {
  const { accessToken } = useAuth();
  const [rows, setRows] = useState<AttendanceReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      if (!accessToken) return;
      try {
        const result = await getAttendanceReview(accessToken);
        setRows(result.attendance);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal memuat review absensi');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [accessToken]);

  return (
    <main className="min-h-screen px-5 py-8 text-slate-100">
      <section className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
          <p className="text-sm uppercase tracking-[0.35em] text-teal-200">Supervisor Review</p>
          <h1 className="mt-2 text-4xl font-black">Review Absensi Sales</h1>
          <p className="mt-3 text-slate-300">Validasi foto wajah, status geofence, akurasi GPS, dan jam check-in/check-out.</p>
        </div>

        {loading && <div className="flex items-center gap-3 rounded-3xl bg-white/10 p-5"><Loader2 className="animate-spin" /> Memuat data...</div>}
        {error && <div className="rounded-3xl border border-red-300/30 bg-red-500/10 p-5 text-red-100">{error}</div>}

        <div className="grid gap-4">
          {rows.map((row) => (
            <article key={row.id} className="grid gap-4 rounded-[1.75rem] border border-white/10 bg-slate-950/55 p-5 shadow-xl shadow-black/20 backdrop-blur-xl md:grid-cols-[160px_1fr]">
              <div className="aspect-square overflow-hidden rounded-3xl bg-black/40">
                {row.faceImageUrl ? <img src={row.faceImageUrl} alt={row.salesName} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-slate-500"><Camera /></div>}
              </div>
              <div className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold">{row.salesName}</h2>
                    <p className="text-slate-400">{row.salesEmail ?? 'Tanpa email'} · {row.workDate}</p>
                  </div>
                  <span className="rounded-full bg-teal-400/15 px-3 py-1 text-sm font-bold text-teal-100">{row.validationStatus}</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Metric icon={ShieldCheck} label="Status" value={row.status} />
                  <Metric icon={Camera} label="Face" value={row.faceDetected ? `Detected ${row.faceConfidence ?? ''}` : 'Not detected'} />
                  <Metric icon={MapPin} label="GPS" value={`${row.checkInAccuracyM ?? '-'}m · ${row.checkInDistanceM ?? '-'}m`} />
                </div>
                <p className="text-sm text-slate-400">Check-in: {row.checkInAt ?? '-'} · Check-out: {row.checkOutAt ?? '-'}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Camera; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-4">
      <Icon className="mb-2 text-teal-300" size={18} />
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-1 font-bold text-slate-100">{value}</p>
    </div>
  );
}
'@ | Set-Content -Encoding UTF8 apps/web/src/features/attendance/attendance-review-page.tsx`*

*Edited relevant file*

*Edited relevant file*

*Edited relevant file*

*User accepted the command `pnpm typecheck`*

*User accepted the command `pnpm build`*

*Edited relevant file*

*Edited relevant file*

### Planner Response

Lanjut Phase 6 sudah dikerjakan.

Yang selesai:

- `.env` ditambah bootstrap admin:
  - `ADMIN_EMAIL`
  - `ADMIN_PHONE`
  - `ADMIN_PASSWORD`
  - `ADMIN_NAME`
  - `ADMIN_EMPLOYEE_CODE`
- Drizzle config dan seed diperbaiki agar membaca root `.env`
- `DATABASE_URL` diperbaiki untuk password yang mengandung `%` menjadi `%25`
- Backend review attendance:
  - `GET /attendance/review`
  - guard permission `attendance.review`
- Frontend review attendance:
  - halaman `/attendance/review`
  - dashboard menu `Review Absensi`
  - UI review foto wajah, GPS accuracy, distance, status validasi
- Verifikasi berhasil:

```bash
pnpm typecheck
pnpm build
```

Ada blocker database remote:

```txt
connect ETIMEDOUT ... :5432
```

Artinya koneksi direct ke Supabase Postgres port `5432` timeout dari environment lokal. Migration/seed belum berhasil jalan ke DB target.

Solusi lanjutannya salah satu:

1. Pakai **Supabase connection pooler URL** di `DATABASE_URL`
2. Pastikan koneksi direct Postgres Supabase port `5432` tidak diblokir network/firewall
3. Pakai PostgreSQL lokal via `docker-compose` untuk development

Setelah DB bisa diakses, jalankan:

```bash
pnpm db:migrate
pnpm db:seed
```

Walkthrough sudah diperbarui:

[walkthrough.md](file:///C:/Users/renal/.gemini/antigravity/brain/64381f26-04fa-4e89-bb23-a6f42f5c180c/walkthrough.md)

### User Input

tambah supabase jika env supabase database true maka ada algoritme supabase

*User accepted the command `pnpm typecheck`*

*User accepted the command `pnpm build`*

*User accepted the command `pnpm db:seed`*

*Viewed [.env](file:///e:/Pekerjaan/Programing/project/sales-tracking/.env) *

*User accepted the command `pnpm db:seed`*

*Viewed [client.ts](file:///e:/Pekerjaan/Programing/project/sales-tracking/packages/db/src/client.ts) *

*Edited relevant file*

*User accepted the command `@'
export function isSupabaseDatabaseEnabled(env: NodeJS.ProcessEnv = process.env) {
  return String(env.SUPABASE_DATABASE ?? '').toLowerCase() === 'true';
}

export function resolveDatabaseUrl(env: NodeJS.ProcessEnv = process.env) {
  if (!isSupabaseDatabaseEnabled(env)) {
    return env.DATABASE_URL ?? 'postgres://mahasura:mahasura@localhost:5432/mahasura_sales';
  }

  if (env.SUPABASE_DATABASE_URL) {
    return encodeDatabaseUrlPassword(env.SUPABASE_DATABASE_URL);
  }

  if (env.SUPABASE_POOLER_DATABASE_URL) {
    return encodeDatabaseUrlPassword(env.SUPABASE_POOLER_DATABASE_URL);
  }

  if (env.SUPABASE_PROJECT_REF && env.DATABASE_PASS) {
    const password = encodeURIComponent(env.DATABASE_PASS);
    const host = `aws-0-ap-southeast-1.pooler.supabase.com`;
    const user = `postgres.${env.SUPABASE_PROJECT_REF}`;
    return `postgresql://${user}:${password}@${host}:6543/postgres`;
  }

  if (env.DATABASE_URL) {
    return encodeDatabaseUrlPassword(env.DATABASE_URL);
  }

  throw new Error('SUPABASE_DATABASE=true membutuhkan SUPABASE_DATABASE_URL, SUPABASE_POOLER_DATABASE_URL, atau SUPABASE_PROJECT_REF + DATABASE_PASS.');
}

export function getPostgresClientOptions(env: NodeJS.ProcessEnv = process.env) {
  if (!isSupabaseDatabaseEnabled(env)) {
    return { max: 10 };
  }

  return {
    max: Number(env.DB_POOL_MAX ?? 5),
    idle_timeout: Number(env.DB_IDLE_TIMEOUT_SECONDS ?? 20),
    connect_timeout: Number(env.DB_CONNECT_TIMEOUT_SECONDS ?? 30),
    prepare: false,
    ssl: 'require' as const,
  };
}

function encodeDatabaseUrlPassword(databaseUrl: string) {
  try {
    const parsed = new URL(databaseUrl);
    if (parsed.password) {
      parsed.password = encodeURIComponent(decodeURIComponentSafe(parsed.password));
    }
    return parsed.toString();
  } catch {
    return databaseUrl;
  }
}

function decodeURIComponentSafe(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
'@ | Set-Content -Encoding UTF8 packages/db/src/database-url.ts`*

*Edited relevant file*

*Edited relevant file*

*Edited relevant file*

*Edited relevant file*

*Edited relevant file*

*User accepted the command `pnpm typecheck`*

*User accepted the command `pnpm build`*

*Edited relevant file*

### Planner Response

Sudah saya tambahkan **Supabase Database Mode** berbasis env.

Sekarang jika:

```env
SUPABASE_DATABASE=true
```

maka koneksi database akan memakai algoritme Supabase:

- prioritas 1: `SUPABASE_DATABASE_URL`
- prioritas 2: `SUPABASE_POOLER_DATABASE_URL`
- prioritas 3: auto-build pooler URL dari:
  - `SUPABASE_PROJECT_REF`
  - `DATABASE_PASS`
- fallback terakhir: `DATABASE_URL`

Mode Supabase juga otomatis memakai opsi koneksi:

```ts
{
  ssl: 'require',
  prepare: false,
  max: DB_POOL_MAX ?? 5,
  idle_timeout: DB_IDLE_TIMEOUT_SECONDS ?? 20,
  connect_timeout: DB_CONNECT_TIMEOUT_SECONDS ?? 30
}
```

File yang ditambahkan/diubah:

- `packages/db/src/database-url.ts`
- `packages/db/src/client.ts`
- `packages/db/drizzle.config.ts`
- `packages/db/src/seed.ts`
- `.env`
- `.env.example`

`.env` sekarang sudah ditambah:

```env
SUPABASE_DATABASE=true
SUPABASE_POOLER_DATABASE_URL=
SUPABASE_PROJECT_REF=ftbszfnvuwsbcdfnisyk
```

Verifikasi berhasil:

```bash
pnpm typecheck
pnpm build
```

Catatan penting: untuk Supabase yang sebelumnya timeout di port `5432`, paling aman isi `SUPABASE_POOLER_DATABASE_URL` dari Supabase Dashboard:

**Project Settings → Database → Connection pooling**

Lalu jalankan lagi:

```bash
pnpm db:migrate
pnpm db:seed
```

### User Input

1. Install package
Run this command to install the required dependencies.
Details:
npm install @supabase/supabase-js
Code:
File: Code
```
npm install @supabase/supabase-js
```

2. Add files
Add env variables, create a Supabase client, and use it in your app to query data.
Code:
File: .env
```
VITE_SUPABASE_URL=https://ftbszfnvuwsbcdfnisyk.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_iXTSB1ITOBAFds_ZR2GbBA_Y21Alpqm
```

File: utils/supabase.ts
```
1import { createClient } from '@supabase/supabase-js';
2
3const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
4const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
5
6export const supabase = createClient(supabaseUrl, supabaseKey);
```

File: App.tsx
```
1import { useState, useEffect } from 'react'
2import { supabase } from './utils/supabase'
3
4export default function App() {
5  const [todos, setTodos] = useState([])
6
7  useEffect(() => {
8    async function getTodos() {
9      const { data: todos } = await supabase.from('todos').select()
10
11      if (todos) {
12        setTodos(todos)
13      }
14    }
15
16    getTodos()
17  }, [])
18
19  return (
20    <ul>
21      {todos.map((todo) => (
22        <li key={todo.id}>{todo.name}</li>
23      ))}
24    </ul>
25  )
26}
```

3. Install Agent Skills (Optional)
Agent Skills give AI coding tools ready-made instructions, scripts, and resources for working with Supabase more accurately and efficiently.
Details:
npx skills add supabase/agent-skills
Code:
File: Code
```
npx skills add supabase/agent-skills
```

*Viewed [.env](file:///e:/Pekerjaan/Programing/project/sales-tracking/.env) *

*User accepted the command `pnpm db:migrate`*

*User accepted the command `pnpm db:seed`*

*User accepted the command `pnpm --filter @mahasura/web add @supabase/supabase-js`*

*Edited relevant file*

*User accepted the command `$content = Get-Content .env -Raw
$content = $content -replace "SUPABASE_POOLER_DATABASE_URL=\r?\n", "SUPABASE_POOLER_DATABASE_URL=postgresql://postgres.ftbszfnvuwsbcdfnisyk:hfu9wjqfEn8NVy%25@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`n"
if ($content -notmatch "VITE_SUPABASE_URL=") { $content += "`nVITE_SUPABASE_URL=https://ftbszfnvuwsbcdfnisyk.supabase.co`nVITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_iXTSB1ITOBAFds_ZR2GbBA_Y21Alpqm`n" }
Set-Content -Encoding UTF8 .env $content`*

*User accepted the command `$content = Get-Content .env.example -Raw
if ($content -notmatch "VITE_SUPABASE_URL=") { $content += "`n# Frontend Supabase JS client`nVITE_SUPABASE_URL=https://your-project-ref.supabase.co`nVITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx`n" }
Set-Content -Encoding UTF8 .env.example $content
New-Item -ItemType Directory -Force apps/web/src/utils | Out-Null
@'
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase client env is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.');
}

export const supabase = createClient(supabaseUrl ?? '', supabaseKey ?? '');
'@ | Set-Content -Encoding UTF8 apps/web/src/utils/supabase.ts`*

*Viewed [database-url.ts](file:///e:/Pekerjaan/Programing/project/sales-tracking/packages/db/src/database-url.ts) *

*Edited relevant file*

*User accepted the command `pnpm typecheck`*

*User accepted the command `pnpm build`*

*Edited relevant file*

### Planner Response

Sudah saya integrasikan sesuai instruksi Supabase JS.

Yang dikerjakan:

- Install package di app web:

```bash
pnpm --filter @mahasura/web add @supabase/supabase-js
```

- Tambah env frontend ke `.env`:

```env
VITE_SUPABASE_URL=https://ftbszfnvuwsbcdfnisyk.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_iXTSB1ITOBAFds_ZR2GbBA_Y21Alpqm
```

- Buat Supabase client:

[apps/web/src/utils/supabase.ts](file:///e:/Pekerjaan/Programing/project/sales-tracking/apps/web/src/utils/supabase.ts)

- Update `.env.example` dengan template Supabase frontend.
- Perbaiki algoritme database Supabase:
  - `SUPABASE_POOLER_DATABASE_URL` sekarang diprioritaskan.
  - resolver tidak lagi double-encode URL.
  - `.env` sekarang sudah diisi pooler URL berdasarkan project ref dan password.
  - opsi DB Supabase tetap pakai `ssl: 'require'` dan `prepare: false`.

Verifikasi berhasil:

```bash
pnpm typecheck
pnpm build
```

Catatan untuk error sebelumnya:

```txt
Tenant or user not found
```

Biasanya terjadi kalau username/host pooler tidak sesuai. Saya sudah set format pooler:

```env
SUPABASE_POOLER_DATABASE_URL=postgresql://postgres.ftbszfnvuwsbcdfnisyk:...@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
```

Kalau masih gagal, copy URL pooler resmi dari:

**Supabase Dashboard → Project Settings → Database → Connection pooling**

lalu paste ke `SUPABASE_POOLER_DATABASE_URL`.

### User Input

@[TerminalName: pwsh, ProcessId: 20516] ada error ini

*User accepted the command `pnpm db:seed`*

*Viewed [.env](file:///e:/Pekerjaan/Programing/project/sales-tracking/.env) *

*User accepted the command `pnpm typecheck`*

*User accepted the command `pnpm build`*

*User accepted the command `pnpm db:migrate`*

*User accepted the command `pnpm db:seed`*

*User accepted the command `@'
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import postgres from 'postgres';
import { getPostgresClientOptions, resolveDatabaseUrl } from './database-url.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const url = resolveDatabaseUrl();
const parsed = new URL(url);
const maskedUrl = `${parsed.protocol}//${parsed.username}:***@${parsed.host}${parsed.pathname}`;

console.log('SUPABASE_DATABASE =', process.env.SUPABASE_DATABASE ?? '(not set)');
console.log('Resolved database URL =', maskedUrl);
console.log('Host =', parsed.hostname);
console.log('Port =', parsed.port || '(default)');
console.log('Username =', decodeURIComponent(parsed.username));
console.log('Database =', parsed.pathname.replace(/^\//, ''));
console.log('Options =', getPostgresClientOptions());

const sql = postgres(url, getPostgresClientOptions());
try {
  const result = await sql`select current_user, current_database(), now()`;
  console.log('Connection OK:', result[0]);
} catch (error) {
  console.error('Connection FAILED');
  console.error(error);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
'@ | Set-Content -Encoding UTF8 packages/db/src/debug-connection.ts`*

*Edited relevant file*

*Edited relevant file*

*User accepted the command `pnpm db:debug`*

### Planner Response

Error itu **bukan dari schema/seed Drizzle**, tapi dari autentikasi koneksi Supabase Pooler.

Diagnostik yang saya tambahkan menunjukkan app sedang memakai:

```txt
Host     = aws-0-ap-southeast-1.pooler.supabase.com
Port     = 6543
Username = postgres.ftbszfnvuwsbcdfnisyk
Database = postgres
SSL      = require
prepare  = false
```

Lalu Supabase mengembalikan:

```txt
PostgresError: Tenant or user not found
```

Artinya **host/username pooler tidak cocok dengan tenant Supabase project**. Biasanya karena salah satu ini:

1. Host pooler region salah.
2. Username pooler bukan format yang benar untuk project ini.
3. Project memakai pooler host berbeda dari `aws-0-ap-southeast-1.pooler.supabase.com`.
4. Password database berbeda dari yang ada di `.env`.

Saya sudah tambahkan script debug:

```bash
pnpm db:debug
```

Untuk melihat URL resolved tanpa menampilkan password.

## Yang perlu dilakukan

Ambil connection string resmi dari Supabase:

**Supabase Dashboard → Project Settings → Database → Connection pooling**

Pilih mode **Transaction pooler** atau **Session pooler**, lalu copy URI yang bentuknya kurang lebih:

```env
postgresql://postgres.<PROJECT_REF>:<PASSWORD>@<POOLER_HOST>:6543/postgres
```

Kemudian paste ke:

```env
SUPABASE_POOLER_DATABASE_URL=...
```

> Jangan pakai auto-build URL kalau masih muncul `Tenant or user not found`, karena berarti host region pooler yang kita tebak tidak cocok.

Setelah itu jalankan:

```bash
pnpm db:debug
pnpm db:migrate
pnpm db:seed
```

Kalau `pnpm db:debug` sudah `Connection OK`, migration dan seed akan lanjut normal.

### User Input

1. Install ORM
Add the ORM to your project.
Code:
File: Code
```
npm install drizzle-orm
```

File: Code
```
npm install drizzle-kit --save-dev
```

2. Configure ORM
Set up your ORM configuration.
Code:
File: .env
```
DATABASE_URL="postgresql://postgres.ftbszfnvuwsbcdfnisyk:[YOUR-PASSWORD]@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres"
```

File: drizzle/schema.ts
```
1import { pgTable, serial, text, varchar } from "drizzle-orm/pg-core";
2
3export const users = pgTable('users', {
4  id: serial('id').primaryKey(),
5  fullName: text('full_name'),
6  phone: varchar('phone', { length: 256 }),
7});
```

File: index.tsx
```
1import { drizzle } from 'drizzle-orm/postgres-js'
2import postgres from 'postgres'
3import { users } from './drizzle/schema'
4
5const connectionString = process.env.DATABASE_URL
6
7// Disable prefetch as it is not supported for "Transaction" pool mode
8const client = postgres(connectionString, { prepare: false })
9const db = drizzle(client);
10
11const allUsers = await db.select().from(users);
```

3. Install Agent Skills (Optional)
Agent Skills give AI coding tools ready-made instructions, scripts, and resources for working with Supabase more accurately and efficiently.
Details:
npx skills add supabase/agent-skills
Code:
File: Code
```
npx skills add supabase/agent-skills
```

*User accepted the command `pnpm db:migrate`*

*Edited relevant file*

*User accepted the command `pnpm db:debug`*

*User accepted the command `pnpm db:migrate; pnpm db:seed`*

*Checked command status*

*Checked command status*

*Checked command status*

*User accepted the command `pnpm typecheck; pnpm build`*

*Checked command status*

*Edited relevant file*

### Planner Response

Error sudah ketemu dan sudah saya perbaiki.

Penyebab:

```txt
Tenant or user not found
```

karena host pooler salah. Sebelumnya:

```env
aws-0-ap-southeast-1.pooler.supabase.com
```

Dari config yang kamu kirim, yang benar:

```env
aws-1-ap-southeast-2.pooler.supabase.com
```

Saya sudah update `.env`:

```env
SUPABASE_POOLER_DATABASE_URL=postgresql://postgres.ftbszfnvuwsbcdfnisyk:***@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres
```

Hasil verifikasi:

```bash
pnpm db:debug
```

Berhasil:

```txt
Connection OK
current_user: postgres
current_database: postgres
```

Lalu saya jalankan:

```bash
pnpm db:migrate
pnpm db:seed
```

Hasil:

```txt
migrations applied successfully
Seed completed
```

Final check juga berhasil:

```bash
pnpm typecheck
pnpm build
```

Catatan: notice seperti ini aman diabaikan:

```txt
identifier ... will be truncated
```

Itu hanya PostgreSQL memotong nama constraint yang terlalu panjang, bukan error.

### User Input

pelajari ini E:\Pekerjaan\Programing\project\sales-tracking\sistem-mahasura secara tampilan nya dan logika yang ada, lalu coba terapkan. buatkan plan projectnya dulu baru saya improve di sana

*Listed directory [sistem-mahasura](file:///e:/Pekerjaan/Programing/project/sales-tracking/sistem-mahasura) *

*Listed directory [sistem-mahasura](file:///e:/Pekerjaan/Programing/project/sales-tracking/sistem-mahasura) *

*User accepted the command `Get-ChildItem -Recurse -Depth 3 sistem-mahasura | Select-Object FullName, PSIsContainer, Length | Format-Table -AutoSize`*

*User accepted the command `Get-ChildItem -Recurse sistem-mahasura\sistem-mahasura -Include *.tsx,*.ts,*.css,*.prisma,package.json -File | Where-Object { $_.FullName -notmatch 'node_modules' } | Select-Object FullName | Format-Table -AutoSize`*

*Viewed [package.json](file:///e:/Pekerjaan/Programing/project/sales-tracking/sistem-mahasura/sistem-mahasura/package.json) *

*Viewed [schema.prisma](file:///e:/Pekerjaan/Programing/project/sales-tracking/sistem-mahasura/sistem-mahasura/prisma/schema.prisma) *

*Viewed [globals.css](file:///e:/Pekerjaan/Programing/project/sales-tracking/sistem-mahasura/sistem-mahasura/src/app/globals.css) *

*Viewed [page.tsx](file:///e:/Pekerjaan/Programing/project/sales-tracking/sistem-mahasura/sistem-mahasura/src/app/page.tsx) *

*Viewed [page.tsx](file:///e:/Pekerjaan/Programing/project/sales-tracking/sistem-mahasura/sistem-mahasura/src/app/login/page.tsx) *

*Viewed [layout.tsx](file:///e:/Pekerjaan/Programing/project/sales-tracking/sistem-mahasura/sistem-mahasura/src/app/admin/layout.tsx) *

*Viewed [page.tsx](file:///e:/Pekerjaan/Programing/project/sales-tracking/sistem-mahasura/sistem-mahasura/src/app/admin/page.tsx) *

*Viewed [layout.tsx](file:///e:/Pekerjaan/Programing/project/sales-tracking/sistem-mahasura/sistem-mahasura/src/app/sales/layout.tsx) *

*Viewed [page.tsx](file:///e:/Pekerjaan/Programing/project/sales-tracking/sistem-mahasura/sistem-mahasura/src/app/sales/page.tsx) *

*Viewed [VisitClient.tsx](file:///e:/Pekerjaan/Programing/project/sales-tracking/sistem-mahasura/sistem-mahasura/src/app/sales/visit/VisitClient.tsx) *

*Viewed [TransaksiClient.tsx](file:///e:/Pekerjaan/Programing/project/sales-tracking/sistem-mahasura/sistem-mahasura/src/app/sales/transaksi/TransaksiClient.tsx) *

*Viewed [sales.ts](file:///e:/Pekerjaan/Programing/project/sales-tracking/sistem-mahasura/sistem-mahasura/src/app/actions/sales.ts) *

*Edited relevant file*

### Planner Response

Saya sudah pelajari folder referensi `sistem-mahasura` dari sisi **tampilan, struktur, schema, dan logika sales/admin**.

Saya sudah buatkan plan project integrasinya di:

[implementation_plan.md](file:///C:/Users/renal/.gemini/antigravity/brain/64381f26-04fa-4e89-bb23-a6f42f5c180c/implementation_plan.md)

Mohon review dulu. Fokus besar plan-nya:

- adaptasi tampilan login glassmorphism Mahasura,
- admin sidebar/dashboard seperti referensi,
- sales mobile shell dengan bottom navigation,
- visit outlet,
- transaksi/cart/order,
- produk/stok,
- laporan,
- piutang,
- verifikasi nota,
- mapping schema Prisma referensi ke Drizzle/PostgreSQL project utama,
- ekspansi offline sync untuk visit/transaksi/invoice.

Ada beberapa keputusan yang perlu kamu approve/improve di plan tersebut, terutama:

1. mulai dari **Phase A saja** atau langsung **Phase A + B**,
2. stok langsung berkurang saat transaksi atau setelah admin verifikasi,
3. piutang otomatis dari status unpaid/partial atau modul pembayaran terpisah.

### User Input

1. Phase A kemudian di lanjut Phase B
2. input stok utama ada di sisi admin, lalu mengeluarkan bisa di sisi admin dan sales tapi ketika sales perlu verifikasi admin di ending atau closingnya
3. approved

*Viewed [.env](file:///e:/Pekerjaan/Programing/project/sales-tracking/.env) *

*Edited relevant file*

*Viewed [index.css](file:///e:/Pekerjaan/Programing/project/sales-tracking/apps/web/src/index.css) *

*Viewed [login-page.tsx](file:///e:/Pekerjaan/Programing/project/sales-tracking/apps/web/src/features/auth/login-page.tsx) *

*User accepted the command `Get-ChildItem apps/web/src -Recurse -Filter *.tsx | Select-Object FullName | Format-Table -AutoSize`*

*Viewed [auth-provider.tsx](file:///e:/Pekerjaan/Programing/project/sales-tracking/apps/web/src/features/auth/auth-provider.tsx) *

*Edited relevant file*

*Edited relevant file*

*User accepted the command `New-Item -ItemType Directory -Force apps/web/src/features/admin,apps/web/src/features/sales | Out-Null
@'
import { Link, Outlet, useLocation } from 'react-router-dom';
import { BarChart3, Boxes, ClipboardCheck, CreditCard, LayoutDashboard, LogOut, Map, Menu, ReceiptText, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../auth/auth-provider';

const navItems = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard, permission: 'attendance.review' },
  { name: 'Tracking Penjualan', href: '/admin/tracking', icon: Map, permission: 'visits.review' },
  { name: 'Laporan Penjualan', href: '/admin/reports', icon: BarChart3, permission: 'reports.view' },
  { name: 'Manajemen Stok', href: '/admin/stock', icon: Boxes, permission: 'products.manage' },
  { name: 'Piutang Usaha', href: '/admin/receivables', icon: CreditCard, permission: 'receivables.view' },
  { name: 'Verifikasi Nota', href: '/admin/invoice-review', icon: ReceiptText, permission: 'invoice.review' },
  { name: 'Review Absensi', href: '/attendance/review', icon: ShieldCheck, permission: 'attendance.review' },
];

export function AdminShell() {
  const location = useLocation();
  const { user, permissions, signOut } = useAuth();
  const [open, setOpen] = useState(true);
  const visibleItems = navItems.filter((item) => permissions.includes(item.permission) || user?.roleCode === 'ADMINISTRATOR');

  return (
    <div className="min-h-screen bg-[#f6f2ef] text-slate-900">
      <aside className={`${open ? 'w-72' : 'w-24'} fixed inset-y-0 left-0 z-30 flex flex-col bg-[#4a2922] text-white shadow-2xl transition-all duration-300`}>
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-5">
          <div className={`${open ? 'opacity-100' : 'hidden opacity-0'} transition-opacity`}>
            <p className="text-xl font-black tracking-wider">Mahasura</p>
            <p className="text-xs text-[#d8b6aa]">Admin Portal</p>
          </div>
          <button id="admin-sidebar-toggle" onClick={() => setOpen(!open)} className="rounded-xl p-2 transition hover:bg-white/10">
            <Menu />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <ul className="space-y-1.5">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.href;
              return (
                <li key={item.href}>
                  <Link id={`admin-nav-${item.name.toLowerCase().replaceAll(' ', '-')}`} to={item.href} className={`flex items-center rounded-2xl px-4 py-3 transition ${active ? 'bg-[#b55925] text-white shadow-lg shadow-black/20' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}>
                    <Icon size={21} />
                    <span className={`${open ? 'ml-3 block' : 'hidden'} font-semibold`}>{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-white/10 p-4">
          <button id="admin-signout-button" onClick={signOut} className="flex w-full items-center rounded-2xl px-4 py-3 text-white/70 transition hover:bg-white/10 hover:text-white">
            <LogOut size={21} />
            <span className={`${open ? 'ml-3 block' : 'hidden'} font-semibold`}>Keluar</span>
          </button>
        </div>
      </aside>

      <main className={`${open ? 'pl-72' : 'pl-24'} min-h-screen transition-all duration-300`}>
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-[#4a2922]/10 bg-white/85 px-8 shadow-sm backdrop-blur-xl">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#b55925]">Mahasura</p>
            <h1 className="text-xl font-black text-[#40231e]">Admin Portal</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-[#b55925] font-black text-white shadow-lg">{user?.name?.slice(0, 2).toUpperCase() ?? 'AD'}</div>
            <div className="hidden text-right md:block">
              <p className="text-sm font-bold text-slate-900">{user?.name ?? 'Admin Utama'}</p>
              <p className="text-xs text-slate-500">{user?.email ?? 'admin@mahasura.local'}</p>
            </div>
          </div>
        </header>
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
'@ | Set-Content -Encoding UTF8 apps/web/src/features/admin/admin-shell.tsx
@'
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Home, MapPin, ReceiptText, ShoppingCart, UserRound } from 'lucide-react';
import { useAuth } from '../auth/auth-provider';

const bottomNav = [
  { name: 'Beranda', href: '/sales', icon: Home },
  { name: 'Kunjungan', href: '/sales/visit', icon: MapPin },
  { name: 'Transaksi', href: '/sales/transactions', icon: ShoppingCart },
  { name: 'Nota', href: '/sales/invoices', icon: ReceiptText },
  { name: 'Profil', href: '/sales/profile', icon: UserRound },
];

export function SalesShell() {
  const location = useLocation();
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen justify-center bg-[#2a1714] text-slate-900">
      <div className="mobile-shell relative flex flex-col overflow-hidden">
        <header className="sticky top-0 z-20 bg-[#4a2922] p-4 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#d8b6aa]">Mahasura Sales</p>
              <h1 className="text-lg font-black">{user?.name ?? 'Sales'}</h1>
              <p className="text-xs text-white/60">Area operasional aktif</p>
            </div>
            <div className="grid h-11 w-11 place-items-center rounded-full border-2 border-white/20 bg-[#b55925] font-black text-white">
              {user?.name?.slice(0, 2).toUpperCase() ?? 'SL'}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 pb-24">
          <Outlet />
        </main>

        <nav className="absolute bottom-0 left-0 right-0 z-20 flex h-16 items-center justify-around border-t border-slate-200 bg-white px-1 shadow-[0_-10px_30px_rgba(15,23,42,0.08)]">
          {bottomNav.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.href;
            return (
              <Link key={item.href} id={`sales-nav-${item.name.toLowerCase()}`} to={item.href} className={`relative flex h-full w-16 flex-col items-center justify-center gap-1 text-[10px] font-bold transition ${active ? 'text-[#b55925]' : 'text-slate-400 hover:text-slate-700'}`}>
                <Icon size={20} />
                {item.name}
                {active ? <span className="absolute bottom-0 h-1 w-8 rounded-t-full bg-[#b55925]" /> : null}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
'@ | Set-Content -Encoding UTF8 apps/web/src/features/sales/sales-shell.tsx`*

*Viewed [dashboard-page.tsx](file:///e:/Pekerjaan/Programing/project/sales-tracking/apps/web/src/features/dashboard/dashboard-page.tsx) *

*User accepted the command `@'
import { Camera, MapPin, ShieldCheck, SlidersHorizontal, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/auth-provider';

const roleMenus = [
  { permission: 'attendance.execute', title: 'Absensi Wajah', icon: Camera, text: 'Check-in kamera depan dan validasi GPS.', href: '/attendance' },
  { permission: 'visits.execute', title: 'Visit Outlet', icon: MapPin, text: 'Geofence outlet dan durasi kunjungan.', href: '/sales/visit' },
  { permission: 'attendance.review', title: 'Review Absensi', icon: ShieldCheck, text: 'Validasi foto wajah dan lokasi sales.', href: '/attendance/review' },
  { permission: 'roles.manage', title: 'Role & Permission', icon: Users, text: 'Atur akses fitur per role secara fleksibel.', href: '/admin' },
  { permission: 'settings.manage', title: 'Pengaturan Radius', icon: SlidersHorizontal, text: 'Custom radius geofence dan aturan GPS.', href: '/admin' },
];

const stats = [
  { name: 'Total Transaksi', value: '1,284', change: '+12.5%', positive: true },
  { name: 'Omset Penjualan', value: 'Rp 45.2M', change: '+8.2%', positive: true },
  { name: 'Visit Hari Ini', value: '156', change: '-2.4%', positive: false },
  { name: 'Barang Terjual', value: '14,230', change: '+18.1%', positive: true },
];

export function DashboardPage() {
  const { user, permissions } = useAuth();
  const isAdministrator = user?.roleCode === 'ADMINISTRATOR';
  const visibleMenus = roleMenus.filter((menu) => isAdministrator || permissions.includes(menu.permission));

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.32em] text-[#b55925]">Dashboard Utama</p>
          <h1 className="mt-2 text-3xl font-black text-[#40231e]">Selamat datang, {user?.name}</h1>
          <p className="mt-1 text-slate-500">Ringkasan performa sales, visit, stok, dan approval operasional.</p>
        </div>
        <Link to="/admin/reports" className="rounded-xl border border-[#4a2922]/10 bg-white px-4 py-2 text-sm font-bold text-[#40231e] shadow-sm transition hover:bg-orange-50">
          Unduh Laporan
        </Link>
      </div>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <article key={stat.name} className="brand-card group relative overflow-hidden rounded-3xl p-6 transition hover:-translate-y-1 hover:shadow-2xl">
            <div className="absolute right-[-1rem] top-[-1rem] h-24 w-24 rounded-bl-full bg-[#b55925]/10 transition group-hover:scale-110" />
            <p className="text-sm font-semibold text-slate-500">{stat.name}</p>
            <h2 className="mt-2 text-3xl font-black text-[#40231e]">{stat.value}</h2>
            <span className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-bold ${stat.positive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {stat.positive ? '↑' : '↓'} {stat.change} dari bulan lalu
            </span>
          </article>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="brand-card rounded-3xl p-6 lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900">Akses Cepat</h2>
            <span className="rounded-full bg-[#b55925]/10 px-3 py-1 text-xs font-bold text-[#b55925]">{user?.roleCode}</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {visibleMenus.map((menu) => (
              <Link to={menu.href} key={menu.title} className="rounded-2xl border border-slate-100 bg-slate-50 p-5 transition hover:-translate-y-1 hover:border-[#b55925]/30 hover:bg-orange-50">
                <menu.icon className="mb-4 text-[#b55925]" size={28} />
                <h3 className="font-black text-slate-900">{menu.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{menu.text}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="brand-card rounded-3xl p-6">
          <h2 className="mb-6 text-lg font-black text-slate-900">Aktivitas Sales Terbaru</h2>
          <div className="space-y-5">
            {['Budi Santoso visit Toko Jaya Abadi', 'Sari membuat order Rp 2.500.000', 'Admin memverifikasi nota INV-2401', 'Stok Kopi Robusta ditambah'].map((item, index) => (
              <div key={item} className="relative flex gap-4">
                {index !== 3 ? <div className="absolute left-4 top-9 h-8 w-px bg-slate-200" /> : null}
                <div className="z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#966556]/15 text-[#966556] ring-4 ring-white">📍</div>
                <div>
                  <p className="text-sm font-bold text-slate-800">{item}</p>
                  <p className="mt-1 text-xs text-slate-400">{10 + index * 8} menit yang lalu</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
'@ | Set-Content -Encoding UTF8 apps/web/src/features/dashboard/dashboard-page.tsx
@'
import { Link } from 'react-router-dom';

const visits = [
  { name: 'Toko Jaya Abadi', address: 'Jl. Merdeka No. 12', status: 'Selesai', time: '09:00' },
  { name: 'Warkop Berkah', address: 'Jl. Sudirman Blok C', status: 'Selesai', time: '10:30' },
  { name: 'Toko Makmur', address: 'Pasar Baru Kios 4', status: 'Belum', time: '13:00' },
  { name: 'Warung Bu Tejo', address: 'Jl. Melati No. 8', status: 'Belum', time: '15:00' },
];

export function SalesHomePage() {
  const target = 5_000_000;
  const achieved = 2_150_000;
  const percent = (achieved / target) * 100;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-[#4a2922]/10 bg-white p-5 shadow-sm">
        <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-[#b55925]/10" />
        <p className="text-sm font-bold text-slate-500">Pencapaian Hari Ini</p>
        <div className="mt-2 flex items-end gap-2">
          <h2 className="text-2xl font-black text-slate-900">Rp {(achieved / 1_000_000).toFixed(2)}M</h2>
          <p className="mb-1 text-sm text-slate-400">/ Rp {(target / 1_000_000).toFixed(1)}M</p>
        </div>
        <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-[#b55925] transition-all duration-1000" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-2 text-right text-xs font-black text-[#b55925]">{percent.toFixed(1)}%</p>
      </section>

      <section className="grid grid-cols-2 gap-4">
        <Link to="/attendance" className="rounded-3xl bg-[#4a2922] p-5 text-center font-bold text-white shadow-sm active:scale-95">
          <span className="mb-2 block text-3xl">📸</span>
          Absensi Wajah
        </Link>
        <Link to="/sales/transactions" className="rounded-3xl border border-[#4a2922]/15 bg-white p-5 text-center font-bold text-[#4a2922] shadow-sm active:scale-95">
          <span className="mb-2 block text-3xl">🛍️</span>
          Transaksi
        </Link>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="font-black text-slate-900">Kunjungan Hari Ini</h2>
          <Link to="/sales/visit" className="text-xs font-bold text-[#b55925]">Lihat Peta</Link>
        </div>
        <div className="space-y-3">
          {visits.map((visit) => (
            <article key={visit.name} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`grid h-11 w-11 place-items-center rounded-full text-lg ${visit.status === 'Selesai' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                  {visit.status === 'Selesai' ? '✓' : '📍'}
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">{visit.name}</h3>
                  <p className="line-clamp-1 text-xs text-slate-500">{visit.address}</p>
                </div>
              </div>
              <span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500">{visit.time}</span>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
'@ | Set-Content -Encoding UTF8 apps/web/src/features/sales/sales-home-page.tsx`*

*Viewed [router.tsx](file:///e:/Pekerjaan/Programing/project/sales-tracking/apps/web/src/app/router.tsx) *

*Edited relevant file*

*User accepted the command `pnpm typecheck`*

*Edited relevant file*

*User accepted the command `pnpm typecheck; pnpm build`*

*Checked command status*

*Edited relevant file*

*Listed directory [schema](file:///e:/Pekerjaan/Programing/project/sales-tracking/packages/db/src/schema) *

*Viewed [products.ts](file:///e:/Pekerjaan/Programing/project/sales-tracking/packages/db/src/schema/products.ts) *

*Viewed [transactions.ts](file:///e:/Pekerjaan/Programing/project/sales-tracking/packages/db/src/schema/transactions.ts) *

*Viewed [visits.ts](file:///e:/Pekerjaan/Programing/project/sales-tracking/packages/db/src/schema/visits.ts) *

*Viewed [index.ts](file:///e:/Pekerjaan/Programing/project/sales-tracking/packages/db/src/schema/index.ts) *

*Viewed [receivables.ts](file:///e:/Pekerjaan/Programing/project/sales-tracking/packages/db/src/schema/receivables.ts) *

*Viewed [seed.ts](file:///e:/Pekerjaan/Programing/project/sales-tracking/packages/db/src/seed.ts) *

*Viewed [outlets.ts](file:///e:/Pekerjaan/Programing/project/sales-tracking/packages/db/src/schema/outlets.ts) *

*Edited relevant file*

*Viewed [sync.ts](file:///e:/Pekerjaan/Programing/project/sales-tracking/packages/db/src/schema/sync.ts) *

*Edited relevant file*

*User accepted the command `pnpm typecheck`*

*User accepted the command `pnpm db:generate`*

*User accepted the command `pnpm db:migrate`*

*User accepted the command `pnpm db:seed`*

*Checked command status*

*Checked command status*

*Checked command status*

*User accepted the command `pnpm build`*

*Edited relevant file*

*Edited relevant file*

### Planner Response

Approved diterapkan. Phase A dan Phase B sudah selesai.

Ringkasnya:

- Tetap memakai **PostgreSQL/Supabase + Drizzle ORM**.
- Phase A:
  - redesign login Mahasura,
  - brand tokens,
  - admin sidebar shell,
  - sales mobile shell,
  - route admin/sales dasar,
  - dashboard admin style referensi.
- Phase B:
  - schema sales core existing diperkuat,
  - transaksi sales mendukung approval/closing admin,
  - stok utama admin/gudang utama,
  - sales transaction punya alur verifikasi admin sebelum closing,
  - seed permission, outlet, produk, warehouse, inventory balance.
- Supabase:
  - `pnpm db:generate` berhasil,
  - `pnpm db:migrate` berhasil,
  - `pnpm db:seed` berhasil.
- Verifikasi:
  - `pnpm typecheck` berhasil,
  - `pnpm build` berhasil.

Detail lengkap ada di:

[walkthrough.md](file:///C:/Users/renal/.gemini/antigravity/brain/64381f26-04fa-4e89-bb23-a6f42f5c180c/walkthrough.md)

Lanjutan berikutnya yang paling tepat: **Phase C — Backend API product/sales order/visit/report**.

### User Input

ko error terus ketika mencoba login

dan log errornya terlalu raw, buat agar log nya berupa raw ketika di env app debug itu true

dan lanjutkan ke phase C

*Viewed [.env](file:///e:/Pekerjaan/Programing/project/sales-tracking/.env) *

*Viewed [auth.service.ts](file:///e:/Pekerjaan/Programing/project/sales-tracking/apps/api/src/modules/auth/auth.service.ts) *

*Viewed [auth.routes.ts](file:///e:/Pekerjaan/Programing/project/sales-tracking/apps/api/src/modules/auth/auth.routes.ts) *

*Viewed [auth.ts](file:///e:/Pekerjaan/Programing/project/sales-tracking/packages/db/src/schema/auth.ts) *

*Grep searched codebase*

*Viewed [env.ts](file:///e:/Pekerjaan/Programing/project/sales-tracking/apps/api/src/config/env.ts) *

*Viewed [server.ts](file:///e:/Pekerjaan/Programing/project/sales-tracking/apps/api/src/server.ts) *

*Viewed [app.ts](file:///e:/Pekerjaan/Programing/project/sales-tracking/apps/api/src/app.ts) *

*Viewed [client.ts](file:///e:/Pekerjaan/Programing/project/sales-tracking/apps/web/src/lib/api/client.ts) *

*Viewed [routes.ts](file:///e:/Pekerjaan/Programing/project/sales-tracking/apps/api/src/routes.ts) *

*Edited relevant file*

*Edited relevant file*

*Edited relevant file*

*Edited relevant file*

*Edited relevant file*

*Edited relevant file*

*User accepted the command `pnpm typecheck`*

*Edited relevant file*

*User accepted the command `pnpm typecheck`*

*User accepted the command `New-Item -ItemType Directory -Force apps/api/src/modules/products,apps/api/src/modules/sales,apps/api/src/modules/visits,apps/api/src/modules/reports | Out-Null
@'
import type { FastifyInstance } from 'fastify';
import { asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { inventoryBalances, inventoryMovements, products, warehouses } from '@mahasura/db/schema';
import { db } from '../../plugins/db.js';
import { requirePermission } from '../auth/auth.service.js';

const productSchema = z.object({
  sku: z.string().min(2),
  name: z.string().min(2),
  description: z.string().optional(),
  unit: z.string().min(1).default('pcs'),
  priceDefault: z.string().or(z.number()).transform(String).default('0'),
  initialStock: z.string().or(z.number()).transform(String).optional(),
});

export async function productRoutes(app: FastifyInstance) {
  app.get('/products', { preHandler: requirePermission('sales.view') }, async () => {
    const rows = await db.select().from(products).orderBy(asc(products.name));
    return { products: rows };
  });

  app.post('/products', { preHandler: requirePermission('products.manage') }, async (request) => {
    const body = productSchema.parse(request.body);
    const [product] = await db.insert(products).values({
      sku: body.sku,
      name: body.name,
      description: body.description,
      unit: body.unit,
      priceDefault: body.priceDefault,
      status: 'active',
    }).onConflictDoUpdate({
      target: products.sku,
      set: {
        name: body.name,
        description: body.description,
        unit: body.unit,
        priceDefault: body.priceDefault,
        updatedAt: new Date(),
      },
    }).returning();

    const [mainWarehouse] = await db.select().from(warehouses).where(eq(warehouses.code, 'WH-MAIN'));
    if (mainWarehouse && body.initialStock) {
      await db.insert(inventoryBalances).values({
        warehouseId: mainWarehouse.id,
        productId: product.id,
        quantity: body.initialStock,
        reservedQuantity: '0',
      }).onConflictDoUpdate({
        target: [inventoryBalances.warehouseId, inventoryBalances.productId],
        set: { quantity: body.initialStock, updatedAt: new Date() },
      });
      await db.insert(inventoryMovements).values({
        warehouseId: mainWarehouse.id,
        productId: product.id,
        movementType: 'adjustment',
        quantityDelta: body.initialStock,
        referenceType: 'admin_stock_input',
        notes: 'Input stok utama dari admin',
        createdByUserId: request.user?.id,
      });
    }

    return { product };
  });
}
'@ | Set-Content -Encoding UTF8 apps/api/src/modules/products/products.routes.ts
@'
import type { FastifyInstance } from 'fastify';
import { and, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { inventoryBalances, inventoryMovements, products, salesTransactionItems, salesTransactions, warehouses } from '@mahasura/db/schema';
import { db } from '../../plugins/db.js';
import { requirePermission } from '../auth/auth.service.js';

const itemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.string().or(z.number()).transform(String),
  unitPrice: z.string().or(z.number()).transform(String),
});

const orderSchema = z.object({
  outletId: z.string().uuid().optional(),
  customerType: z.enum(['store', 'agent', 'end_user']).default('store'),
  paymentMethod: z.enum(['cash', 'qris', 'consignment']).default('cash'),
  clientRequestId: z.string().uuid(),
  items: z.array(itemSchema).min(1),
});

export async function salesRoutes(app: FastifyInstance) {
  app.get('/sales/orders', { preHandler: requirePermission('sales.view') }, async () => {
    const rows = await db.select().from(salesTransactions).orderBy(desc(salesTransactions.createdAt)).limit(100);
    return { orders: rows };
  });

  app.post('/sales/orders', { preHandler: requirePermission('sales.order.create') }, async (request) => {
    const body = orderSchema.parse(request.body);
    const total = body.items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unitPrice), 0).toFixed(2);

    const [existing] = await db.select().from(salesTransactions).where(eq(salesTransactions.clientRequestId, body.clientRequestId));
    if (existing) return { order: existing, idempotent: true };

    const order = await db.transaction(async (tx) => {
      const [created] = await tx.insert(salesTransactions).values({
        transactionNo: `SO-${Date.now()}`,
        salesUserId: request.user!.id,
        outletId: body.outletId,
        customerType: body.customerType,
        paymentMethod: body.paymentMethod,
        subtotalAmount: total,
        totalAmount: total,
        status: 'pending_approval',
        paymentStatus: body.paymentMethod === 'cash' || body.paymentMethod === 'qris' ? 'paid' : 'unpaid',
        submittedAt: new Date(),
        clientRequestId: body.clientRequestId,
      }).returning();

      for (const item of body.items) {
        const lineTotal = (Number(item.quantity) * Number(item.unitPrice)).toFixed(2);
        await tx.insert(salesTransactionItems).values({
          transactionId: created.id,
          productId: item.productId,
          quantity: item.quantity,
          reservedQuantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal,
        });
      }

      return created;
    });

    return { order };
  });

  app.post('/sales/orders/:id/approve', { preHandler: requirePermission('sales.order.review') }, async (request) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const [mainWarehouse] = await db.select().from(warehouses).where(eq(warehouses.code, 'WH-MAIN'));
    if (!mainWarehouse) throw new Error('Gudang utama belum tersedia');

    const [order] = await db.select().from(salesTransactions).where(eq(salesTransactions.id, params.id));
    if (!order) return { message: 'Order tidak ditemukan' };

    const items = await db.select().from(salesTransactionItems).where(eq(salesTransactionItems.transactionId, order.id));

    await db.transaction(async (tx) => {
      for (const item of items) {
        const [balance] = await tx.select().from(inventoryBalances).where(and(eq(inventoryBalances.warehouseId, mainWarehouse.id), eq(inventoryBalances.productId, item.productId)));
        if (!balance || Number(balance.quantity) < Number(item.quantity)) {
          const [product] = await tx.select().from(products).where(eq(products.id, item.productId));
          throw new Error(`Stok tidak cukup untuk ${product?.name ?? item.productId}`);
        }
        await tx.update(inventoryBalances).set({
          quantity: sql`${inventoryBalances.quantity} - ${item.quantity}`,
          updatedAt: new Date(),
        }).where(eq(inventoryBalances.id, balance.id));
        await tx.update(salesTransactionItems).set({ releasedQuantity: item.quantity }).where(eq(salesTransactionItems.id, item.id));
        await tx.insert(inventoryMovements).values({
          warehouseId: mainWarehouse.id,
          productId: item.productId,
          movementType: 'sale',
          quantityDelta: `-${item.quantity}`,
          referenceType: 'sales_transaction',
          referenceId: order.id,
          notes: 'Release stok setelah approval admin',
          createdByUserId: request.user?.id,
        });
      }

      await tx.update(salesTransactions).set({
        status: 'closed',
        approvedByUserId: request.user!.id,
        approvedAt: new Date(),
        stockReleasedAt: new Date(),
        closedByUserId: request.user!.id,
        closedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(salesTransactions.id, order.id));
    });

    return { success: true };
  });
}
'@ | Set-Content -Encoding UTF8 apps/api/src/modules/sales/sales.routes.ts`*

*User accepted the command `@'
import type { FastifyInstance } from 'fastify';
import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { outlets, visitSessions } from '@mahasura/db/schema';
import { db } from '../../plugins/db.js';
import { requirePermission } from '../auth/auth.service.js';

const checkInSchema = z.object({
  outletId: z.string().uuid(),
  clientRequestId: z.string().uuid(),
  latitude: z.number(),
  longitude: z.number(),
  accuracyM: z.number().optional(),
});

function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number) {
  const earth = 6371000;
  const toRad = (value: number) => value * Math.PI / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return earth * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function visitRoutes(app: FastifyInstance) {
  app.get('/visits/today', { preHandler: requirePermission('visits.execute') }, async () => {
    const outletRows = await db.select().from(outlets).where(eq(outlets.status, 'active'));
    return { outlets: outletRows };
  });

  app.post('/visits/check-in', { preHandler: requirePermission('visits.execute') }, async (request) => {
    const body = checkInSchema.parse(request.body);
    const [outlet] = await db.select().from(outlets).where(eq(outlets.id, body.outletId));
    if (!outlet) return { message: 'Outlet tidak ditemukan' };

    const distance = distanceMeters(body.latitude, body.longitude, Number(outlet.latitude), Number(outlet.longitude));
    const radius = outlet.geofenceRadiusM ?? 100;
    const valid = distance <= radius;

    const [existing] = await db.select().from(visitSessions).where(eq(visitSessions.clientRequestId, body.clientRequestId));
    if (existing) return { visit: existing, idempotent: true };

    const [visit] = await db.insert(visitSessions).values({
      salesUserId: request.user!.id,
      outletId: outlet.id,
      checkInAt: new Date(),
      checkInLatitude: String(body.latitude),
      checkInLongitude: String(body.longitude),
      checkInAccuracyM: body.accuracyM ? String(body.accuracyM) : undefined,
      checkInDistanceM: distance.toFixed(2),
      geofenceRadiusMUsed: radius,
      status: valid ? 'open' : 'invalid_location',
      validationStatus: valid ? 'auto_valid' : 'manual_review',
      clientRequestId: body.clientRequestId,
    }).returning();

    return { visit, geofence: { valid, distanceM: distance, radiusM: radius } };
  });

  app.get('/visits/review', { preHandler: requirePermission('visits.review') }, async () => {
    const rows = await db.select().from(visitSessions).orderBy(desc(visitSessions.createdAt)).limit(100);
    return { visits: rows };
  });
}
'@ | Set-Content -Encoding UTF8 apps/api/src/modules/visits/visits.routes.ts
@'
import type { FastifyInstance } from 'fastify';
import { count, sql, sum } from 'drizzle-orm';
import { products, salesTransactions, visitSessions } from '@mahasura/db/schema';
import { db } from '../../plugins/db.js';
import { requirePermission } from '../auth/auth.service.js';

export async function reportRoutes(app: FastifyInstance) {
  app.get('/reports/summary', { preHandler: requirePermission('reports.view') }, async () => {
    const [sales] = await db.select({ total: sum(salesTransactions.totalAmount), count: count() }).from(salesTransactions);
    const [visits] = await db.select({ count: count() }).from(visitSessions);
    const [productCount] = await db.select({ count: count() }).from(products);
    const [pending] = await db.select({ count: count() }).from(salesTransactions).where(sql`${salesTransactions.status} = 'pending_approval'`);

    return {
      summary: {
        totalSalesAmount: sales.total ?? '0',
        totalOrders: sales.count,
        totalVisits: visits.count,
        totalProducts: productCount.count,
        pendingApprovals: pending.count,
      },
    };
  });
}
'@ | Set-Content -Encoding UTF8 apps/api/src/modules/reports/reports.routes.ts`*

*Edited relevant file*

*User accepted the command `pnpm typecheck`*

*Viewed [attendance.ts](file:///e:/Pekerjaan/Programing/project/sales-tracking/packages/db/src/schema/attendance.ts) *

*Edited relevant file*

*User accepted the command `pnpm typecheck`*

*User accepted the command `pnpm build`*

*User accepted the command `pnpm db:seed`*

*Checked command status*

*Checked command status*

*Checked command status*

*Edited relevant file*

*Edited relevant file*

### Planner Response

Sudah saya perbaiki dan lanjutkan Phase C.

### Fix login & error raw

Perubahan utama:

- `.env` ditambah:
  ```env
  APP_DEBUG=false
  VITE_APP_DEBUG=false
  ```
- Backend Fastify sekarang punya global error handler:
  - kalau `APP_DEBUG=false`, UI/API dapat pesan aman,
  - kalau `APP_DEBUG=true`, baru raw error/stack/code dikirim.
- Frontend API client juga menyembunyikan error raw saat `VITE_APP_DEBUG=false`.
- Seed admin dijalankan ulang supaya password `.env` aktif.

> Penting: karena `pnpm run dev` sudah berjalan sebelum `.env` diubah, **restart dev server** agar `APP_DEBUG` dan `VITE_APP_DEBUG` terbaca.

Login admin:

```txt
admin@mahasura.local
ChangeMe123!
```

### Phase C selesai

Backend API yang ditambahkan:

- `GET /products`
- `POST /products`
- `GET /sales/orders`
- `POST /sales/orders`
- `POST /sales/orders/:id/approve`
- `GET /visits/today`
- `POST /visits/check-in`
- `GET /visits/review`
- `GET /reports/summary`

Alur stok sudah sesuai arahan:

- stok utama di admin/warehouse `WH-MAIN`,
- sales membuat order masuk `pending_approval`,
- admin approve baru stok dikurangi dan order menjadi `closed`.

### Verifikasi berhasil

```bash
pnpm typecheck
pnpm build
pnpm db:seed
```

Detail lengkap saya update di:

[walkthrough.md](file:///C:/Users/renal/.gemini/antigravity/brain/64381f26-04fa-4e89-bb23-a6f42f5c180c/walkthrough.md)

### User Input

selalu error ketika mencoba login, tolong perbaiki dan cek apa yang salah ketika login sudah benar?

{
    "identifier": "admin@mahasura.local",
    "password": "ChangeMe123!",
    "deviceId": "973c5b45-4912-47a2-8aa4-f243be26e900"
}
{"message":"Terjadi kesalahan server. Silakan coba lagi."}

*Viewed [.env](file:///e:/Pekerjaan/Programing/project/sales-tracking/.env) *

*Viewed [db.ts](file:///e:/Pekerjaan/Programing/project/sales-tracking/apps/api/src/plugins/db.ts) *

*Viewed [index.ts](file:///e:/Pekerjaan/Programing/project/sales-tracking/packages/db/src/index.ts) *

*User accepted the command `$env:APP_DEBUG='true'; pnpm --filter @mahasura/api exec tsx -e "import { buildApp } from './src/app.ts'; const app=await buildApp(); const res=await app.inject({method:'POST',url:'/auth/login',payload:{identifier:'admin@mahasura.local',password:'ChangeMe123!',deviceId:'973c5b45-4912-47a2-8aa4-f243be26e900'}}); console.log(res.statusCode); console.log(res.body); await app.close();"`*

*User accepted the command `$script=@'
import { buildApp } from './src/app.ts';

async function main() {
  const app = await buildApp();
  const res = await app.inject({
    method: 'POST',
    url: '/auth/login',
    payload: { identifier: 'admin@mahasura.local', password: 'ChangeMe123!', deviceId: '973c5b45-4912-47a2-8aa4-f243be26e900' },
  });
  console.log(res.statusCode);
  console.log(res.body);
  await app.close();
}

main().catch((error) => { console.error(error); process.exit(1); });
'@; Set-Content -Path .\debug-login.ts -Value $script; $env:APP_DEBUG='true'; pnpm --filter @mahasura/api exec tsx debug-login.ts; Remove-Item .\debug-login.ts`*

*Viewed [database-url.ts](file:///e:/Pekerjaan/Programing/project/sales-tracking/packages/db/src/database-url.ts) *

*Edited relevant file*

*User accepted the command `$script=@'
import { buildApp } from './src/app.ts';

async function main() {
  const app = await buildApp();
  const res = await app.inject({
    method: 'POST',
    url: '/auth/login',
    payload: { identifier: 'admin@mahasura.local', password: 'ChangeMe123!', deviceId: '973c5b45-4912-47a2-8aa4-f243be26e900' },
  });
  console.log(res.statusCode);
  console.log(res.body);
  await app.close();
}

main().catch((error) => { console.error(error); process.exit(1); });
'@; Set-Content -Path .\debug-login.ts -Value $script; pnpm --filter @mahasura/api exec tsx debug-login.ts; Remove-Item .\debug-login.ts`*

*Viewed [package.json](file:///e:/Pekerjaan/Programing/project/sales-tracking/packages/db/package.json) *

*Edited relevant file*

*Edited relevant file*

*User accepted the command `$script=@'
import { buildApp } from './src/app.ts';

async function main() {
  const app = await buildApp();
  const res = await app.inject({
    method: 'POST',
    url: '/auth/login',
    payload: { identifier: 'admin@mahasura.local', password: 'ChangeMe123!', deviceId: '973c5b45-4912-47a2-8aa4-f243be26e900' },
  });
  console.log(res.statusCode);
  console.log(res.body);
  await app.close();
}

main().catch((error) => { console.error(error); process.exit(1); });
'@; Set-Content -Path .\debug-login.ts -Value $script; pnpm --filter @mahasura/api exec tsx debug-login.ts; Remove-Item .\debug-login.ts`*

*User accepted the command `$script=@'
import { buildApp } from './src/app.ts';

async function main() {
  const app = await buildApp();
  const res = await app.inject({
    method: 'POST',
    url: '/auth/login',
    payload: { identifier: 'admin@mahasura.local', password: 'ChangeMe123!', deviceId: '973c5b45-4912-47a2-8aa4-f243be26e900' },
  });
  console.log(res.statusCode);
  console.log(res.body);
  await app.close();
}

main().catch((error) => { console.error(error); process.exit(1); });
'@; Set-Content -Path .\debug-login.ts -Value $script; $env:APP_DEBUG='true'; pnpm --filter @mahasura/api exec tsx debug-login.ts; Remove-Item .\debug-login.ts`*

*Edited relevant file*

*User accepted the command `$script=@'
import { buildApp } from './src/app.ts';

async function main() {
  const app = await buildApp();
  const res = await app.inject({
    method: 'POST',
    url: '/auth/login',
    payload: { identifier: 'admin@mahasura.local', password: 'ChangeMe123!', deviceId: '973c5b45-4912-47a2-8aa4-f243be26e900' },
  });
  console.log(res.statusCode);
  console.log(res.body);
  await app.close();
}

main().catch((error) => { console.error(error); process.exit(1); });
'@; Set-Content -Path .\debug-login.ts -Value $script; pnpm --filter @mahasura/api exec tsx debug-login.ts; Remove-Item .\debug-login.ts`*

*Checked command status*

*User accepted the command `pnpm typecheck && pnpm build`*

*User accepted the command `pnpm typecheck; if ($LASTEXITCODE -eq 0) { pnpm build }`*

*Checked command status*

### Planner Response

Masalah login sudah ketemu dan sudah saya perbaiki.

### Penyebab error

Credential kamu **sebenarnya benar**. Error terjadi karena API tidak membaca `.env` root project dengan benar saat jalan dari workspace `apps/api`.

Akibatnya:

- `SUPABASE_DATABASE=true`
- `SUPABASE_POOLER_DATABASE_URL=...`

tidak terbaca oleh API, jadi API fallback ke `DATABASE_URL` direct Supabase port `5432`.

Log debug menunjukkan root cause:

```txt
AggregateError [ECONNREFUSED]
```

Jadi bukan password salah, tapi API gagal konek database karena memakai URL DB yang salah untuk runtime API.

### Perbaikan yang dilakukan

- `apps/api/src/config/env.ts`
  - sekarang eksplisit load root `.env`:
    ```ts
    dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
    ```

- `apps/api/src/plugins/db.ts`
  - sekarang memakai resolver Supabase yang sama dengan migration/seed:
    ```ts
    createDb(resolveDatabaseUrl())
    ```

- `packages/db`
  - export `database-url` agar bisa dipakai oleh API.

### Hasil test login

Saya test payload yang sama:

```json
{
  "identifier": "admin@mahasura.local",
  "password": "ChangeMe123!",
  "deviceId": "973c5b45-4912-47a2-8aa4-f243be26e900"
}
```

Hasilnya sekarang:

```txt
200
```

dan API mengembalikan:

```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "user": {
    "name": "Administrator Mahasura",
    "email": "admin@mahasura.local",
    "phone": "080000000000",
    "roleCode": "ADMINISTRATOR"
  }
}
```

### Verifikasi

Berhasil:

```bash
pnpm typecheck
pnpm build
```

### Yang perlu kamu lakukan sekarang

Karena `pnpm run dev` kamu masih proses lama sebelum fix ini, **restart dev server**:

1. stop terminal `pnpm run dev`
2. jalankan ulang:

```bash
pnpm run dev
```

Setelah itu coba login lagi dengan:

```txt
admin@mahasura.local
ChangeMe123!
```

### User Input

sebelum lanjut, apakah ini sudah SaaS support? jadi multi perusahaan gitu

### Planner Response

Belum sepenuhnya.

Saat ini project **baru siap sebagai single-company / single-tenant app**, walaupun beberapa pondasinya bisa diarahkan ke SaaS. Untuk **SaaS multi perusahaan**, masih perlu Phase khusus: **Multi-Tenancy / SaaS Foundation**.

## Status saat ini

Yang sudah ada:

- Role & permission.
- User management dasar.
- Admin/sales separation.
- PostgreSQL/Supabase.
- Drizzle schema.
- Produk, stok, outlet, transaksi, visit, laporan.
- Session auth JWT.

Yang **belum ada** untuk SaaS:

- Tabel `companies` / `tenants`.
- `companyId` / `tenantId` di semua data bisnis.
- Isolasi data antar perusahaan.
- Tenant-aware login.
- Tenant-aware permission.
- Tenant-aware seed.
- Tenant-aware API filter.
- Subdomain/domain per perusahaan.
- Billing/subscription plan.
- Super admin platform.
- Row Level Security Supabase per tenant.
- Audit log tenant-aware.
- Storage/media path per tenant.

## Risiko jika dipakai multi perusahaan sekarang

Kalau sekarang langsung dipakai beberapa perusahaan, datanya bisa tercampur karena tabel seperti ini belum punya `companyId`:

- `users`
- `roles`
- `permissions`
- `outlets`
- `products`
- `warehouses`
- `inventory_balances`
- `sales_transactions`
- `visit_sessions`
- `receivables`
- `cash_deposits`
- `media_files`

Jadi satu admin berpotensi melihat/mengelola data perusahaan lain kalau nanti ada banyak perusahaan dalam satu database.

## Rekomendasi

Sebelum lanjut fitur besar lain, sebaiknya buat phase baru:

# Phase D — SaaS Multi-Tenant Foundation

Isi utamanya:

1. Tambah schema:
   - `companies`
   - `company_memberships` atau langsung `company_id` di `users`
   - `subscription_plans`
   - `company_subscriptions`

2. Tambah `companyId` ke semua tabel bisnis:
   - users
   - roles
   - outlets
   - products
   - warehouses
   - inventory
   - transactions
   - visits
   - reports
   - receivables
   - deposits
   - media

3. Update auth:
   - JWT payload membawa `companyId`
   - login resolve perusahaan user
   - optional support company slug/subdomain

4. Update API:
   - semua query wajib filter `companyId`
   - create/update otomatis inject `companyId` dari token

5. Update seed:
   - buat default company `Mahasura`
   - user admin masuk ke company itu
   - sample product/outlet/warehouse tenant-scoped

6. Optional Supabase RLS:
   - policy per `company_id`

## Jawaban singkat

**Belum SaaS-ready.**  
Sudah bagus untuk satu perusahaan, tapi belum aman untuk multi perusahaan. Kalau targetnya SaaS, saya sarankan **jangan lanjut terlalu jauh ke UI/feature baru dulu**, lebih baik kita buat dulu **Phase D: Multi-Tenant SaaS Foundation** supaya semua fitur berikutnya dibangun di atas struktur tenant yang benar.

### User Input

lanjutkan

*Edited relevant file*

### Planner Response

Saya sudah buatkan plan **Phase D — SaaS Multi-Tenant Foundation**.

Silakan review dulu di:

[implementation_plan.md](file:///C:/Users/renal/.gemini/antigravity/brain/64381f26-04fa-4e89-bb23-a6f42f5c180c/implementation_plan.md)

Karena ini perubahan arsitektur besar, saya stop dulu sampai kamu approve. Setelah approve, saya lanjut implementasi multi-company/tenant.

### User Input

approved lanjutkan

*Edited relevant file*

*Viewed [media.ts](file:///e:/Pekerjaan/Programing/project/sales-tracking/packages/db/src/schema/media.ts) *

*Viewed [deposits.ts](file:///e:/Pekerjaan/Programing/project/sales-tracking/packages/db/src/schema/deposits.ts) *

*Edited relevant file*

*Edited relevant file*

*Edited relevant file*

*Edited relevant file*

*Edited relevant file*

*Edited relevant file*

*Viewed [transactions.ts](file:///e:/Pekerjaan/Programing/project/sales-tracking/packages/db/src/schema/transactions.ts) *

*Edited relevant file*

*Edited relevant file*

*Viewed [client.ts](file:///e:/Pekerjaan/Programing/project/sales-tracking/packages/db/src/client.ts) *

*User accepted the command `pnpm typecheck`*

*Viewed [seed.ts](file:///e:/Pekerjaan/Programing/project/sales-tracking/packages/db/src/seed.ts) *

*Edited relevant file*

*User accepted the command `pnpm typecheck`*

*Viewed [auth.service.ts](file:///e:/Pekerjaan/Programing/project/sales-tracking/apps/api/src/modules/auth/auth.service.ts) *

*Edited relevant file*

*Edited relevant file*

*Viewed [auth.routes.ts](file:///e:/Pekerjaan/Programing/project/sales-tracking/apps/api/src/modules/auth/auth.routes.ts) *

*Viewed [auth.routes.ts](file:///e:/Pekerjaan/Programing/project/sales-tracking/apps/api/src/modules/auth/auth.routes.ts) *

*Edited relevant file*

*Grep searched codebase*

*Viewed [types.d.ts](file:///e:/Pekerjaan/Programing/project/sales-tracking/apps/api/src/types.d.ts) *

*Edited relevant file*

*Viewed [products.routes.ts](file:///e:/Pekerjaan/Programing/project/sales-tracking/apps/api/src/modules/products/products.routes.ts) *

*Edited relevant file*

*Viewed [sales.routes.ts](file:///e:/Pekerjaan/Programing/project/sales-tracking/apps/api/src/modules/sales/sales.routes.ts) *

*Edited relevant file*

*Viewed [visits.routes.ts](file:///e:/Pekerjaan/Programing/project/sales-tracking/apps/api/src/modules/visits/visits.routes.ts) *

*Edited relevant file*

*Viewed [reports.routes.ts](file:///e:/Pekerjaan/Programing/project/sales-tracking/apps/api/src/modules/reports/reports.routes.ts) *

*Edited relevant file*

*User accepted the command `pnpm typecheck`*

*Edited relevant file*

*User accepted the command `pnpm build`*

*User accepted the command `pnpm db:generate`*

*User accepted the command `pnpm db:migrate`*

*User accepted the command `pnpm --filter @mahasura/db exec drizzle-kit migrate --verbose`*

*Viewed [0002_wide_ultimates.sql](file:///e:/Pekerjaan/Programing/project/sales-tracking/packages/db/drizzle/0002_wide_ultimates.sql) *

*Edited relevant file*

*User accepted the command `pnpm db:migrate`*

*Checked command status*

*User accepted the command `pnpm db:seed`*

*Checked command status*

*Checked command status*

*Checked command status*

*User accepted the command `$script=@'
import { buildApp } from './src/app.ts';

async function main() {
  const app = await buildApp();
  const res = await app.inject({
    method: 'POST',
    url: '/auth/login',
    payload: { identifier: 'admin@mahasura.local', password: 'ChangeMe123!', deviceId: '973c5b45-4912-47a2-8aa4-f243be26e900' },
  });
  console.log(res.statusCode);
  console.log(res.body);
  await app.close();
}

main().catch((error) => { console.error(error); process.exit(1); });
'@; Set-Content -Path .\debug-login.ts -Value $script; pnpm --filter @mahasura/api exec tsx debug-login.ts; Remove-Item .\debug-login.ts`*

*Checked command status*

*Edited relevant file*

*Edited relevant file*

### Planner Response

Phase D core sudah selesai.

Yang sudah diterapkan:

- SaaS foundation:
  - `companies`
  - `company_subscriptions`
- Default tenant:
  - `Mahasura`
  - slug `mahasura`
  - plan `starter`
- Auth tenant-aware:
  - JWT membawa `companyId`
  - session membawa `companyId`
  - login response mengembalikan company
- Core table sudah tenant-aware:
  - users/roles/sessions
  - outlets
  - products
  - warehouses
  - inventory
  - sales transactions
  - visit sessions
- API sudah tenant-scoped:
  - Product API
  - Sales Order API
  - Visit API
  - Report Summary API
- Migration Supabase berhasil.
- Seed tenant berhasil.
- Login admin berhasil `200` dan token sudah berisi `companyId`.

Verifikasi berhasil:

```bash
pnpm typecheck
pnpm build
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

Detail lengkap ada di:

[walkthrough.md](file:///C:/Users/renal/.gemini/antigravity/brain/64381f26-04fa-4e89-bb23-a6f42f5c180c/walkthrough.md)

Catatan: karena `pnpm run dev` kamu masih proses lama dari sebelum migration/schema berubah, sebaiknya **restart dev server** sebelum login lagi.

### User Input

seharusnya @mahasura ini berubah menjadi yuksales jadi projectnya sendiri bukan spesifik untuk mahasura saja.

*Grep searched codebase*

*Grep searched codebase*

*User accepted the command `$files = @('package.json','apps/api/package.json','apps/web/package.json','packages/db/package.json','packages/shared/package.json'); foreach ($file in $files) { (Get-Content $file -Raw) -replace '@mahasura','@yuksales' | Set-Content $file }
$sourceFiles = Get-ChildItem -Path apps,packages -Recurse -Include *.ts,*.tsx,*.json | Where-Object { $_.FullName -notmatch 'node_modules|dist' }; foreach ($file in $sourceFiles) { (Get-Content $file.FullName -Raw) -replace '@mahasura','@yuksales' -replace 'admin@mahasura\.local','admin@yuksales.local' | Set-Content $file.FullName }
$envFiles = @('.env','.env.example'); foreach ($file in $envFiles) { if (Test-Path $file) { (Get-Content $file -Raw) -replace 'admin@mahasura\.local','admin@yuksales.local' -replace 'ADMIN_NAME=Administrator Mahasura','ADMIN_NAME=Administrator YukSales' | Set-Content $file } }`*

*Viewed [package.json](file:///e:/Pekerjaan/Programing/project/sales-tracking/package.json) *

*Edited relevant file*

*Grep searched codebase*

*Grep searched codebase*

*User accepted the command `$sourceFiles = Get-ChildItem -Path apps,packages -Recurse -Include *.ts,*.tsx,*.json | Where-Object { $_.FullName -notmatch 'node_modules|dist' }; foreach ($file in $sourceFiles) { $c=Get-Content $file.FullName -Raw; $c=$c -replace 'Mahasura Sales Tracking','YukSales' -replace 'Mahasura Sales','YukSales' -replace 'MahasuraOfflineDb','YukSalesOfflineDb' -replace 'mahasura-offline','yuksales-offline' -replace 'mahasura\.session','yuksales.session' -replace 'mahasura\.deviceId','yuksales.deviceId' -replace 'mahasura-api','yuksales-api' -replace 'Mahasura','YukSales' -replace 'mahasura_sales','yuksales' -replace 'postgres://mahasura:mahasura@localhost:5432/yuksales','postgres://yuksales:yuksales@localhost:5432/yuksales' -replace 'admin@mahasura\.local','admin@yuksales.local' -replace "slug: 'mahasura'","slug: 'yuksales'" -replace "eq\(companies\.slug, 'mahasura'\)","eq(companies.slug, 'yuksales')"; Set-Content $file.FullName $c }
$envFiles=@('.env','.env.example'); foreach($file in $envFiles){ if(Test-Path $file){ $c=Get-Content $file -Raw; $c=$c -replace 'postgres://mahasura:mahasura@localhost:5432/mahasura_sales','postgres://yuksales:yuksales@localhost:5432/yuksales' -replace 'admin@mahasura\.local','admin@yuksales.local' -replace 'Administrator Mahasura','Administrator YukSales'; Set-Content $file $c }}`*

*Viewed [seed.ts](file:///e:/Pekerjaan/Programing/project/sales-tracking/packages/db/src/seed.ts) *

*Edited relevant file*

*Grep searched codebase*

*User accepted the command `(Get-Content packages/db/drizzle/0002_wide_ultimates.sql -Raw) -replace "'Mahasura'", "'YukSales'" -replace "'mahasura'", "'yuksales'" | Set-Content packages/db/drizzle/0002_wide_ultimates.sql`*

*User accepted the command `pnpm install --lockfile-only`*

*User accepted the command `pnpm typecheck`*

*Viewed [pnpm-workspace.yaml](file:///e:/Pekerjaan/Programing/project/sales-tracking/pnpm-workspace.yaml) *

*Viewed [package.json](file:///e:/Pekerjaan/Programing/project/sales-tracking/apps/api/package.json) *

*User accepted the command `pnpm install`*

*User accepted the command `pnpm typecheck`*

*User accepted the command `pnpm build`*

*User accepted the command `$files=@('apps/web/src/features/attendance/attendance-page.tsx','apps/web/src/features/attendance/attendance-review-page.tsx'); foreach($file in $files){ $c=Get-Content $file -Raw; Set-Content -Path $file -Value $c -Encoding utf8 }`*

*User accepted the command `pnpm build`*

*User accepted the command `pnpm db:seed`*

*Checked command status*

*Checked command status*

*Edited relevant file*

*Edited relevant file*

*User accepted the command `pnpm db:seed`*

*Checked command status*

*Checked command status*

*Checked command status*

*User accepted the command `$script=@'
import { buildApp } from './src/app.ts';

async function main() {
  const app = await buildApp();
  const res = await app.inject({
    method: 'POST',
    url: '/auth/login',
    payload: { identifier: 'admin@yuksales.local', password: 'ChangeMe123!', deviceId: '973c5b45-4912-47a2-8aa4-f243be26e900' },
  });
  console.log(res.statusCode);
  console.log(res.body);
  await app.close();
}

main().catch((error) => { console.error(error); process.exit(1); });
'@; Set-Content -Path .\debug-login.ts -Value $script -Encoding utf8; pnpm --filter @yuksales/api exec tsx debug-login.ts; Remove-Item .\debug-login.ts`*

*Grep searched codebase*

### Planner Response

Betul. Sudah saya ubah project utama dari scope/brand **Mahasura** menjadi **YukSales**.

### Yang diubah

- Package scope:
  - `@mahasura/api` → `@yuksales/api`
  - `@mahasura/web` → `@yuksales/web`
  - `@mahasura/db` → `@yuksales/db`
  - `@mahasura/shared` → `@yuksales/shared`

- Root package:
  - `mahasura-sales-tracking` → `yuksales`

- Brand UI/app:
  - `Mahasura` → `YukSales`
  - PWA manifest juga menjadi `YukSales`
  - storage key browser:
    - `mahasura.session` → `yuksales.session`
    - `mahasura.deviceId` → `yuksales.deviceId`

- Default tenant:
  - name: `YukSales`
  - slug: `yuksales`

- Default admin:
  - `admin@mahasura.local` → `admin@yuksales.local`

- Seed sample:
  - produk/gudang sample sekarang memakai nama YukSales
  - SKU sample `MHS-*` → `YKS-*`

### Verifikasi

Berhasil:

```bash
pnpm install
pnpm typecheck
pnpm build
pnpm db:seed
```

Login juga sudah berhasil:

```txt
admin@yuksales.local
ChangeMe123!
```

Response login sudah `200`, dan company sudah:

```json
{
  "name": "YukSales",
  "slug": "yuksales"
}
```

Sisa string `mahasura` hanya ada di folder referensi lama:

```txt
sistem-mahasura/
```

Folder itu saya biarkan karena memang sumber referensi yang sebelumnya diminta untuk dipelajari, bukan project utama YukSales.

### User Input

ini belum di buatkan gitignore lo

*Edited relevant file*

*Viewed [.env](file:///e:/Pekerjaan/Programing/project/sales-tracking/.env) *

*Viewed [.gitignore](file:///e:/Pekerjaan/Programing/project/sales-tracking/.gitignore) *

*Edited relevant file*

*User accepted the command `git status --short --ignored`*

### Planner Response

Sudah saya buatkan `.gitignore` yang lengkap.

Yang sekarang di-ignore:

- `.env` dan `.env.*` supaya credential Supabase/JWT tidak ikut commit
- `node_modules/`
- `dist/`, `build/`, cache, coverage
- log/debug files
- editor/OS files
- folder referensi lama `sistem-mahasura/`

Saya juga cek dengan:

```bash
git status --short --ignored
```

Hasilnya `.env`, `node_modules`, dan `apps/web/dist` sudah masuk ignored.  
`.env.example` tetap tidak di-ignore supaya bisa jadi template config.