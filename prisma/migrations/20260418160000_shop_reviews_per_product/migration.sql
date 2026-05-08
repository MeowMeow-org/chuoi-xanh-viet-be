-- Đánh giá theo từng sản phẩm trong đơn (thay cho 1 đánh giá / đơn / shop)

ALTER TABLE "shop_reviews" ADD COLUMN "product_id" UUID;

UPDATE "shop_reviews" sr
SET "product_id" = sub."product_id"
FROM (
  SELECT DISTINCT ON (oi."order_id") oi."order_id", oi."product_id"
  FROM "order_items" oi
  ORDER BY oi."order_id", oi."id"
) AS sub
WHERE sr."order_id" = sub."order_id";

DELETE FROM "shop_reviews" WHERE "product_id" IS NULL;

ALTER TABLE "shop_reviews" ALTER COLUMN "product_id" SET NOT NULL;

DROP INDEX IF EXISTS "uq_shop_reviews_user_order_shop";

CREATE UNIQUE INDEX "uq_shop_reviews_user_order_product" ON "shop_reviews"("user_id", "order_id", "product_id");

CREATE INDEX "idx_shop_reviews_product_created_at" ON "shop_reviews"("product_id", "created_at");

ALTER TABLE "shop_reviews" ADD CONSTRAINT "fk_reviews_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
