-- Order commission / settlement (MVP): estimate at confirmed, finalize at delivered.
ALTER TABLE "orders" ADD COLUMN "commission_rate" DECIMAL(5, 4);
ALTER TABLE "orders" ADD COLUMN "estimated_commission_amount" DECIMAL(12, 2);
ALTER TABLE "orders" ADD COLUMN "estimated_seller_payout" DECIMAL(12, 2);
ALTER TABLE "orders" ADD COLUMN "estimated_at" TIMESTAMP(6);
ALTER TABLE "orders" ADD COLUMN "commission_amount" DECIMAL(12, 2);
ALTER TABLE "orders" ADD COLUMN "seller_payout" DECIMAL(12, 2);
ALTER TABLE "orders" ADD COLUMN "settled_at" TIMESTAMP(6);
