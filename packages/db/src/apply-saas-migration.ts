import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import postgres from 'postgres';
import { resolveDatabaseUrl } from './database-url.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const sql = postgres(resolveDatabaseUrl(), { max: 1 });

console.log('Running SaaS schema setup...');

// Apply remaining changes idempotently
await sql.begin(async (tx) => {
  // 1. Create enums if not exist
  await tx`DO $$ BEGIN CREATE TYPE "public"."billing_cycle" AS ENUM('monthly', 'yearly', 'lifetime'); EXCEPTION WHEN duplicate_object THEN null; END $$`;
  await tx`DO $$ BEGIN CREATE TYPE "public"."tenant_sub_status" AS ENUM('trialing', 'active', 'past_due', 'suspended', 'cancelled', 'expired'); EXCEPTION WHEN duplicate_object THEN null; END $$`;
  await tx`DO $$ BEGIN CREATE TYPE "public"."platform_action" AS ENUM('company.created', 'company.updated', 'company.suspended', 'company.activated', 'company.cancelled', 'company.deleted', 'subscription.created', 'subscription.updated', 'subscription.cancelled', 'plan.created', 'plan.updated'); EXCEPTION WHEN duplicate_object THEN null; END $$`;
  await tx`DO $$ BEGIN CREATE TYPE "public"."platform_payment_status" AS ENUM('pending', 'succeeded', 'failed', 'refunded'); EXCEPTION WHEN duplicate_object THEN null; END $$`;
  await tx`DO $$ BEGIN CREATE TYPE "public"."platform_invoice_status" AS ENUM('draft', 'issued', 'paid', 'overdue', 'void', 'cancelled'); EXCEPTION WHEN duplicate_object THEN null; END $$`;
  await tx`DO $$ BEGIN CREATE TYPE "public"."platform_billing_reason" AS ENUM('new_subscription', 'renewal', 'upgrade', 'downgrade', 'manual_adjustment'); EXCEPTION WHEN duplicate_object THEN null; END $$`;
  console.log('✓ Enums ready');

  // 2. Create tables if not exist
  await tx`
    CREATE TABLE IF NOT EXISTS "subscription_plans" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "code" varchar(80) NOT NULL,
      "name" varchar(120) NOT NULL,
      "description" text,
      "level" integer DEFAULT 1 NOT NULL,
      "price_monthly" numeric(12, 2) DEFAULT '0' NOT NULL,
      "price_yearly" numeric(12, 2) DEFAULT '0' NOT NULL,
      "limits" jsonb,
      "features" jsonb,
      "is_public" boolean DEFAULT true NOT NULL,
      "status" varchar(40) DEFAULT 'active' NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT "subscription_plans_code_unique" UNIQUE("code")
    )
  `;
  console.log('✓ subscription_plans table ready');

  await tx`
    DO $$ BEGIN
      ALTER TABLE "subscription_plans" ADD COLUMN "level" integer DEFAULT 1 NOT NULL;
    EXCEPTION WHEN duplicate_column THEN null;
    END $$
  `;
  await tx`
    UPDATE "subscription_plans"
    SET "level" = CASE "code"
      WHEN 'starter' THEN 1
      WHEN 'pro' THEN 2
      WHEN 'enterprise' THEN 3
      ELSE COALESCE("level", 1)
    END
  `;
  console.log('✓ subscription_plans.level column ready');

  await tx`
    CREATE TABLE IF NOT EXISTS "subscription_features" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "key" varchar(100) NOT NULL,
      "label" varchar(140) NOT NULL,
      "description" text,
      "category" varchar(80) DEFAULT 'Custom' NOT NULL,
      "status" varchar(40) DEFAULT 'active' NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT "subscription_features_key_unique" UNIQUE("key")
    )
  `;
  await tx`
    INSERT INTO "subscription_features" ("key", "label", "description", "category") VALUES
      ('attendance', 'Attendance', 'Absensi user tenant.', 'Operasional'),
      ('visits', 'Customer Visits', 'Pencatatan kunjungan outlet/customer.', 'Sales'),
      ('route_tracking', 'Route Tracking', 'Tracking rute dan aktivitas sales lapangan.', 'Sales'),
      ('face_recognition', 'Face Recognition', 'Validasi wajah untuk absensi/kunjungan.', 'Operasional'),
      ('offline_sync', 'Offline Sync', 'Sinkronisasi data saat koneksi kembali online.', 'Operasional'),
      ('order_taking', 'Order Taking', 'Pembuatan order penjualan dari aplikasi.', 'Sales'),
      ('stock_management', 'Stock Management', 'Manajemen stok, gudang, dan produk.', 'Operasional'),
      ('advanced_reports', 'Advanced Reports', 'Laporan lanjutan dan insight performa.', 'Reporting'),
      ('export_excel', 'Export Excel', 'Export data operasional ke Excel.', 'Reporting'),
      ('r2_storage', 'Cloud Storage', 'Penyimpanan file/foto berbasis object storage.', 'Integrasi'),
      ('api_access', 'API Access', 'Akses integrasi API untuk sistem eksternal.', 'Integrasi'),
      ('priority_support', 'Priority Support', 'Prioritas support untuk tenant enterprise.', 'Support')
    ON CONFLICT ("key") DO NOTHING
  `;
  console.log('✓ subscription_features table ready');

  await tx`
    CREATE TABLE IF NOT EXISTS "platform_audit_logs" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "actor_id" uuid,
      "action" "platform_action" NOT NULL,
      "target_type" varchar(80) NOT NULL,
      "target_id" uuid,
      "meta" jsonb,
      "ip_address" varchar(60),
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    )
  `;
  console.log('✓ platform_audit_logs table ready');

  await tx`
    CREATE TABLE IF NOT EXISTS "tenant_subscriptions" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "company_id" uuid NOT NULL,
      "plan_id" uuid,
      "plan_code" varchar(80) NOT NULL,
      "billing_cycle" "billing_cycle" DEFAULT 'monthly' NOT NULL,
      "status" "tenant_sub_status" DEFAULT 'trialing' NOT NULL,
      "trial_ends_at" timestamp with time zone,
      "current_period_start" timestamp with time zone,
      "current_period_end" timestamp with time zone,
      "limits_snapshot" jsonb,
      "features_snapshot" jsonb,
      "activated_at" timestamp with time zone,
      "cancelled_at" timestamp with time zone,
      "cancellation_reason" text,
      "suspended_at" timestamp with time zone,
      "suspend_reason" text,
      "expired_at" timestamp with time zone,
      "invoice_ref" varchar(120),
      "paid_at" timestamp with time zone,
      "amount_paid" numeric(12, 2),
      "managed_by_user_id" uuid,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    )
  `;
  console.log('✓ tenant_subscriptions table ready');

  await tx`
    CREATE TABLE IF NOT EXISTS "platform_invoices" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "company_id" uuid NOT NULL,
      "subscription_id" uuid,
      "invoice_number" varchar(120) NOT NULL,
      "status" "platform_invoice_status" DEFAULT 'issued' NOT NULL,
      "billing_reason" "platform_billing_reason" DEFAULT 'manual_adjustment' NOT NULL,
      "billing_cycle" "billing_cycle" DEFAULT 'monthly' NOT NULL,
      "period_start" timestamp with time zone,
      "period_end" timestamp with time zone,
      "subtotal_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
      "discount_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
      "tax_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
      "total_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
      "currency" varchar(8) DEFAULT 'IDR' NOT NULL,
      "due_at" timestamp with time zone,
      "issued_at" timestamp with time zone DEFAULT now() NOT NULL,
      "paid_at" timestamp with time zone,
      "voided_at" timestamp with time zone,
      "notes" text,
      "created_by_user_id" uuid,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT "platform_invoices_invoice_number_unique" UNIQUE("invoice_number")
    )
  `;
  await tx`
    CREATE TABLE IF NOT EXISTS "platform_payments" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "company_id" uuid NOT NULL,
      "invoice_id" uuid,
      "subscription_id" uuid,
      "payment_ref" varchar(140),
      "provider" varchar(80) DEFAULT 'manual' NOT NULL,
      "method" varchar(80) DEFAULT 'manual' NOT NULL,
      "status" "platform_payment_status" DEFAULT 'succeeded' NOT NULL,
      "amount" numeric(12, 2) DEFAULT '0' NOT NULL,
      "currency" varchar(8) DEFAULT 'IDR' NOT NULL,
      "paid_at" timestamp with time zone,
      "received_by_user_id" uuid,
      "notes" text,
      "raw_payload" jsonb,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    )
  `;
  console.log('✓ platform billing tables ready');

  // 2b. Add plan snapshot columns to platform_invoices (idempotent)
  await tx`
    DO $$ BEGIN
      ALTER TABLE "platform_invoices" ADD COLUMN "plan_code" varchar(80);
    EXCEPTION WHEN duplicate_column THEN null;
    END $$
  `;
  await tx`
    DO $$ BEGIN
      ALTER TABLE "platform_invoices" ADD COLUMN "plan_name" varchar(120);
    EXCEPTION WHEN duplicate_column THEN null;
    END $$
  `;
  console.log('✓ platform_invoices.plan_code/plan_name columns ready');

  // 2c. Add companyId to tables missing tenant isolation (idempotent)
  await tx`DO $$ BEGIN ALTER TABLE "attendance_sessions" ADD COLUMN "company_id" uuid REFERENCES "public"."companies"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_column THEN null; END $$`;
  await tx`DO $$ BEGIN ALTER TABLE "gps_track_logs" ADD COLUMN "company_id" uuid REFERENCES "public"."companies"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_column THEN null; END $$`;
  await tx`DO $$ BEGIN ALTER TABLE "cash_deposits" ADD COLUMN "company_id" uuid REFERENCES "public"."companies"("id") ON DELETE CASCADE; EXCEPTION WHEN duplicate_column THEN null; END $$`;
  console.log('✓ tenant isolation companyId columns ready');



  // 3. Make columns nullable
  await tx`ALTER TABLE "sessions" ALTER COLUMN "company_id" DROP NOT NULL`;
  await tx`ALTER TABLE "users" ALTER COLUMN "company_id" DROP NOT NULL`;
  console.log('✓ Nullable columns done');

  // 4. Add is_system_role to roles (idempotent)
  await tx`
    DO $$ BEGIN
      ALTER TABLE "roles" ADD COLUMN "is_system_role" boolean DEFAULT false NOT NULL;
    EXCEPTION WHEN duplicate_column THEN null;
    END $$
  `;
  console.log('✓ roles.is_system_role column ready');

  // 5. Add foreign keys (idempotent via DO block)
  await tx`
    DO $$ BEGIN
      ALTER TABLE "platform_audit_logs" ADD CONSTRAINT "platform_audit_logs_actor_id_users_id_fk"
        FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$
  `;
  await tx`
    DO $$ BEGIN
      ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_company_id_companies_id_fk"
        FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$
  `;
  await tx`
    DO $$ BEGIN
      ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_plan_id_subscription_plans_id_fk"
        FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE no action ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$
  `;
  await tx`
    DO $$ BEGIN
      ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_managed_by_user_id_users_id_fk"
        FOREIGN KEY ("managed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$
  `;
  console.log('✓ Foreign keys ready');
  console.log('\n✅ All schema changes applied successfully!');
});

console.log('\n✅ SaaS schema migration complete!');

// Extend platform_action enum outside transaction (PostgreSQL requires ADD VALUE outside tx)
const newActions = [
  'subscription.upgraded', 'subscription.downgraded',
  'plan.deleted',
  'invoice.created', 'invoice.voided',
  'payment.recorded', 'payment.refunded',
  'user.created', 'user.updated', 'user.deleted', 'user.password_reset', 'user.suspended',
];
for (const val of newActions) {
  try {
    await sql.unsafe(`ALTER TYPE "public"."platform_action" ADD VALUE IF NOT EXISTS '${val}'`);
  } catch { /* already exists */ }
}
console.log('✓ platform_action enum extended');

await sql.end();
