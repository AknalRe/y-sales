CREATE TYPE "public"."sales_payment_status" AS ENUM('unpaid', 'partial', 'paid');--> statement-breakpoint
ALTER TYPE "public"."transaction_status" ADD VALUE 'approved' BEFORE 'validated';--> statement-breakpoint
ALTER TYPE "public"."transaction_status" ADD VALUE 'closed';--> statement-breakpoint
ALTER TABLE "sales_transaction_items" ADD COLUMN "reserved_quantity" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_transaction_items" ADD COLUMN "released_quantity" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_transactions" ADD COLUMN "payment_status" "sales_payment_status" DEFAULT 'unpaid' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_transactions" ADD COLUMN "approved_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "sales_transactions" ADD COLUMN "approved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sales_transactions" ADD COLUMN "stock_released_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sales_transactions" ADD COLUMN "closed_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "sales_transactions" ADD COLUMN "closed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sales_transactions" ADD CONSTRAINT "sales_transactions_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_transactions" ADD CONSTRAINT "sales_transactions_closed_by_user_id_users_id_fk" FOREIGN KEY ("closed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;