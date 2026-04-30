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
