CREATE TYPE "public"."user_status" AS ENUM('active', 'inactive', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."media_owner_type" AS ENUM('user', 'outlet', 'transaction', 'attendance', 'visit', 'deposit');--> statement-breakpoint
CREATE TYPE "public"."attendance_status" AS ENUM('open', 'closed', 'flagged');--> statement-breakpoint
CREATE TYPE "public"."face_capture_context" AS ENUM('attendance_check_in', 'attendance_check_out', 'visit_check_in', 'visit_check_out');--> statement-breakpoint
CREATE TYPE "public"."identity_match_status" AS ENUM('not_checked', 'matched', 'not_matched', 'manual_review');--> statement-breakpoint
CREATE TYPE "public"."liveness_status" AS ENUM('not_checked', 'passed', 'failed', 'manual_review');--> statement-breakpoint
CREATE TYPE "public"."validation_status" AS ENUM('valid', 'invalid_location', 'face_not_detected', 'manual_review');--> statement-breakpoint
CREATE TYPE "public"."assignment_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."outlet_customer_type" AS ENUM('store', 'agent');--> statement-breakpoint
CREATE TYPE "public"."outlet_status" AS ENUM('draft', 'pending_verification', 'active', 'rejected', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."visit_status" AS ENUM('open', 'completed', 'invalid_location', 'synced');--> statement-breakpoint
CREATE TYPE "public"."inventory_movement_type" AS ENUM('sale', 'return', 'adjustment', 'transfer_in', 'transfer_out', 'consignment_reset');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."warehouse_type" AS ENUM('main', 'sales_van', 'outlet_consignment');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cash', 'qris', 'consignment');--> statement-breakpoint
CREATE TYPE "public"."transaction_customer_type" AS ENUM('store', 'agent', 'end_user');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('draft', 'submitted', 'pending_approval', 'validated', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('pending', 'verified', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."consignment_action_type" AS ENUM('notify_withdrawal', 'extend', 'withdraw', 'reset_stock_zero');--> statement-breakpoint
CREATE TYPE "public"."consignment_status" AS ENUM('active', 'paid', 'overdue', 'withdrawal_required', 'withdrawn', 'extended', 'reset_stock');--> statement-breakpoint
CREATE TYPE "public"."receivable_status" AS ENUM('open', 'partial', 'paid', 'overdue', 'written_off');--> statement-breakpoint
CREATE TYPE "public"."approval_action" AS ENUM('approved', 'rejected', 'verified', 'reconciled');--> statement-breakpoint
CREATE TYPE "public"."deposit_status" AS ENUM('submitted', 'under_review', 'reconciled', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."sync_operation" AS ENUM('create', 'update', 'delete', 'upload');--> statement-breakpoint
CREATE TYPE "public"."sync_status" AS ENUM('received', 'processed', 'failed', 'conflict');--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(120) NOT NULL,
	"name" varchar(160) NOT NULL,
	"module" varchar(80) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "permissions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	"granted_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(64) NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"refresh_token_hash" varchar(255) NOT NULL,
	"device_id" varchar(160),
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_id" uuid NOT NULL,
	"supervisor_id" uuid,
	"name" varchar(160) NOT NULL,
	"email" varchar(160),
	"phone" varchar(40),
	"password_hash" varchar(255),
	"employee_code" varchar(80),
	"profile_photo_url" text,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_phone_unique" UNIQUE("phone"),
	CONSTRAINT "users_employee_code_unique" UNIQUE("employee_code")
);
--> statement-breakpoint
CREATE TABLE "app_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(120) NOT NULL,
	"value" jsonb NOT NULL,
	"description" text,
	"updated_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "media_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_type" "media_owner_type" NOT NULL,
	"owner_id" uuid,
	"file_url" text NOT NULL,
	"mime_type" varchar(120) NOT NULL,
	"size_bytes" integer NOT NULL,
	"file_hash" varchar(128),
	"captured_at" timestamp with time zone,
	"uploaded_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"work_date" date NOT NULL,
	"check_in_at" timestamp with time zone,
	"check_in_latitude" numeric(10, 7),
	"check_in_longitude" numeric(10, 7),
	"check_in_accuracy_m" numeric(10, 2),
	"check_in_distance_m" numeric(10, 2),
	"check_in_outlet_id" uuid,
	"check_in_face_capture_id" uuid,
	"check_out_at" timestamp with time zone,
	"check_out_latitude" numeric(10, 7),
	"check_out_longitude" numeric(10, 7),
	"check_out_accuracy_m" numeric(10, 2),
	"check_out_face_capture_id" uuid,
	"status" "attendance_status" DEFAULT 'open' NOT NULL,
	"validation_status" "validation_status" DEFAULT 'manual_review' NOT NULL,
	"client_request_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attendance_sessions_client_request_id_unique" UNIQUE("client_request_id")
);
--> statement-breakpoint
CREATE TABLE "face_captures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"media_file_id" uuid NOT NULL,
	"capture_context" "face_capture_context" NOT NULL,
	"captured_at" timestamp with time zone NOT NULL,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"face_detected" boolean DEFAULT false NOT NULL,
	"face_confidence" numeric(5, 4),
	"identity_match_status" "identity_match_status" DEFAULT 'not_checked' NOT NULL,
	"identity_confidence" numeric(5, 4),
	"liveness_status" "liveness_status" DEFAULT 'not_checked' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gps_track_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"attendance_session_id" uuid,
	"latitude" numeric(10, 7) NOT NULL,
	"longitude" numeric(10, 7) NOT NULL,
	"accuracy_m" numeric(10, 2),
	"speed_mps" numeric(10, 2),
	"heading" numeric(10, 2),
	"recorded_at" timestamp with time zone NOT NULL,
	"source" varchar(60) DEFAULT 'manual_event' NOT NULL,
	"client_request_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gps_track_logs_client_request_id_unique" UNIQUE("client_request_id")
);
--> statement-breakpoint
CREATE TABLE "outlet_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"outlet_id" uuid NOT NULL,
	"media_file_id" uuid NOT NULL,
	"captured_at" timestamp with time zone NOT NULL,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"captured_by_user_id" uuid,
	"source" varchar(40) DEFAULT 'camera' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outlets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(80) NOT NULL,
	"name" varchar(180) NOT NULL,
	"customer_type" "outlet_customer_type" NOT NULL,
	"owner_name" varchar(160),
	"phone" varchar(40),
	"address" text NOT NULL,
	"latitude" numeric(10, 7) NOT NULL,
	"longitude" numeric(10, 7) NOT NULL,
	"geofence_radius_m" integer,
	"status" "outlet_status" DEFAULT 'pending_verification' NOT NULL,
	"registered_by_user_id" uuid,
	"verified_by_user_id" uuid,
	"verified_at" timestamp with time zone,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "outlets_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "sales_outlet_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sales_user_id" uuid NOT NULL,
	"outlet_id" uuid NOT NULL,
	"assigned_by_user_id" uuid,
	"start_date" date NOT NULL,
	"end_date" date,
	"status" "assignment_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visit_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sales_user_id" uuid NOT NULL,
	"outlet_id" uuid NOT NULL,
	"attendance_session_id" uuid,
	"check_in_at" timestamp with time zone,
	"check_in_latitude" numeric(10, 7),
	"check_in_longitude" numeric(10, 7),
	"check_in_accuracy_m" numeric(10, 2),
	"check_in_distance_m" numeric(10, 2),
	"check_in_face_capture_id" uuid,
	"check_out_at" timestamp with time zone,
	"check_out_latitude" numeric(10, 7),
	"check_out_longitude" numeric(10, 7),
	"check_out_accuracy_m" numeric(10, 2),
	"check_out_face_capture_id" uuid,
	"geofence_radius_m_used" integer,
	"duration_seconds" integer,
	"status" "visit_status" DEFAULT 'open' NOT NULL,
	"validation_status" "validation_status" DEFAULT 'manual_review' NOT NULL,
	"client_request_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "visit_sessions_client_request_id_unique" UNIQUE("client_request_id")
);
--> statement-breakpoint
CREATE TABLE "inventory_balances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" numeric(14, 2) DEFAULT '0' NOT NULL,
	"reserved_quantity" numeric(14, 2) DEFAULT '0' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"movement_type" "inventory_movement_type" NOT NULL,
	"quantity_delta" numeric(14, 2) NOT NULL,
	"reference_type" varchar(80),
	"reference_id" uuid,
	"notes" text,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sku" varchar(80) NOT NULL,
	"name" varchar(180) NOT NULL,
	"description" text,
	"unit" varchar(40) NOT NULL,
	"price_default" numeric(14, 2) DEFAULT '0' NOT NULL,
	"status" "product_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "warehouses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(80) NOT NULL,
	"name" varchar(180) NOT NULL,
	"address" text,
	"type" "warehouse_type" DEFAULT 'main' NOT NULL,
	"owner_user_id" uuid,
	"outlet_id" uuid,
	"status" "product_status" DEFAULT 'active' NOT NULL,
	CONSTRAINT "warehouses_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "sales_transaction_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" numeric(14, 2) NOT NULL,
	"unit_price" numeric(14, 2) NOT NULL,
	"discount_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"line_total" numeric(14, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_no" varchar(80) NOT NULL,
	"sales_user_id" uuid NOT NULL,
	"outlet_id" uuid,
	"visit_session_id" uuid,
	"customer_type" "transaction_customer_type" NOT NULL,
	"end_user_name" varchar(160),
	"end_user_phone" varchar(40),
	"payment_method" "payment_method" NOT NULL,
	"subtotal_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"discount_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"status" "transaction_status" DEFAULT 'draft' NOT NULL,
	"submitted_at" timestamp with time zone,
	"validated_by_user_id" uuid,
	"validated_at" timestamp with time zone,
	"rejection_reason" text,
	"client_request_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_transactions_transaction_no_unique" UNIQUE("transaction_no"),
	CONSTRAINT "sales_transactions_client_request_id_unique" UNIQUE("client_request_id")
);
--> statement-breakpoint
CREATE TABLE "transaction_note_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"media_file_id" uuid NOT NULL,
	"captured_at" timestamp with time zone NOT NULL,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"captured_by_user_id" uuid,
	"verified_by_user_id" uuid,
	"verified_at" timestamp with time zone,
	"verification_status" "verification_status" DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consignment_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"consignment_id" uuid NOT NULL,
	"action_type" "consignment_action_type" NOT NULL,
	"notes" text,
	"performed_by_user_id" uuid,
	"performed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consignment_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"consignment_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" numeric(14, 2) NOT NULL,
	"paid_quantity" numeric(14, 2) DEFAULT '0' NOT NULL,
	"remaining_quantity" numeric(14, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"outlet_id" uuid NOT NULL,
	"sales_user_id" uuid NOT NULL,
	"start_date" date NOT NULL,
	"due_date" date NOT NULL,
	"status" "consignment_status" DEFAULT 'active' NOT NULL,
	"extended_until" date,
	"authorized_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receivable_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"receivable_id" uuid NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"payment_method" "payment_method" NOT NULL,
	"paid_at" timestamp with time zone NOT NULL,
	"received_by_user_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receivables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"outlet_id" uuid,
	"customer_type" "transaction_customer_type" NOT NULL,
	"principal_amount" numeric(14, 2) NOT NULL,
	"paid_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"outstanding_amount" numeric(14, 2) NOT NULL,
	"due_date" date NOT NULL,
	"status" "receivable_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"approvable_type" varchar(80) NOT NULL,
	"approvable_id" uuid NOT NULL,
	"action" "approval_action" NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cash_deposit_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cash_deposit_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"sold_quantity" numeric(14, 2) NOT NULL,
	"expected_amount" numeric(14, 2) NOT NULL,
	"declared_amount" numeric(14, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cash_deposits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sales_user_id" uuid NOT NULL,
	"work_date" date NOT NULL,
	"attendance_session_id" uuid,
	"expected_cash_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"declared_cash_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"qris_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"consignment_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_sold_quantity" numeric(14, 2) DEFAULT '0' NOT NULL,
	"submitted_at" timestamp with time zone,
	"status" "deposit_status" DEFAULT 'submitted' NOT NULL,
	"reconciled_by_user_id" uuid,
	"reconciled_at" timestamp with time zone,
	"discrepancy_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"client_request_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cash_deposits_client_request_id_unique" UNIQUE("client_request_id")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"action" varchar(160) NOT NULL,
	"entity_type" varchar(80) NOT NULL,
	"entity_id" uuid,
	"old_values" jsonb,
	"new_values" jsonb,
	"ip_address" varchar(80),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"device_id" varchar(160),
	"client_request_id" uuid NOT NULL,
	"entity_type" varchar(80) NOT NULL,
	"entity_id" uuid,
	"operation" "sync_operation" NOT NULL,
	"status" "sync_status" DEFAULT 'received' NOT NULL,
	"error_message" text,
	"payload_hash" varchar(128),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	CONSTRAINT "sync_events_client_request_id_unique" UNIQUE("client_request_id")
);
--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_settings" ADD CONSTRAINT "app_settings_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_files" ADD CONSTRAINT "media_files_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_check_in_face_capture_id_face_captures_id_fk" FOREIGN KEY ("check_in_face_capture_id") REFERENCES "public"."face_captures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_check_out_face_capture_id_face_captures_id_fk" FOREIGN KEY ("check_out_face_capture_id") REFERENCES "public"."face_captures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "face_captures" ADD CONSTRAINT "face_captures_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "face_captures" ADD CONSTRAINT "face_captures_media_file_id_media_files_id_fk" FOREIGN KEY ("media_file_id") REFERENCES "public"."media_files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gps_track_logs" ADD CONSTRAINT "gps_track_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gps_track_logs" ADD CONSTRAINT "gps_track_logs_attendance_session_id_attendance_sessions_id_fk" FOREIGN KEY ("attendance_session_id") REFERENCES "public"."attendance_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outlet_photos" ADD CONSTRAINT "outlet_photos_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outlet_photos" ADD CONSTRAINT "outlet_photos_media_file_id_media_files_id_fk" FOREIGN KEY ("media_file_id") REFERENCES "public"."media_files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outlet_photos" ADD CONSTRAINT "outlet_photos_captured_by_user_id_users_id_fk" FOREIGN KEY ("captured_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outlets" ADD CONSTRAINT "outlets_registered_by_user_id_users_id_fk" FOREIGN KEY ("registered_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outlets" ADD CONSTRAINT "outlets_verified_by_user_id_users_id_fk" FOREIGN KEY ("verified_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_outlet_assignments" ADD CONSTRAINT "sales_outlet_assignments_sales_user_id_users_id_fk" FOREIGN KEY ("sales_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_outlet_assignments" ADD CONSTRAINT "sales_outlet_assignments_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_outlet_assignments" ADD CONSTRAINT "sales_outlet_assignments_assigned_by_user_id_users_id_fk" FOREIGN KEY ("assigned_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_sessions" ADD CONSTRAINT "visit_sessions_sales_user_id_users_id_fk" FOREIGN KEY ("sales_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_sessions" ADD CONSTRAINT "visit_sessions_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_sessions" ADD CONSTRAINT "visit_sessions_attendance_session_id_attendance_sessions_id_fk" FOREIGN KEY ("attendance_session_id") REFERENCES "public"."attendance_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_sessions" ADD CONSTRAINT "visit_sessions_check_in_face_capture_id_face_captures_id_fk" FOREIGN KEY ("check_in_face_capture_id") REFERENCES "public"."face_captures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_sessions" ADD CONSTRAINT "visit_sessions_check_out_face_capture_id_face_captures_id_fk" FOREIGN KEY ("check_out_face_capture_id") REFERENCES "public"."face_captures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_transaction_items" ADD CONSTRAINT "sales_transaction_items_transaction_id_sales_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."sales_transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_transaction_items" ADD CONSTRAINT "sales_transaction_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_transactions" ADD CONSTRAINT "sales_transactions_sales_user_id_users_id_fk" FOREIGN KEY ("sales_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_transactions" ADD CONSTRAINT "sales_transactions_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_transactions" ADD CONSTRAINT "sales_transactions_visit_session_id_visit_sessions_id_fk" FOREIGN KEY ("visit_session_id") REFERENCES "public"."visit_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_transactions" ADD CONSTRAINT "sales_transactions_validated_by_user_id_users_id_fk" FOREIGN KEY ("validated_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_note_photos" ADD CONSTRAINT "transaction_note_photos_transaction_id_sales_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."sales_transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_note_photos" ADD CONSTRAINT "transaction_note_photos_media_file_id_media_files_id_fk" FOREIGN KEY ("media_file_id") REFERENCES "public"."media_files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_note_photos" ADD CONSTRAINT "transaction_note_photos_captured_by_user_id_users_id_fk" FOREIGN KEY ("captured_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_note_photos" ADD CONSTRAINT "transaction_note_photos_verified_by_user_id_users_id_fk" FOREIGN KEY ("verified_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consignment_actions" ADD CONSTRAINT "consignment_actions_consignment_id_consignments_id_fk" FOREIGN KEY ("consignment_id") REFERENCES "public"."consignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consignment_actions" ADD CONSTRAINT "consignment_actions_performed_by_user_id_users_id_fk" FOREIGN KEY ("performed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consignment_items" ADD CONSTRAINT "consignment_items_consignment_id_consignments_id_fk" FOREIGN KEY ("consignment_id") REFERENCES "public"."consignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consignment_items" ADD CONSTRAINT "consignment_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consignments" ADD CONSTRAINT "consignments_transaction_id_sales_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."sales_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consignments" ADD CONSTRAINT "consignments_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consignments" ADD CONSTRAINT "consignments_sales_user_id_users_id_fk" FOREIGN KEY ("sales_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consignments" ADD CONSTRAINT "consignments_authorized_by_user_id_users_id_fk" FOREIGN KEY ("authorized_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receivable_payments" ADD CONSTRAINT "receivable_payments_receivable_id_receivables_id_fk" FOREIGN KEY ("receivable_id") REFERENCES "public"."receivables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receivable_payments" ADD CONSTRAINT "receivable_payments_received_by_user_id_users_id_fk" FOREIGN KEY ("received_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_transaction_id_sales_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."sales_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_logs" ADD CONSTRAINT "approval_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_deposit_items" ADD CONSTRAINT "cash_deposit_items_cash_deposit_id_cash_deposits_id_fk" FOREIGN KEY ("cash_deposit_id") REFERENCES "public"."cash_deposits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_deposit_items" ADD CONSTRAINT "cash_deposit_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_deposits" ADD CONSTRAINT "cash_deposits_sales_user_id_users_id_fk" FOREIGN KEY ("sales_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_deposits" ADD CONSTRAINT "cash_deposits_attendance_session_id_attendance_sessions_id_fk" FOREIGN KEY ("attendance_session_id") REFERENCES "public"."attendance_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_deposits" ADD CONSTRAINT "cash_deposits_reconciled_by_user_id_users_id_fk" FOREIGN KEY ("reconciled_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_events" ADD CONSTRAINT "sync_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "role_permissions_role_id_permission_id_idx" ON "role_permissions" USING btree ("role_id","permission_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_outlet_assignments_sales_outlet_idx" ON "sales_outlet_assignments" USING btree ("sales_user_id","outlet_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_balances_warehouse_product_idx" ON "inventory_balances" USING btree ("warehouse_id","product_id");