WITH ranked_subscriptions AS (
	SELECT
		"id",
		"company_id",
		FIRST_VALUE("id") OVER (
			PARTITION BY "company_id"
			ORDER BY "created_at" DESC, "updated_at" DESC, "id" DESC
		) AS "keep_id",
		ROW_NUMBER() OVER (
			PARTITION BY "company_id"
			ORDER BY "created_at" DESC, "updated_at" DESC, "id" DESC
		) AS "row_number"
	FROM "tenant_subscriptions"
),
duplicate_subscriptions AS (
	SELECT "id", "keep_id"
	FROM ranked_subscriptions
	WHERE "row_number" > 1
)
UPDATE "platform_invoices"
SET "subscription_id" = duplicate_subscriptions."keep_id"
FROM duplicate_subscriptions
WHERE "platform_invoices"."subscription_id" = duplicate_subscriptions."id";
--> statement-breakpoint
WITH ranked_subscriptions AS (
	SELECT
		"id",
		"company_id",
		FIRST_VALUE("id") OVER (
			PARTITION BY "company_id"
			ORDER BY "created_at" DESC, "updated_at" DESC, "id" DESC
		) AS "keep_id",
		ROW_NUMBER() OVER (
			PARTITION BY "company_id"
			ORDER BY "created_at" DESC, "updated_at" DESC, "id" DESC
		) AS "row_number"
	FROM "tenant_subscriptions"
),
duplicate_subscriptions AS (
	SELECT "id", "keep_id"
	FROM ranked_subscriptions
	WHERE "row_number" > 1
)
UPDATE "platform_payments"
SET "subscription_id" = duplicate_subscriptions."keep_id"
FROM duplicate_subscriptions
WHERE "platform_payments"."subscription_id" = duplicate_subscriptions."id";
--> statement-breakpoint
WITH ranked_subscriptions AS (
	SELECT
		"id",
		"company_id",
		ROW_NUMBER() OVER (
			PARTITION BY "company_id"
			ORDER BY "created_at" DESC, "updated_at" DESC, "id" DESC
		) AS "row_number"
	FROM "tenant_subscriptions"
)
DELETE FROM "tenant_subscriptions"
USING ranked_subscriptions
WHERE "tenant_subscriptions"."id" = ranked_subscriptions."id"
	AND ranked_subscriptions."row_number" > 1;
--> statement-breakpoint
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_company_id_unique" UNIQUE("company_id");
