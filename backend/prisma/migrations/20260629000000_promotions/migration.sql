-- โปรโมชันแบบมีกฎ (rule-based discount) + วันเกิดสมาชิก + snapshot โปรบนบิล

-- CreateEnum
CREATE TYPE "PromotionType" AS ENUM ('percent', 'amount', 'bogo');

-- CreateTable: โปรโมชันต่อร้าน
CREATE TABLE "promotions" (
    "id" SERIAL NOT NULL,
    "shop_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PromotionType" NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "min_subtotal" INTEGER NOT NULL DEFAULT 0,
    "max_discount" INTEGER,
    "start_minute" INTEGER,
    "end_minute" INTEGER,
    "days_of_week" INTEGER NOT NULL DEFAULT 127,
    "buy_qty" INTEGER NOT NULL DEFAULT 0,
    "get_qty" INTEGER NOT NULL DEFAULT 0,
    "members_only" BOOLEAN NOT NULL DEFAULT false,
    "birthday_only" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "promotions_shop_id_idx" ON "promotions"("shop_id");

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: วันเกิดสมาชิก (สำหรับโปรวันเกิด)
ALTER TABLE "members" ADD COLUMN "birth_date" TIMESTAMP(3);

-- AlterTable: snapshot โปรโมชันที่ใช้ตอน checkout
ALTER TABLE "bills" ADD COLUMN "promotion_id" INTEGER;
ALTER TABLE "bills" ADD COLUMN "promotion_name" TEXT;
ALTER TABLE "bills" ADD COLUMN "promotion_discount" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "bills_promotion_id_idx" ON "bills"("promotion_id");

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
