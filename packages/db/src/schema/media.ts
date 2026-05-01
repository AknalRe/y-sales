import { boolean, integer, numeric, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { users } from './auth.js';

export const mediaOwnerTypeEnum = pgEnum('media_owner_type', ['user', 'outlet', 'transaction', 'attendance', 'visit', 'deposit', 'face_template']);

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


