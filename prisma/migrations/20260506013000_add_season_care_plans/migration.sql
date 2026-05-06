CREATE TABLE "crop_care_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "crop_key" VARCHAR(120) NOT NULL,
    "crop_name" VARCHAR(120) NOT NULL,
    "source" VARCHAR(20) NOT NULL DEFAULT 'ai',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "crop_care_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "crop_care_templates_crop_key_key" ON "crop_care_templates"("crop_key");

CREATE TABLE "crop_care_template_steps" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "template_id" UUID NOT NULL,
    "step_no" INTEGER NOT NULL,
    "title" VARCHAR(180) NOT NULL,
    "detail" TEXT NOT NULL,
    "day_offset" INTEGER NOT NULL,
    "category" VARCHAR(40) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "crop_care_template_steps_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_crop_care_steps_template_step" ON "crop_care_template_steps"("template_id", "step_no");

CREATE TABLE "season_care_plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "season_id" UUID NOT NULL,
    "template_id" UUID,
    "crop_name" VARCHAR(120) NOT NULL,
    "source" VARCHAR(20) NOT NULL DEFAULT 'ai',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "season_care_plans_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "season_care_plans_season_id_key" ON "season_care_plans"("season_id");

CREATE TABLE "season_care_plan_steps" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "plan_id" UUID NOT NULL,
    "step_no" INTEGER NOT NULL,
    "title" VARCHAR(180) NOT NULL,
    "detail" TEXT NOT NULL,
    "day_offset" INTEGER NOT NULL,
    "category" VARCHAR(40) NOT NULL,
    "scheduled_date" DATE,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "season_care_plan_steps_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_season_care_plan_steps_plan_step" ON "season_care_plan_steps"("plan_id", "step_no");
CREATE INDEX "idx_season_care_plan_steps_scheduled" ON "season_care_plan_steps"("scheduled_date");

ALTER TABLE "crop_care_template_steps"
ADD CONSTRAINT "fk_crop_care_steps_template"
FOREIGN KEY ("template_id") REFERENCES "crop_care_templates"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "season_care_plans"
ADD CONSTRAINT "fk_season_care_plans_season"
FOREIGN KEY ("season_id") REFERENCES "seasons"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "season_care_plans"
ADD CONSTRAINT "fk_season_care_plans_template"
FOREIGN KEY ("template_id") REFERENCES "crop_care_templates"("id")
ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "season_care_plan_steps"
ADD CONSTRAINT "fk_season_care_plan_steps_plan"
FOREIGN KEY ("plan_id") REFERENCES "season_care_plans"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;
