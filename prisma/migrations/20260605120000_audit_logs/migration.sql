-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_user_id" UUID,
    "actor_role" "user_role",
    "source" VARCHAR(20) NOT NULL DEFAULT 'api',
    "module" VARCHAR(60) NOT NULL,
    "action" VARCHAR(80) NOT NULL,
    "entity_type" VARCHAR(80),
    "entity_id" UUID,
    "status" VARCHAR(20) NOT NULL,
    "before_data" JSONB,
    "after_data" JSONB,
    "diff_data" JSONB,
    "request_id" VARCHAR(80),
    "ip_address" VARCHAR(64),
    "user_agent" TEXT,
    "path" VARCHAR(2048),
    "method" VARCHAR(10),
    "error_code" VARCHAR(120),
    "error_message" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_audit_logs_created" ON "audit_logs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_audit_logs_module_created" ON "audit_logs"("module", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_audit_logs_actor_created" ON "audit_logs"("actor_user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_audit_logs_entity_created" ON "audit_logs"("entity_type", "entity_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "fk_audit_logs_actor" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
