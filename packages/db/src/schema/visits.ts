import { integer, numeric, pgEnum, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './auth.js';
import { attendanceSessions, faceCaptures, validationStatusEnum } from './attendance.js';
import { companies } from './companies.js';
import { outlets } from './outlets.js';

export const visitStatusEnum = pgEnum('visit_status', ['open', 'completed', 'invalid_location', 'synced']);

export const visitSessions = pgTable('visit_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
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


