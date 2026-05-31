ALTER TYPE "public"."media_owner_type" ADD VALUE 'product';--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "image_url" text;--> statement-breakpoint
CREATE INDEX "users_company_idx" ON "users" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "users_status_idx" ON "users" USING btree ("status");--> statement-breakpoint
CREATE INDEX "attendance_sessions_company_user_date_idx" ON "attendance_sessions" USING btree ("company_id","user_id","work_date");--> statement-breakpoint
CREATE INDEX "visit_schedules_company_user_date_idx" ON "visit_schedules" USING btree ("company_id","sales_user_id","scheduled_date");--> statement-breakpoint
CREATE INDEX "visit_schedules_status_idx" ON "visit_schedules" USING btree ("status");--> statement-breakpoint
CREATE INDEX "visit_sessions_company_user_idx" ON "visit_sessions" USING btree ("company_id","sales_user_id");--> statement-breakpoint
CREATE INDEX "visit_sessions_outlet_idx" ON "visit_sessions" USING btree ("outlet_id");--> statement-breakpoint
CREATE INDEX "visit_sessions_status_idx" ON "visit_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "inventory_movements_warehouse_product_idx" ON "inventory_movements" USING btree ("warehouse_id","product_id");--> statement-breakpoint
CREATE INDEX "sales_transactions_company_user_idx" ON "sales_transactions" USING btree ("company_id","sales_user_id");--> statement-breakpoint
CREATE INDEX "sales_transactions_outlet_idx" ON "sales_transactions" USING btree ("outlet_id");--> statement-breakpoint
CREATE INDEX "sales_transactions_status_idx" ON "sales_transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "cash_deposits_company_user_idx" ON "cash_deposits" USING btree ("company_id","sales_user_id");--> statement-breakpoint
CREATE INDEX "cash_deposits_status_idx" ON "cash_deposits" USING btree ("status");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_idx" ON "audit_logs" USING btree ("actor_user_id");