DROP INDEX "config_revisions_mutation_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "config_revisions_mutation_idx" ON "config_revisions" USING btree ("mutation_id");