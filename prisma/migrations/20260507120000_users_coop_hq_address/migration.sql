-- Rename operating_province_code -> province_code (align with farms)
ALTER TABLE "users" RENAME COLUMN "operating_province_code" TO "province_code";

-- Cooperative HQ: names + admin codes + coords (nullable)
ALTER TABLE "users" ADD COLUMN "province" VARCHAR(100),
ADD COLUMN "district" VARCHAR(100),
ADD COLUMN "ward" VARCHAR(100),
ADD COLUMN "district_code" INTEGER,
ADD COLUMN "ward_code" INTEGER,
ADD COLUMN "latitude" DECIMAL(10,7),
ADD COLUMN "longitude" DECIMAL(10,7);
