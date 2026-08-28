CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "configs" ADD COLUMN "project_id" text;--> statement-breakpoint
ALTER TABLE "configs" ADD COLUMN "config_type" text DEFAULT 'matchmaking' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "projects_user_name_idx" ON "projects" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX "projects_user_position_idx" ON "projects" USING btree ("user_id","position");--> statement-breakpoint
ALTER TABLE "configs" ADD CONSTRAINT "configs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "configs_project_idx" ON "configs" USING btree ("project_id");--> statement-breakpoint
UPDATE "configs" SET "config_type" = "values" ->> 'configType'
	WHERE "values" ->> 'configType' IN ('matchmaking', 'practice', 'server', 'offline', 'warmup', 'launch-options');--> statement-breakpoint
INSERT INTO "projects" ("id", "user_id", "name", "position")
	SELECT gen_random_uuid()::text, "user_id", 'Mein Setup', 0 FROM "configs" GROUP BY "user_id";--> statement-breakpoint
UPDATE "configs" SET "project_id" = "projects"."id"
	FROM "projects" WHERE "projects"."user_id" = "configs"."user_id" AND "configs"."project_id" IS NULL;
