CREATE TYPE "public"."sales_category" AS ENUM('motoris', 'dropping');--> statement-breakpoint
ALTER TYPE "public"."outlet_customer_type" ADD VALUE 'user';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "sales_category" "sales_category";--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "category" varchar(120);