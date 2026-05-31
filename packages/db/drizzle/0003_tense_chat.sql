CREATE TYPE "public"."consignment_action_approval_status" AS ENUM('pending_approval', 'approved', 'rejected');--> statement-breakpoint
ALTER TYPE "public"."consignment_action_type" ADD VALUE 'report_sold';--> statement-breakpoint
ALTER TYPE "public"."consignment_action_type" ADD VALUE 'collect_payment';--> statement-breakpoint
ALTER TABLE "consignment_actions" ADD COLUMN "product_id" uuid;--> statement-breakpoint
ALTER TABLE "consignment_actions" ADD COLUMN "quantity" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "consignment_actions" ADD COLUMN "amount" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "consignment_actions" ADD COLUMN "approval_status" "consignment_action_approval_status" DEFAULT 'pending_approval' NOT NULL;--> statement-breakpoint
ALTER TABLE "consignment_actions" ADD COLUMN "approved_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "consignment_actions" ADD COLUMN "approved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "consignment_actions" ADD COLUMN "rejection_reason" text;--> statement-breakpoint
ALTER TABLE "consignment_actions" ADD CONSTRAINT "consignment_actions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consignment_actions" ADD CONSTRAINT "consignment_actions_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;