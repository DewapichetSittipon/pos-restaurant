-- AlterTable: เหตุผลตอนยกเลิกรายการ
ALTER TABLE "order_items" ADD COLUMN "void_reason" TEXT;
