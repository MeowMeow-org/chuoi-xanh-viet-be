-- CreateEnum
CREATE TYPE "stock_movement_source" AS ENUM ('order', 'cancel', 'adjust');

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sale_unit_id" UUID NOT NULL,
    "product_id" UUID,
    "order_id" UUID,
    "source" "stock_movement_source" NOT NULL,
    "qty_kg" DECIMAL(14,3) NOT NULL,
    "balance_after_kg" DECIMAL(14,3) NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_stock_movements_sale_unit_created" ON "stock_movements"("sale_unit_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_stock_movements_order" ON "stock_movements"("order_id");

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "fk_stock_movements_sale_unit" FOREIGN KEY ("sale_unit_id") REFERENCES "sale_units"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "fk_stock_movements_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "fk_stock_movements_order" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
