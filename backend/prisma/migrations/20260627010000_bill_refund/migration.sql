-- AlterEnum: บิลที่ถูกคืนเงิน
ALTER TYPE "BillStatus" ADD VALUE 'refunded';

-- AlterTable: ข้อมูลการคืนเงิน
ALTER TABLE "bills" ADD COLUMN "refund_reason" TEXT;
ALTER TABLE "bills" ADD COLUMN "refunded_at" TIMESTAMP(3);
ALTER TABLE "bills" ADD COLUMN "refunded_by_name" TEXT;
