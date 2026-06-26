-- CreateEnum: สถานะกะขาย
CREATE TYPE "ShiftStatus" AS ENUM ('open', 'closed');

-- AlterTable: อัตรา VAT/เซอร์วิสชาร์จต่อร้าน (basis points, 0 = ไม่คิด)
ALTER TABLE "shops" ADD COLUMN "vat_rate" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "shops" ADD COLUMN "vat_inclusive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "shops" ADD COLUMN "service_charge_rate" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: snapshot เซอร์วิสชาร์จ/VAT ตอน checkout + ผูกกะ
ALTER TABLE "bills" ADD COLUMN "service_charge" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bills" ADD COLUMN "service_charge_rate" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bills" ADD COLUMN "vat_amount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bills" ADD COLUMN "vat_rate" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bills" ADD COLUMN "vat_inclusive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "bills" ADD COLUMN "shift_id" INTEGER;

-- CreateTable: กะขาย
CREATE TABLE "shifts" (
    "id" SERIAL NOT NULL,
    "shop_id" INTEGER NOT NULL,
    "status" "ShiftStatus" NOT NULL DEFAULT 'open',
    "opening_cash" INTEGER NOT NULL DEFAULT 0,
    "opened_by_staff_id" INTEGER NOT NULL,
    "opened_by_name" TEXT NOT NULL,
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closing_cash_counted" INTEGER,
    "closed_by_staff_id" INTEGER,
    "closed_by_name" TEXT,
    "closed_at" TIMESTAMP(3),
    "note" TEXT,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shifts_shop_id_idx" ON "shifts"("shop_id");
CREATE INDEX "shifts_status_idx" ON "shifts"("status");
CREATE INDEX "bills_shift_id_idx" ON "bills"("shift_id");

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
