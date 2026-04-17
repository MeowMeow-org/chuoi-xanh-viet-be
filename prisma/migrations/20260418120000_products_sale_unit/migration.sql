-- AlterTable
ALTER TABLE "products" ADD COLUMN "sale_unit_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "products_sale_unit_id_key" ON "products"("sale_unit_id");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "fk_products_sale_unit" FOREIGN KEY ("sale_unit_id") REFERENCES "sale_units"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
