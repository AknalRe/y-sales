ALTER TABLE "sync_events" ADD COLUMN "company_id" uuid;--> statement-breakpoint
ALTER TABLE "sync_events" ADD COLUMN "conflict_reason" text;--> statement-breakpoint
ALTER TABLE "sync_events" ADD COLUMN "payload" jsonb;--> statement-breakpoint
ALTER TABLE "sync_events" ADD COLUMN "result" jsonb;--> statement-breakpoint
ALTER TABLE "sync_events" ADD COLUMN "created_at_client" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sync_events" ADD CONSTRAINT "sync_events_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;