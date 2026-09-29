ALTER TABLE "media_files" ADD COLUMN "company_id" uuid;--> statement-breakpoint
ALTER TABLE "media_files" ADD CONSTRAINT "media_files_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_token_hash_idx" ON "sessions" USING btree ("refresh_token_hash");--> statement-breakpoint
CREATE INDEX "sessions_expires_revoked_idx" ON "sessions" USING btree ("expires_at","revoked_at");--> statement-breakpoint
CREATE INDEX "media_files_company_idx" ON "media_files" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "media_files_owner_idx" ON "media_files" USING btree ("owner_type","owner_id");--> statement-breakpoint
CREATE INDEX "media_files_uploader_idx" ON "media_files" USING btree ("uploaded_by_user_id");--> statement-breakpoint
CREATE INDEX "sales_trx_items_trx_idx" ON "sales_transaction_items" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "sales_trx_items_product_idx" ON "sales_transaction_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "sales_trx_items_company_idx" ON "sales_transaction_items" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "trx_note_photos_trx_idx" ON "transaction_note_photos" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "trx_note_photos_company_idx" ON "transaction_note_photos" USING btree ("company_id");