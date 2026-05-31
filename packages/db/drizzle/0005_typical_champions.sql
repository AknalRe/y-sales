ALTER TABLE "users" DROP CONSTRAINT "users_employee_code_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "users_company_employee_code_idx" ON "users" USING btree ("company_id","employee_code");