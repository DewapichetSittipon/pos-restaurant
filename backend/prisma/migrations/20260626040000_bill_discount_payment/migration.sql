-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'transfer');

-- AlterTable: ส่วนลด + วิธีชำระเงิน + เงินที่รับมา (เซ็ตตอน checkout)
ALTER TABLE "bills" ADD COLUMN "discount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bills" ADD COLUMN "payment_method" "PaymentMethod";
ALTER TABLE "bills" ADD COLUMN "received_amount" INTEGER;
