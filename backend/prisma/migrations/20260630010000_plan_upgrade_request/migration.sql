-- ร้านกด "ขออัปเกรด" แพ็กเกจเอง (รออนุมัติ) — เก็บ Plan.key ที่ขอไว้บนร้าน
-- null = ไม่มีคำขอค้าง; admin อนุมัติ/ปฏิเสธแล้วเคลียร์เป็น null

-- AlterTable
ALTER TABLE "shops" ADD COLUMN "requested_plan_key" TEXT;
