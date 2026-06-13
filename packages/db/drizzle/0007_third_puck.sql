ALTER TYPE "public"."platform_action" ADD VALUE 'company.lifecycle.cancelled' BEFORE 'subscription.created';--> statement-breakpoint
ALTER TYPE "public"."platform_action" ADD VALUE 'subscription.assigned' BEFORE 'subscription.updated';--> statement-breakpoint
ALTER TYPE "public"."platform_action" ADD VALUE 'invoice.void' BEFORE 'invoice.voided';--> statement-breakpoint
ALTER TYPE "public"."platform_action" ADD VALUE 'feature.created' BEFORE 'user.created';--> statement-breakpoint
ALTER TYPE "public"."platform_action" ADD VALUE 'feature.updated' BEFORE 'user.created';--> statement-breakpoint
ALTER TYPE "public"."platform_action" ADD VALUE 'feature.deleted' BEFORE 'user.created';