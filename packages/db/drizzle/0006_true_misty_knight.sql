ALTER TABLE "companies" ADD COLUMN "code" varchar(32);--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_code_unique" UNIQUE("code");