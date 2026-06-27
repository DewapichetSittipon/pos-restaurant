-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('dine_in', 'takeaway', 'delivery');

-- AlterTable: บิลรองรับกลับบ้าน/เดลิเวอรี (ไม่ผูกโต๊ะ)
ALTER TABLE "bills" ALTER COLUMN "table_id" DROP NOT NULL;
ALTER TABLE "bills" ADD COLUMN "order_type" "OrderType" NOT NULL DEFAULT 'dine_in';
ALTER TABLE "bills" ADD COLUMN "customer_name" TEXT;
ALTER TABLE "bills" ADD COLUMN "customer_phone" TEXT;
ALTER TABLE "bills" ADD COLUMN "delivery_address" TEXT;
ALTER TABLE "bills" ADD COLUMN "delivery_fee" INTEGER NOT NULL DEFAULT 0;
