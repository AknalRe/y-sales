CREATE TYPE "public"."company_status" AS ENUM('active', 'trialing', 'suspended', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('trialing', 'active', 'past_due', 'cancelled', 'expired');--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(180) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"status" "company_status" DEFAULT 'active' NOT NULL,
	"logo_url" text,
	"timezone" varchar(80) DEFAULT 'Asia/Jakarta' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "companies_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "company_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"plan_code" varchar(80) NOT NULL,
	"status" "subscription_status" DEFAULT 'trialing' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ends_at" timestamp with time zone,
	"limits" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "companies" ("name", "slug", "status", "timezone")
VALUES ('YukSales', 'YukSales', 'active', 'Asia/Jakarta')
ON CONFLICT ("slug") DO UPDATE SET "name" = 'YukSales', "status" = 'active', "timezone" = 'Asia/Jakarta', "updated_at" = now();
--> statement-breakpoint
INSERT INTO "company_subscriptions" ("company_id", "plan_code", "status", "limits")
SELECT "id", 'starter', 'active', '{"users":25,"outlets":500,"products":1000}'::jsonb
FROM "companies"
WHERE "slug" = 'YukSales';
--> statement-breakpoint
ALTER TABLE "roles" DROP CONSTRAINT "roles_code_unique";--> statement-breakpoint
ALTER TABLE "outlets" DROP CONSTRAINT "outlets_code_unique";--> statement-breakpoint
ALTER TABLE "products" DROP CONSTRAINT "products_sku_unique";--> statement-breakpoint
ALTER TABLE "warehouses" DROP CONSTRAINT "warehouses_code_unique";--> statement-breakpoint
ALTER TABLE "roles" ADD COLUMN "company_id" uuid;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "company_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "company_id" uuid;--> statement-breakpoint
ALTER TABLE "outlet_photos" ADD COLUMN "company_id" uuid;--> statement-breakpoint
ALTER TABLE "outlets" ADD COLUMN "company_id" uuid;--> statement-breakpoint
ALTER TABLE "sales_outlet_assignments" ADD COLUMN "company_id" uuid;--> statement-breakpoint
ALTER TABLE "visit_sessions" ADD COLUMN "company_id" uuid;--> statement-breakpoint
ALTER TABLE "inventory_balances" ADD COLUMN "company_id" uuid;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD COLUMN "company_id" uuid;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "company_id" uuid;--> statement-breakpoint
ALTER TABLE "warehouses" ADD COLUMN "company_id" uuid;--> statement-breakpoint
ALTER TABLE "sales_transaction_items" ADD COLUMN "company_id" uuid;--> statement-breakpoint
ALTER TABLE "sales_transactions" ADD COLUMN "company_id" uuid;--> statement-breakpoint
ALTER TABLE "transaction_note_photos" ADD COLUMN "company_id" uuid;--> statement-breakpoint
UPDATE "roles" SET "company_id" = (SELECT "id" FROM "companies" WHERE "slug" = 'YukSales') WHERE "company_id" IS NULL;--> statement-breakpoint
UPDATE "sessions" SET "company_id" = (SELECT "id" FROM "companies" WHERE "slug" = 'YukSales') WHERE "company_id" IS NULL;--> statement-breakpoint
UPDATE "users" SET "company_id" = (SELECT "id" FROM "companies" WHERE "slug" = 'YukSales') WHERE "company_id" IS NULL;--> statement-breakpoint
UPDATE "outlet_photos" SET "company_id" = (SELECT "id" FROM "companies" WHERE "slug" = 'YukSales') WHERE "company_id" IS NULL;--> statement-breakpoint
UPDATE "outlets" SET "company_id" = (SELECT "id" FROM "companies" WHERE "slug" = 'YukSales') WHERE "company_id" IS NULL;--> statement-breakpoint
UPDATE "sales_outlet_assignments" SET "company_id" = (SELECT "id" FROM "companies" WHERE "slug" = 'YukSales') WHERE "company_id" IS NULL;--> statement-breakpoint
UPDATE "visit_sessions" SET "company_id" = (SELECT "id" FROM "companies" WHERE "slug" = 'YukSales') WHERE "company_id" IS NULL;--> statement-breakpoint
UPDATE "inventory_balances" SET "company_id" = (SELECT "id" FROM "companies" WHERE "slug" = 'YukSales') WHERE "company_id" IS NULL;--> statement-breakpoint
UPDATE "inventory_movements" SET "company_id" = (SELECT "id" FROM "companies" WHERE "slug" = 'YukSales') WHERE "company_id" IS NULL;--> statement-breakpoint
UPDATE "products" SET "company_id" = (SELECT "id" FROM "companies" WHERE "slug" = 'YukSales') WHERE "company_id" IS NULL;--> statement-breakpoint
UPDATE "warehouses" SET "company_id" = (SELECT "id" FROM "companies" WHERE "slug" = 'YukSales') WHERE "company_id" IS NULL;--> statement-breakpoint
UPDATE "sales_transactions" SET "company_id" = (SELECT "id" FROM "companies" WHERE "slug" = 'YukSales') WHERE "company_id" IS NULL;--> statement-breakpoint
UPDATE "sales_transaction_items" sti SET "company_id" = st."company_id" FROM "sales_transactions" st WHERE sti."transaction_id" = st."id" AND sti."company_id" IS NULL;--> statement-breakpoint
UPDATE "sales_transaction_items" SET "company_id" = (SELECT "id" FROM "companies" WHERE "slug" = 'YukSales') WHERE "company_id" IS NULL;--> statement-breakpoint
UPDATE "transaction_note_photos" tnp SET "company_id" = st."company_id" FROM "sales_transactions" st WHERE tnp."transaction_id" = st."id" AND tnp."company_id" IS NULL;--> statement-breakpoint
UPDATE "transaction_note_photos" SET "company_id" = (SELECT "id" FROM "companies" WHERE "slug" = 'YukSales') WHERE "company_id" IS NULL;--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "company_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "company_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "outlet_photos" ALTER COLUMN "company_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "outlets" ALTER COLUMN "company_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_outlet_assignments" ALTER COLUMN "company_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "visit_sessions" ALTER COLUMN "company_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_balances" ALTER COLUMN "company_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_movements" ALTER COLUMN "company_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "company_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "warehouses" ALTER COLUMN "company_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_transaction_items" ALTER COLUMN "company_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_transactions" ALTER COLUMN "company_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "transaction_note_photos" ALTER COLUMN "company_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "company_subscriptions" ADD CONSTRAINT "company_subscriptions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "company_subscriptions_company_plan_idx" ON "company_subscriptions" USING btree ("company_id","plan_code");--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outlet_photos" ADD CONSTRAINT "outlet_photos_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outlets" ADD CONSTRAINT "outlets_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_outlet_assignments" ADD CONSTRAINT "sales_outlet_assignments_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_sessions" ADD CONSTRAINT "visit_sessions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_transaction_items" ADD CONSTRAINT "sales_transaction_items_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_transactions" ADD CONSTRAINT "sales_transactions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_note_photos" ADD CONSTRAINT "transaction_note_photos_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "roles_company_code_idx" ON "roles" USING btree ("company_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "outlets_company_code_idx" ON "outlets" USING btree ("company_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "products_company_sku_idx" ON "products" USING btree ("company_id","sku");--> statement-breakpoint
CREATE UNIQUE INDEX "warehouses_company_code_idx" ON "warehouses" USING btree ("company_id","code");
