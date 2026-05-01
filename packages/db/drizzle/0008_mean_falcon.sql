ALTER TABLE "companies" ADD COLUMN "cover_photo_url" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "legal_name" varchar(180);--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "email" varchar(160);--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "phone" varchar(40);--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "city" varchar(120);--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "province" varchar(120);--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "postal_code" varchar(30);--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "country" varchar(80) DEFAULT 'Indonesia';--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "latitude" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "longitude" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "tax_number" varchar(80);--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "website_url" text;