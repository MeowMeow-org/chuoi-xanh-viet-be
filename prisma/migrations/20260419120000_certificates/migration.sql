-- CreateEnum
CREATE TYPE "cert_type" AS ENUM ('vietgap', 'globalgap', 'organic', 'other');
CREATE TYPE "coop_cert_status" AS ENUM ('active', 'revoked');
CREATE TYPE "farm_cert_status" AS ENUM ('pending', 'approved', 'rejected', 'revoked');
CREATE TYPE "farm_cert_approver_scope" AS ENUM ('cooperative', 'admin');

-- CreateTable cooperative_certificates
CREATE TABLE "cooperative_certificates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cooperative_user_id" UUID NOT NULL,
    "type" "cert_type" NOT NULL,
    "certificate_no" VARCHAR(120),
    "issuer" VARCHAR(240),
    "issued_at" DATE,
    "expires_at" DATE,
    "file_url" VARCHAR(2048) NOT NULL,
    "status" "coop_cert_status" NOT NULL DEFAULT 'active',
    "revoked_by" UUID,
    "revoked_at" TIMESTAMP(6),
    "revoke_reason" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cooperative_certificates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_coop_certs_user_status" ON "cooperative_certificates"("cooperative_user_id", "status");
CREATE INDEX "idx_coop_certs_type_status" ON "cooperative_certificates"("type", "status");

ALTER TABLE "cooperative_certificates"
    ADD CONSTRAINT "fk_coop_certs_user"
    FOREIGN KEY ("cooperative_user_id") REFERENCES "users"("id")
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "cooperative_certificates"
    ADD CONSTRAINT "fk_coop_certs_revoker"
    FOREIGN KEY ("revoked_by") REFERENCES "users"("id")
    ON DELETE NO ACTION ON UPDATE NO ACTION;

-- CreateTable cooperative_certificate_scope (whitelist of farms that inherit an HTX certificate)
CREATE TABLE "cooperative_certificate_scope" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "certificate_id" UUID NOT NULL,
    "farm_id" UUID NOT NULL,
    "added_by" UUID,
    "added_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cooperative_certificate_scope_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uq_coop_cert_scope" ON "cooperative_certificate_scope"("certificate_id", "farm_id");
CREATE INDEX "idx_coop_cert_scope_farm" ON "cooperative_certificate_scope"("farm_id");

ALTER TABLE "cooperative_certificate_scope"
    ADD CONSTRAINT "fk_coop_cert_scope_cert"
    FOREIGN KEY ("certificate_id") REFERENCES "cooperative_certificates"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "cooperative_certificate_scope"
    ADD CONSTRAINT "fk_coop_cert_scope_farm"
    FOREIGN KEY ("farm_id") REFERENCES "farms"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "cooperative_certificate_scope"
    ADD CONSTRAINT "fk_coop_cert_scope_adder"
    FOREIGN KEY ("added_by") REFERENCES "users"("id")
    ON DELETE NO ACTION ON UPDATE NO ACTION;

-- CreateTable farm_certificates
CREATE TABLE "farm_certificates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "farm_id" UUID NOT NULL,
    "type" "cert_type" NOT NULL,
    "certificate_no" VARCHAR(120),
    "issuer" VARCHAR(240),
    "issued_at" DATE,
    "expires_at" DATE,
    "file_url" VARCHAR(2048) NOT NULL,
    "status" "farm_cert_status" NOT NULL DEFAULT 'pending',
    "approver_scope" "farm_cert_approver_scope" NOT NULL,
    "reviewer_cooperative_id" UUID,
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMP(6),
    "reject_reason" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "farm_certificates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_farm_certs_farm_status" ON "farm_certificates"("farm_id", "status");
CREATE INDEX "idx_farm_certs_reviewer" ON "farm_certificates"("reviewer_cooperative_id", "status");
CREATE INDEX "idx_farm_certs_type_status" ON "farm_certificates"("type", "status");

ALTER TABLE "farm_certificates"
    ADD CONSTRAINT "fk_farm_certs_farm"
    FOREIGN KEY ("farm_id") REFERENCES "farms"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "farm_certificates"
    ADD CONSTRAINT "fk_farm_certs_reviewer_coop"
    FOREIGN KEY ("reviewer_cooperative_id") REFERENCES "users"("id")
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "farm_certificates"
    ADD CONSTRAINT "fk_farm_certs_reviewer_user"
    FOREIGN KEY ("reviewed_by") REFERENCES "users"("id")
    ON DELETE NO ACTION ON UPDATE NO ACTION;
