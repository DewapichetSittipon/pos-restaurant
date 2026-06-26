-- CreateEnum
CREATE TYPE "ShopStatus" AS ENUM ('pending', 'active');

-- AlterTable: เพิ่มสถานะ + ชื่อผู้ติดต่อ (ค่า default pending สำหรับแถวใหม่)
ALTER TABLE "shops" ADD COLUMN "status" "ShopStatus" NOT NULL DEFAULT 'pending';
ALTER TABLE "shops" ADD COLUMN "contact_name" TEXT;

-- Backfill: ร้านที่มีอยู่แล้วถือว่า active (ไม่ต้องรออนุมัติ)
UPDATE "shops" SET "status" = 'active';

-- เลิกใช้ flow ShopRequest เดิม (รวมเข้ากับ Shop สถานะ pending แทน)
DROP TABLE "shop_requests";
DROP TYPE "ShopRequestStatus";
