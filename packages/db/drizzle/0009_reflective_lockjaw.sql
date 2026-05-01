CREATE TYPE "public"."integration_provider" AS ENUM('cloudflare_r2', 's3', 'custom_http', 'aws_rekognition', 'azure_face', 'google_vertex', 'mock');--> statement-breakpoint
CREATE TYPE "public"."integration_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."integration_type" AS ENUM('storage', 'face_recognition', 'payment', 'notification');--> statement-breakpoint
CREATE TABLE "company_integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"type" "integration_type" NOT NULL,
	"provider" "integration_provider" NOT NULL,
	"name" varchar(160) NOT NULL,
	"status" "integration_status" DEFAULT 'inactive' NOT NULL,
	"config" jsonb,
	"secret_config" jsonb,
	"description" text,
	"updated_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "company_integrations" ADD CONSTRAINT "company_integrations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_integrations" ADD CONSTRAINT "company_integrations_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "company_integrations_company_type_provider_idx" ON "company_integrations" USING btree ("company_id","type","provider");