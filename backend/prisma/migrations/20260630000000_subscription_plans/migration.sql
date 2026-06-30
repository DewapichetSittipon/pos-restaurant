-- Subscription plan (tenant billing) — แพ็กเกจเหมารายเดือน + สถานะจ่ายเงินบนร้าน
-- ดูเหตุผลที่ docs/adr/0009-subscription-plans.md

-- CreateEnum: สถานะการจ่ายเงินค่าใช้แพลตฟอร์ม (แยกจาก ShopStatus)
CREATE TYPE "SubscriptionStatus" AS ENUM ('trialing', 'active', 'past_due', 'canceled');

-- CreateTable: แพ็กเกจ (ราคาเป็นสตางค์, limit NULL = ไม่จำกัด)
CREATE TABLE "plans" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price_monthly" INTEGER NOT NULL DEFAULT 0,
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "max_staff" INTEGER,
    "max_table" INTEGER,
    "max_menu" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plans_key_key" ON "plans"("key");

-- AlterTable: สถานะ subscription บนร้าน (plan_id NULL = ถือเป็นฟรี)
ALTER TABLE "shops" ADD COLUMN "plan_id" INTEGER;
ALTER TABLE "shops" ADD COLUMN "subscription_status" "SubscriptionStatus" NOT NULL DEFAULT 'trialing';
ALTER TABLE "shops" ADD COLUMN "current_period_end" TIMESTAMP(3);
ALTER TABLE "shops" ADD COLUMN "trial_ends_at" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "shops" ADD CONSTRAINT "shops_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- SeedData: แพ็กเกจตั้งต้น 3 ขั้น (production ไม่ได้รัน prisma seed จึง insert ที่นี่)
-- ราคาเป็นสตางค์ (placeholder ปรับได้ภายหลังใน DB); limit NULL = ไม่จำกัด
INSERT INTO "plans" ("key", "name", "price_monthly", "features", "max_staff", "max_table", "max_menu", "sort_order") VALUES
  ('free', 'ฟรี', 0, ARRAY[]::TEXT[], 3, 10, 30, 0),
  ('pro', 'โปร', 39000,
    ARRAY['report_history','promotions','loyalty','i18n','reservations','shifts','escpos_print','vat']::TEXT[],
    NULL, NULL, NULL, 1),
  ('business', 'ธุรกิจ', 99000,
    ARRAY['report_history','promotions','loyalty','i18n','reservations','shifts','escpos_print','vat','multi_branch']::TEXT[],
    NULL, NULL, NULL, 2);
