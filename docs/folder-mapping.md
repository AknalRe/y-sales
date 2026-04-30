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
