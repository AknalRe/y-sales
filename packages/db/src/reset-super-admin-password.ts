import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { and, eq, isNull } from 'drizzle-orm';
import { createDb } from './client.js';
import { resolveDatabaseUrl } from './database-url.js';
import { roles, sessions, users } from './schema/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

function readArg(name: string) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const email = readArg('email') ?? process.env.SUPER_ADMIN_EMAIL ?? 'superadmin@yuksales.id';
const name = readArg('name') ?? process.env.SUPER_ADMIN_NAME ?? 'Super Admin Platform';
const password = readArg('password') ?? process.env.SUPER_ADMIN_PASSWORD;

if (!password || password.length < 8) {
  throw new Error('Password wajib diisi dan minimal 8 karakter. Gunakan SUPER_ADMIN_PASSWORD di .env atau --password "PasswordBaru".');
}

const db = createDb(resolveDatabaseUrl());
const [superAdminRole] = await db
  .select()
  .from(roles)
  .where(and(eq(roles.code, 'SUPER_ADMIN'), isNull(roles.companyId)))
  .limit(1);

if (!superAdminRole) {
  throw new Error('Role SUPER_ADMIN belum ada. Jalankan pnpm db:seed terlebih dahulu untuk membuat role platform.');
}

const passwordHash = await bcrypt.hash(password, 12);
const [superAdmin] = await db
  .insert(users)
  .values({
    companyId: null,
    roleId: superAdminRole.id,
    name,
    email,
    passwordHash,
    status: 'active',
  })
  .onConflictDoUpdate({
    target: users.email,
    set: {
      companyId: null,
      roleId: superAdminRole.id,
      name,
      passwordHash,
      status: 'active',
      deletedAt: null,
      updatedAt: new Date(),
    },
  })
  .returning({ id: users.id, email: users.email });

await db
  .update(sessions)
  .set({ revokedAt: new Date() })
  .where(eq(sessions.userId, superAdmin.id));

console.log(`Super admin password reset: ${superAdmin.email}`);
console.log('Session lama sudah direvoke. Silakan login ulang dengan password baru.');
