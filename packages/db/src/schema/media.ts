import { index, integer, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { users } from './auth.js';
import { companies } from './companies.js';

export const mediaOwnerTypeEnum = pgEnum('media_owner_type', ['user', 'outlet', 'transaction', 'attendance', 'visit', 'deposit', 'face_template', 'product', 'company']);

export const mediaFiles = pgTable('media_files', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }),
  ownerType: mediaOwnerTypeEnum('owner_type').notNull(),
  ownerId: uuid('owner_id'),
  fileUrl: text('file_url').notNull(),
  mimeType: varchar('mime_type', { length: 120 }).notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  fileHash: varchar('file_hash', { length: 128 }),
  capturedAt: timestamp('captured_at', { withTimezone: true }),
  uploadedByUserId: uuid('uploaded_by_user_id').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('media_files_company_idx').on(table.companyId),
  index('media_files_owner_idx').on(table.ownerType, table.ownerId),
  index('media_files_uploader_idx').on(table.uploadedByUserId),
]);
