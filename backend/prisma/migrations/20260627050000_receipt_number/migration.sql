-- AlterTable: ตัวนับเลขที่ใบเสร็จต่อร้าน
ALTER TABLE "shops" ADD COLUMN "receipt_counter" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: เลขที่ใบเสร็จ/ใบกำกับภาษีของบิล (null = ยังไม่ชำระ)
ALTER TABLE "bills" ADD COLUMN "receipt_number" INTEGER;

-- CreateIndex: เลขที่ใบเสร็จห้ามซ้ำในร้านเดียวกัน (null ซ้ำได้)
CREATE UNIQUE INDEX "bills_shop_id_receipt_number_key" ON "bills"("shop_id", "receipt_number");
