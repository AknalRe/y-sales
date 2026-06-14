DROP INDEX "notifications_user_idx";--> statement-breakpoint
DROP INDEX "notifications_is_read_idx";--> statement-breakpoint
CREATE INDEX "notifications_user_is_read_idx" ON "notifications" USING btree ("user_id","is_read");