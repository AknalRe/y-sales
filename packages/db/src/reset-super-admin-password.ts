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

const cliArgs = process.argv.slice(2).filter((arg) => arg !== '--');

function readArg(name: string) {
  const prefix = `--${name}=`;
  const inline = cliArgs.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = cliArgs.indexOf(`--${name}`);
  return index >= 0 ? cliArgs[index + 1] : undefined;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

async function main() {
  const email = readArg('email') ?? process.env.SUPER_ADMIN_EMAIL ?? 'superadmin@yuksales.id';
  const name = readArg('name') ?? process.env.SUPER_ADMIN_NAME ?? 'Super Admin Platform';
  const password = readArg('password') ?? process.env.SUPER_ADMIN_PASSWORD;

  if (!password || password.length < 8) {
    throw new Error('Password wajib diisi dan minimal 8 karakter. Gunakan SUPER_ADMIN_PASSWORD di .env atau --password "PasswordBaru".');
  }

  const db = createDb(resolveDatabaseUrl());
  let [superAdminRole] = await db
    .select()
    .from(roles)
    .where(and(eq(roles.code, 'SUPER_ADMIN'), isNull(roles.companyId)))
    .limit(1);

  if (!superAdminRole) {
    [superAdminRole] = await db
      .insert(roles)
      .values({
        companyId: null,
        code: 'SUPER_ADMIN',
        name: 'Super Admin Platform',
        description: 'Full platform access for managing tenants, subscriptions, and system settings.',
        isSystemRole: true,
      })
      .returning();

    console.log('Role SUPER_ADMIN belum ada, role platform berhasil dibuat.');
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
}

main().catch((error: unknown) => {
  console.error('Reset super admin password gagal.');
  console.error(`Penyebab: ${getErrorMessage(error)}`);
  console.error('');
  console.error('Cek cepat:');
  console.error(`- .env terbaca: ${process.env.DATABASE_URL || process.env.SUPABASE_DB_URL ? 'ya' : 'tidak / DATABASE_URL kosong'}`);
  console.error('- Pastikan database production sudah bisa diakses dari server.');
  console.error('- Jalankan dengan password minimal 8 karakter, contoh:');
  console.error('  pnpm db:reset-super-admin-password -- --email superadmin@yuksales.id --password "PasswordBaru123!"');
  process.exitCode = 1;
});
