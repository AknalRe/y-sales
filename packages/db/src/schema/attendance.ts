import { boolean, numeric, pgEnum, pgTable, timestamp, uuid, varchar, date } from 'drizzle-orm/pg-core';
import { users } from './auth.js';
import { companies } from './companies.js';
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
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
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
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
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


