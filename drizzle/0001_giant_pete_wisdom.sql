CREATE TABLE "config_revisions" (
	"id" text PRIMARY KEY NOT NULL,
	"config_id" text NOT NULL,
	"revision" integer NOT NULL,
	"parent_revision" integer,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"snapshot" jsonb,
	"patch" jsonb,
	"content_hash" text NOT NULL,
	"mutation_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "configs_user_name_idx";--> statement-breakpoint
ALTER TABLE "configs" ADD COLUMN "revision" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "configs" ADD COLUMN "content_hash" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "configs" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "config_revisions" ADD CONSTRAINT "config_revisions_config_id_configs_id_fk" FOREIGN KEY ("config_id") REFERENCES "public"."configs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
INSERT INTO "config_revisions" ("id", "config_id", "revision", "parent_revision", "kind", "name", "snapshot", "patch", "content_hash", "mutation_id", "created_at")
SELECT 'migration-' || "id", "id", 1, NULL, 'create', "name", "values", NULL, md5("values"::text), 'migration-' || "id", "updated_at"
FROM "configs";--> statement-breakpoint
UPDATE "configs" SET "revision" = 1, "content_hash" = md5("values"::text);--> statement-breakpoint
CREATE UNIQUE INDEX "config_revisions_number_idx" ON "config_revisions" USING btree ("config_id","revision");--> statement-breakpoint
CREATE UNIQUE INDEX "config_revisions_mutation_idx" ON "config_revisions" USING btree ("config_id","mutation_id");--> statement-breakpoint
CREATE INDEX "config_revisions_time_idx" ON "config_revisions" USING btree ("config_id","created_at");--> statement-breakpoint
CREATE INDEX "configs_user_updated_idx" ON "configs" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "configs_user_name_idx" ON "configs" USING btree ("user_id","name") WHERE "configs"."deleted_at" is null;
