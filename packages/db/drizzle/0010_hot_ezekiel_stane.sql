DO $$ BEGIN CREATE TYPE "public"."billing_cycle" AS ENUM('monthly', 'yearly', 'lifetime'); EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN CREATE TYPE "public"."tenant_sub_status" AS ENUM('trialing', 'active', 'past_due', 'suspended', 'cancelled', 'expired'); EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN CREATE TYPE "public"."platform_action" AS ENUM('company.created', 'company.updated', 'company.suspended', 'company.activated', 'company.cancelled', 'company.deleted', 'subscription.created', 'subscription.updated', 'subscription.cancelled', 'plan.created', 'plan.updated'); EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
CREATE TABLE "platform_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" "platform_action" NOT NULL,
	"target_type" varchar(80) NOT NULL,
	"target_id" uuid,
	"meta" jsonb,
	"ip_address" varchar(60),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(80) NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" text,
	"price_monthly" numeric(12, 2) DEFAULT '0' NOT NULL,
	"price_yearly" numeric(12, 2) DEFAULT '0' NOT NULL,
	"limits" jsonb,
	"features" jsonb,
	"is_public" boolean DEFAULT true NOT NULL,
	"status" varchar(40) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_plans_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "tenant_subscriptions" (
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
);
--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "company_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "company_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "roles" ADD COLUMN "is_system_role" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "platform_audit_logs" ADD CONSTRAINT "platform_audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_managed_by_user_id_users_id_fk" FOREIGN KEY ("managed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;