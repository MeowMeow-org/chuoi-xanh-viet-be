-- CreateEnum
CREATE TYPE "account_status" AS ENUM ('active', 'pending', 'suspended');

-- CreateEnum
CREATE TYPE "anchor_status" AS ENUM ('pending', 'anchored', 'failed');

-- CreateEnum
CREATE TYPE "diary_event_type" AS ENUM ('land_prep', 'sowing', 'fertilizing', 'pesticide', 'irrigation', 'harvesting', 'packing', 'other');

-- CreateEnum
CREATE TYPE "order_status" AS ENUM ('pending', 'confirmed', 'shipping', 'delivered', 'cancelled');

-- CreateEnum
CREATE TYPE "payment_method" AS ENUM ('cod', 'vnpay', 'payos');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('pending', 'paid', 'failed', 'refunded');

-- CreateEnum
CREATE TYPE "sale_unit_status" AS ENUM ('active', 'sold', 'disabled');

-- CreateEnum
CREATE TYPE "season_status" AS ENUM ('draft', 'anchored', 'failed');

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('farmer', 'consumer', 'admin');

-- CreateTable
CREATE TABLE "diary_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "season_id" UUID NOT NULL,
    "farm_id" UUID NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "event_type" "diary_event_type" NOT NULL,
    "event_date" DATE NOT NULL,
    "server_timestamp" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "extra_data" JSONB,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "diary_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "farms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_user_id" UUID NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "area_ha" DECIMAL(10,2),
    "crop_main" VARCHAR(120),
    "province" VARCHAR(100),
    "district" VARCHAR(100),
    "ward" VARCHAR(100),
    "address" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "farms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "qty" DECIMAL(10,2) NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "line_total" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "buyer_user_id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "status" "order_status" NOT NULL DEFAULT 'pending',
    "payment_method" "payment_method" NOT NULL DEFAULT 'cod',
    "payment_status" "payment_status" NOT NULL DEFAULT 'pending',
    "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "shipping_name" VARCHAR(120),
    "shipping_phone" VARCHAR(20),
    "shipping_address" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "shop_id" UUID NOT NULL,
    "season_id" UUID,
    "name" VARCHAR(180) NOT NULL,
    "description" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "unit" VARCHAR(20) DEFAULT 'kg',
    "stock_qty" DECIMAL(10,2) DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "device_id" VARCHAR(120) NOT NULL,
    "expires_at" TIMESTAMP(6) NOT NULL,
    "revoked_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_units" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "season_id" UUID NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit" VARCHAR(20) NOT NULL DEFAULT 'kg',
    "qr_token" VARCHAR(120) NOT NULL,
    "qr_url" TEXT NOT NULL,
    "short_code" VARCHAR(30),
    "status" "sale_unit_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sale_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "season_anchors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "season_id" UUID NOT NULL,
    "hash_algo" VARCHAR(20) NOT NULL DEFAULT 'SHA-256',
    "data_hash" VARCHAR(130) NOT NULL,
    "chain_network" VARCHAR(50) DEFAULT 'db_only',
    "tx_hash" VARCHAR(120),
    "tx_url" TEXT,
    "status" "anchor_status" NOT NULL DEFAULT 'pending',
    "anchored_at" TIMESTAMP(6),
    "anchor_meta" JSONB,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "season_anchors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seasons" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "farm_id" UUID NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "crop_name" VARCHAR(120) NOT NULL,
    "start_date" DATE NOT NULL,
    "harvest_start_date" DATE,
    "harvest_end_date" DATE,
    "estimated_yield" DECIMAL(12,2),
    "actual_yield" DECIMAL(12,2),
    "yield_unit" VARCHAR(20) DEFAULT 'kg',
    "status" "season_status" NOT NULL DEFAULT 'draft',
    "sealed_at" TIMESTAMP(6),
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "is_verified_purchase" BOOLEAN NOT NULL DEFAULT true,
    "review_meta" JSONB,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shops" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "farm_id" UUID NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "description" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'open',
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "certifications" JSONB,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trace_scans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sale_unit_id" UUID NOT NULL,
    "scanned_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" VARCHAR(64),
    "user_agent" TEXT,
    "geo_lat" DECIMAL(10,7),
    "geo_lng" DECIMAL(10,7),
    "result" VARCHAR(20) NOT NULL DEFAULT 'ok',
    "abnormal_flag" BOOLEAN NOT NULL DEFAULT false,
    "scan_meta" JSONB,

    CONSTRAINT "trace_scans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "phone" VARCHAR(20) NOT NULL,
    "email" VARCHAR(255),
    "password_hash" VARCHAR(255),
    "full_name" VARCHAR(120) NOT NULL,
    "role" "user_role" NOT NULL DEFAULT 'farmer',
    "status" "account_status" NOT NULL DEFAULT 'active',
    "reset_password_token" VARCHAR(255),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_diary_season_event_date" ON "diary_entries"("season_id", "event_date");

-- CreateIndex
CREATE INDEX "idx_diary_season_server_ts" ON "diary_entries"("season_id", "server_timestamp");

-- CreateIndex
CREATE INDEX "idx_order_items_order_product" ON "order_items"("order_id", "product_id");

-- CreateIndex
CREATE INDEX "idx_orders_buyer_status_created_at" ON "orders"("buyer_user_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "idx_orders_shop_status_created_at" ON "orders"("shop_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "idx_products_shop_active" ON "products"("shop_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "idx_refresh_tokens_user_device" ON "refresh_tokens"("user_id", "device_id");

-- CreateIndex
CREATE INDEX "idx_refresh_tokens_user_revoked_at" ON "refresh_tokens"("user_id", "revoked_at");

-- CreateIndex
CREATE UNIQUE INDEX "sale_units_code_key" ON "sale_units"("code");

-- CreateIndex
CREATE UNIQUE INDEX "sale_units_qr_token_key" ON "sale_units"("qr_token");

-- CreateIndex
CREATE UNIQUE INDEX "sale_units_short_code_key" ON "sale_units"("short_code");

-- CreateIndex
CREATE INDEX "idx_sale_units_season_status" ON "sale_units"("season_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "season_anchors_season_id_key" ON "season_anchors"("season_id");

-- CreateIndex
CREATE UNIQUE INDEX "seasons_code_key" ON "seasons"("code");

-- CreateIndex
CREATE INDEX "idx_seasons_farm_status" ON "seasons"("farm_id", "status");

-- CreateIndex
CREATE INDEX "idx_shop_reviews_shop_created_at" ON "shop_reviews"("shop_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "uq_shop_reviews_user_order_shop" ON "shop_reviews"("user_id", "order_id", "shop_id");

-- CreateIndex
CREATE UNIQUE INDEX "shops_farm_id_key" ON "shops"("farm_id");

-- CreateIndex
CREATE INDEX "idx_trace_scans_sale_unit_scanned_at" ON "trace_scans"("sale_unit_id", "scanned_at");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "diary_entries" ADD CONSTRAINT "fk_diary_actor" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "diary_entries" ADD CONSTRAINT "fk_diary_farm" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "diary_entries" ADD CONSTRAINT "fk_diary_season" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "farms" ADD CONSTRAINT "fk_farms_owner" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "fk_order_items_order" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "fk_order_items_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "fk_orders_buyer" FOREIGN KEY ("buyer_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "fk_orders_shop" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "fk_products_season" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "fk_products_shop" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "fk_refresh_tokens_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sale_units" ADD CONSTRAINT "fk_sale_units_season" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "season_anchors" ADD CONSTRAINT "fk_anchor_season" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "seasons" ADD CONSTRAINT "fk_seasons_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "seasons" ADD CONSTRAINT "fk_seasons_farm" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "shop_reviews" ADD CONSTRAINT "fk_reviews_order" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "shop_reviews" ADD CONSTRAINT "fk_reviews_shop" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "shop_reviews" ADD CONSTRAINT "fk_reviews_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "shops" ADD CONSTRAINT "fk_shops_farm" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "trace_scans" ADD CONSTRAINT "fk_trace_sale_unit" FOREIGN KEY ("sale_unit_id") REFERENCES "sale_units"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
