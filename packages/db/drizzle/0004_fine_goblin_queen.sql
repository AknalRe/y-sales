CREATE TYPE "public"."visit_outcome" AS ENUM('closed_order', 'no_order', 'follow_up', 'outlet_closed', 'rejected', 'invalid_location');--> statement-breakpoint
CREATE TYPE "public"."visit_schedule_status" AS ENUM('draft', 'assigned', 'approved', 'in_progress', 'completed', 'missed', 'cancelled');--> statement-breakpoint
ALTER TYPE "public"."payment_method" ADD VALUE 'credit' BEFORE 'consignment';--> statement-breakpoint
CREATE TABLE "visit_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"sales_user_id" uuid NOT NULL,
	"outlet_id" uuid,
	"scheduled_date" date NOT NULL,
	"planned_start_time" time,
	"planned_end_time" time,
	"target_outlet_count" integer DEFAULT 1 NOT NULL,
	"target_duration_minutes" integer,
	"priority" integer DEFAULT 3 NOT NULL,
	"assigned_by_user_id" uuid,
	"approved_by_user_id" uuid,
	"approved_at" timestamp with time zone,
	"status" "visit_schedule_status" DEFAULT 'assigned' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "visit_sessions" ADD COLUMN "schedule_id" uuid;--> statement-breakpoint
ALTER TABLE "visit_sessions" ADD COLUMN "outcome" "visit_outcome";--> statement-breakpoint
ALTER TABLE "visit_sessions" ADD COLUMN "closing_notes" text;--> statement-breakpoint
ALTER TABLE "visit_schedules" ADD CONSTRAINT "visit_schedules_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_schedules" ADD CONSTRAINT "visit_schedules_sales_user_id_users_id_fk" FOREIGN KEY ("sales_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_schedules" ADD CONSTRAINT "visit_schedules_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_schedules" ADD CONSTRAINT "visit_schedules_assigned_by_user_id_users_id_fk" FOREIGN KEY ("assigned_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_schedules" ADD CONSTRAINT "visit_schedules_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_sessions" ADD CONSTRAINT "visit_sessions_schedule_id_visit_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."visit_schedules"("id") ON DELETE no action ON UPDATE no action;