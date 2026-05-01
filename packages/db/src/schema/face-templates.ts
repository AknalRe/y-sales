import { pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { roles, users } from './auth.js';
import { companies } from './companies.js';
import { mediaFiles } from './media.js';

export const faceTemplateStatusEnum = pgEnum('face_template_status', ['active', 'inactive', 'revoked']);

export const userFaceTemplates = pgTable('user_face_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: uuid('role_id').notNull().references(() => roles.id),
  mediaFileId: uuid('media_file_id').notNull().references(() => mediaFiles.id),
  embeddingRef: text('embedding_ref'),
  templateHash: varchar('template_hash', { length: 128 }),
  status: faceTemplateStatusEnum('status').default('active').notNull(),
  createdByUserId: uuid('created_by_user_id').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
